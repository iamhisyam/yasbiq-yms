import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, between, eq, sql, inArray } from 'drizzle-orm'
import { db } from '#/db/index.server'
import {
  anggaran,
  kasKategori,
  kasTransaksi,
  bankAccount,
  vendor,
  hutangPiutang,
  tagihanSiswa,
  penggajian,
  asetTetap,
  dana,
  unit,
  coa,
  jurnalHeader,
  jurnalDetail,
} from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'
import { DEFAULT_COA, DEFAULT_KATEGORI } from './keuangan-utils.server'


async function getSessionOrThrow() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request!.headers })
  if (!session?.user) throw new Error('Unauthenticated')
  return session
}

export const getUserYayasanUnits = createServerFn({ method: 'GET' })
  .handler(async () => {
    const session = await getSessionOrThrow()
    const unitIds = await (await import('./keuangan-utils.server')).resolveYayasanUnitIds(session.user.id)
    if (unitIds.length === 0) return []
    return db.query.unit.findMany({
      where: inArray(unit.id, unitIds),
      orderBy: (u, { asc }) => [asc(u.nama)],
    })
  })

// ─── Shared Schemas ───────────────────────────────────────────────────────────

export const TransaksiSchema = z.object({
  unitId: z.string().uuid(),
  kategoriId: z.string().uuid().optional(),
  bankAccountId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  hutangPiutangId: z.string().uuid().optional(),
  tipe: z.enum(['pemasukan', 'pengeluaran']),
  jumlah: z.number().int().positive('Jumlah harus positif'),
  keterangan: z.string().min(1, 'Keterangan wajib diisi'),
  tanggal: z.string(),
  referensi: z.string().optional(),
  buktiUrl: z.string().optional(),
  anggaranId: z.string().uuid().optional(),
})

export const TransaksiFilterSchema = z.object({
  unitId: z.string().uuid(),
  tipe: z.enum(['pemasukan', 'pengeluaran']).optional(),
  refType: z.enum(['kas', 'spp', 'gaji', 'penyusutan', 'penyesuaian', 'penutup', 'dana']).optional(),
  kategoriId: z.string().uuid().optional(),
  bankAccountId: z.string().uuid().optional(),
  tanggalMulai: z.string().optional(),
  tanggalAkhir: z.string().optional(),
  page: z.number().default(1),
  pageSize: z.number().default(20),
  sortBy: z.enum(['tanggal', 'jumlah', 'tipe', 'keterangan']).optional().default('tanggal'),
  sortDir: z.enum(['asc', 'desc']).optional().default('asc'),
})

// ─── Kas Transaksi ────────────────────────────────────────────────────────────

export const getTransaksiList = createServerFn({ method: 'GET' })
  .validator(TransaksiFilterSchema)
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)

    const conditions = [eq(kasTransaksi.unitId, data.unitId)]
    if (data.tipe) conditions.push(eq(kasTransaksi.tipe, data.tipe))
    if (data.refType) conditions.push(eq(kasTransaksi.refType, data.refType))
    if (data.kategoriId) conditions.push(eq(kasTransaksi.kategoriId, data.kategoriId))
    if (data.bankAccountId) conditions.push(eq(kasTransaksi.bankAccountId, data.bankAccountId))
    if (data.tanggalMulai && data.tanggalAkhir) {
      conditions.push(between(kasTransaksi.tanggal, data.tanggalMulai, data.tanggalAkhir))
    }

    const offset = (data.page - 1) * data.pageSize

    const [rows, countResult] = await Promise.all([
      db.query.kasTransaksi.findMany({
        where: and(...conditions),
        with: { kategori: true, bankAccount: true, vendor: true, hutangPiutang: true },
        limit: data.pageSize,
        offset,
        orderBy: (t, { asc, desc }) => {
          const fn = data.sortDir === 'desc' ? desc : asc
          if (data.sortBy === 'jumlah') return [fn(t.jumlah), asc(t.createdAt)]
          if (data.sortBy === 'tipe') return [fn(t.tipe), asc(t.createdAt)]
          if (data.sortBy === 'keterangan') return [fn(t.keterangan), asc(t.createdAt)]
          return [fn(t.tanggal), fn(t.createdAt)] // default: tanggal
        },
      }),
      db.select({ count: sql<number>`count(*)::int` }).from(kasTransaksi).where(and(...conditions)),
    ])

    // Enrich payment rows (spp/kas) with student info
    const paymentRefIds = rows
      .filter((r) => r.refType === 'spp' || r.refType === 'kas')
      .map((r) => r.refId)
      .filter(Boolean) as string[]

    const siswaMap = new Map<string, { id: string; nama: string; nis: string | null }>()
    if (paymentRefIds.length > 0) {
      const tagihanRows = await db.query.tagihanSiswa.findMany({
        where: inArray(tagihanSiswa.id, paymentRefIds),
        with: { siswa: true },
      })
      for (const tr of tagihanRows) {
        if (tr.siswa) {
          siswaMap.set(tr.id, { id: tr.siswa.id, nama: tr.siswa.nama, nis: tr.siswa.nis })
        }
      }
    }

    const enriched = rows.map((r) => ({
      ...r,
      siswa: (r.refType === 'spp' || r.refType === 'kas') && r.refId ? siswaMap.get(r.refId) || null : null,
    }))

    return { data: enriched, total: countResult[0]?.count ?? 0, page: data.page, pageSize: data.pageSize }
  })

export const createTransaksi = createServerFn({ method: 'POST' })
  .validator(TransaksiSchema)
  .handler(async ({ data }) => {
    const { checkRateLimit } = await import('#/lib/rate-limiter.server')
    const rl = checkRateLimit('createTransaksi', 30, 60_000)
    if (!rl.allowed) throw new Error('Terlalu banyak permintaan. Coba lagi nanti.')
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const [created] = await db.transaction(async (tx) => {
      const [t] = await tx
        .insert(kasTransaksi)
        .values({ ...data, refType: 'kas', createdBy: session.user.id })
        .returning()

      if (data.anggaranId && data.tipe === 'pengeluaran') {
        await tx
          .update(anggaran)
          .set({ terpakai: sql`${anggaran.terpakai} + ${data.jumlah}`, updatedAt: new Date() })
          .where(eq(anggaran.id, data.anggaranId))
      }

      if (data.bankAccountId) {
        const bankDelta = data.tipe === 'pemasukan' ? data.jumlah : -data.jumlah
        if (data.tipe === 'pengeluaran') {
          // Use FOR UPDATE to prevent race condition
          const [bank] = await tx.select().from(bankAccount)
            .where(eq(bankAccount.id, data.bankAccountId))
            .for('update')
          if (bank && bank.saldo + bankDelta < 0) {
            throw new Error(`Saldo ${bank.namaBank} tidak mencukupi. Saldo saat ini: Rp${bank.saldo.toLocaleString('id-ID')}`)
          }
        }
        await tx
          .update(bankAccount)
          .set({ saldo: sql`${bankAccount.saldo} + ${bankDelta}`, updatedAt: new Date() })
          .where(eq(bankAccount.id, data.bankAccountId))
      }

      if (data.hutangPiutangId) {
        const hp = await tx.query.hutangPiutang.findFirst({ where: eq(hutangPiutang.id, data.hutangPiutangId) })
        if (hp) {
          // BUG #19 FIX: Validate overpayment
          if (data.tipe === 'pemasukan' && data.jumlah > hp.sisa) {
            throw new Error(`Jumlah melebihi sisa hutang/piutang (sisa: Rp${hp.sisa.toLocaleString('id-ID')})`)
          }
          const sisaBaru = Math.max(0, hp.sisa - data.jumlah)
          const statusBaru = sisaBaru <= 0 ? 'lunas' : 'cicil'
          await tx
            .update(hutangPiutang)
            .set({ sisa: sisaBaru, status: statusBaru, updatedAt: new Date() })
            .where(eq(hutangPiutang.id, data.hutangPiutangId))
        }
      }

      return [t]
    })

    // Generate journal entry from this transaction
    try {
      if (created) {
        await (await import('./keuangan-utils.server')).generateJurnalKas(
          data.unitId, data.tipe, data.jumlah,
          data.kategoriId || null,
          null, // nama will be resolved from kategoriId
          data.tanggal, data.referensi || null, data.keterangan || null,
          session.user.id, created.id,
        )
      }
    } catch (e) { console.error('Journal generation failed for kas transaksi:', e) }

    return created
  })

export const updateTransaksi = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid(), data: TransaksiSchema.partial() }))
  .handler(async ({ data: { id, data: updates } }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.kasTransaksi.findFirst({ where: eq(kasTransaksi.id, id) })
    if (!existing) throw new Error('Transaksi tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    // Only allow updating manual (refType: 'kas') transactions for financial fields
    const isKasManual = existing.refType === 'kas' || !existing.refType
    if (!isKasManual && (updates.jumlah !== undefined || updates.tipe !== undefined || updates.hutangPiutangId !== undefined)) {
      throw new Error('Ubah jumlah/tipe transaksi dari menu sumbernya untuk menjaga integritas data')
    }

    await db.transaction(async (tx) => {
      const current = await tx.query.kasTransaksi.findFirst({ where: eq(kasTransaksi.id, id) })
      if (!current) throw new Error('Transaksi tidak ditemukan')

      const oldJumlah = current.jumlah
      const newJumlah = updates.jumlah ?? oldJumlah
      const oldTipe = current.tipe
      const newTipe = updates.tipe ?? oldTipe
      const oldBankId = current.bankAccountId
      const newBankId = updates.bankAccountId !== undefined ? updates.bankAccountId : oldBankId
      const oldHpId = current.hutangPiutangId
      const newHpId = updates.hutangPiutangId !== undefined ? updates.hutangPiutangId : oldHpId

      // BUG #1 FIX: Handle bankAccountId change
      if (oldBankId !== newBankId) {
        // Reverse old bank effect
        if (oldBankId) {
          const reverseDelta = oldTipe === 'pemasukan' ? -oldJumlah : oldJumlah
          await tx.update(bankAccount)
            .set({ saldo: sql`${bankAccount.saldo} + ${reverseDelta}`, updatedAt: new Date() })
            .where(eq(bankAccount.id, oldBankId))
        }
        // Apply new bank effect
        if (newBankId) {
          const applyDelta = newTipe === 'pemasukan' ? newJumlah : -newJumlah
          await tx.update(bankAccount)
            .set({ saldo: sql`${bankAccount.saldo} + ${applyDelta}`, updatedAt: new Date() })
            .where(eq(bankAccount.id, newBankId))
        }
      } else if (oldBankId && (newJumlah !== oldJumlah || newTipe !== oldTipe)) {
        // Same bank, but amount or type changed - calculate net delta
        const oldEffect = oldTipe === 'pemasukan' ? oldJumlah : -oldJumlah
        const newEffect = newTipe === 'pemasukan' ? newJumlah : -newJumlah
        const delta = newEffect - oldEffect
        await tx.update(bankAccount)
          .set({ saldo: sql`${bankAccount.saldo} + ${delta}`, updatedAt: new Date() })
          .where(eq(bankAccount.id, oldBankId))
      }

      // BUG #2 FIX: Handle hutangPiutangId and tipe changes
      if (oldHpId !== newHpId || newJumlah !== oldJumlah || newTipe !== oldTipe) {
        // Reverse old hutang effect - always add back (opposite of createTransaksi which subtracts)
        if (oldHpId) {
          const hp = await tx.query.hutangPiutang.findFirst({ where: eq(hutangPiutang.id, oldHpId) })
          if (hp) {
            const newSisa = Math.min(hp.jumlah, hp.sisa + oldJumlah)
            const newStatus = newSisa >= hp.jumlah ? 'belum_lunas' : newSisa <= 0 ? 'lunas' : 'cicil'
            await tx.update(hutangPiutang)
              .set({ sisa: newSisa, status: newStatus, updatedAt: new Date() })
              .where(eq(hutangPiutang.id, oldHpId))
          }
        }
        // Apply new hutang effect - always subtract (matches createTransaksi logic)
        if (newHpId) {
          const hp = await tx.query.hutangPiutang.findFirst({ where: eq(hutangPiutang.id, newHpId) })
          if (hp) {
            const newSisa = Math.max(0, hp.sisa - newJumlah)
            const newStatus = newSisa <= 0 ? 'lunas' : newSisa < hp.jumlah ? 'cicil' : 'belum_lunas'
            await tx.update(hutangPiutang)
              .set({ sisa: newSisa, status: newStatus, updatedAt: new Date() })
              .where(eq(hutangPiutang.id, newHpId))
          }
        }
      }

      // Update anggaran.terpakai if jumlah or anggaranId changes
      if (current.anggaranId && current.tipe === 'pengeluaran' && newJumlah !== oldJumlah) {
        const diff = newJumlah - oldJumlah
        await tx.update(anggaran)
          .set({ terpakai: sql`${anggaran.terpakai} + ${diff}`, updatedAt: new Date() })
          .where(eq(anggaran.id, current.anggaranId))
      }
      // Handle anggaranId change
      if (updates.anggaranId && updates.anggaranId !== current.anggaranId) {
        // Reverse from old anggaran
        if (current.anggaranId && current.tipe === 'pengeluaran') {
          await tx.update(anggaran)
            .set({ terpakai: sql`${anggaran.terpakai} - ${oldJumlah}`, updatedAt: new Date() })
            .where(eq(anggaran.id, current.anggaranId))
        }
        // Apply to new anggaran
        if (current.tipe === 'pengeluaran') {
          await tx.update(anggaran)
            .set({ terpakai: sql`${anggaran.terpakai} + ${newJumlah}`, updatedAt: new Date() })
            .where(eq(anggaran.id, updates.anggaranId))
        }
      }

      await tx.update(kasTransaksi)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(kasTransaksi.id, id))

      const oldJhs = await tx.query.jurnalHeader.findMany({
        where: eq(jurnalHeader.transaksiId, id),
      })
      for (const jh of oldJhs) {
        await tx.delete(jurnalDetail).where(eq(jurnalDetail.jurnalId, jh.id))
        await tx.delete(jurnalHeader).where(eq(jurnalHeader.id, jh.id))
      }
    })

    try {
      const updated = await db.query.kasTransaksi.findFirst({ where: eq(kasTransaksi.id, id) })
      if (updated) {
        await (await import('./keuangan-utils.server')).generateJurnalKas(
          updated.unitId, updated.tipe as 'pemasukan' | 'pengeluaran', updated.jumlah,
          updated.kategoriId || null, null, updated.tanggal,
          updated.referensi || null, updated.keterangan || null,
          session.user.id, id,
        )
      }
    } catch (e) { console.error('Journal regeneration failed for kas transaksi:', e) }

    return { updated: true }
  })

export const deleteTransaksi = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.kasTransaksi.findFirst({ where: eq(kasTransaksi.id, data.id) })
    if (!existing) throw new Error('Transaksi tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    // Guard: only allow deleting manual (refType: 'kas') transactions
    if (existing.refType && existing.refType !== 'kas') {
      throw new Error('Hapus transaksi dari menu sumbernya untuk menjaga integritas data')
    }

    await db.transaction(async (tx) => {
      const current = await tx.query.kasTransaksi.findFirst({ where: eq(kasTransaksi.id, data.id) })
      if (!current) throw new Error('Transaksi tidak ditemukan')

      if (current.bankAccountId) {
        const bankDelta = current.tipe === 'pemasukan' ? -current.jumlah : current.jumlah
        await tx
          .update(bankAccount)
          .set({ saldo: sql`${bankAccount.saldo} + ${bankDelta}`, updatedAt: new Date() })
          .where(eq(bankAccount.id, current.bankAccountId))
      }

      if (current.hutangPiutangId) {
        const hp = await tx.query.hutangPiutang.findFirst({ where: eq(hutangPiutang.id, current.hutangPiutangId) })
        if (hp) {
          const newSisa = Math.min(hp.jumlah, hp.sisa + current.jumlah)
          const newStatus = newSisa >= hp.jumlah ? 'belum_lunas' : 'cicil'
          await tx.update(hutangPiutang)
            .set({ sisa: newSisa, status: newStatus, updatedAt: new Date() })
            .where(eq(hutangPiutang.id, current.hutangPiutangId))
        }
      }

      // BUG #20 FIX: Reverse anggaran.terpakai if linked
      if (current.anggaranId && current.tipe === 'pengeluaran') {
        await tx.update(anggaran)
          .set({ terpakai: sql`GREATEST(0, ${anggaran.terpakai} - ${current.jumlah})`, updatedAt: new Date() })
          .where(eq(anggaran.id, current.anggaranId))
      }

      const jhs = await tx.query.jurnalHeader.findMany({
        where: eq(jurnalHeader.transaksiId, data.id),
      })
      for (const jh of jhs) {
        await tx.delete(jurnalDetail).where(eq(jurnalDetail.jurnalId, jh.id))
        await tx.delete(jurnalHeader).where(eq(jurnalHeader.id, jh.id))
      }

      await tx.delete(kasTransaksi).where(eq(kasTransaksi.id, data.id))
    })

    return { deleted: true }
  })

export const getRingkasanKas = createServerFn({ method: 'GET' })
  .validator(z.object({
    unitId: z.string(),
    bankAccountId: z.string().uuid().optional(),
    tanggalMulai: z.string().optional(),
    tanggalAkhir: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    let unitCondition
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await (await import('./keuangan-utils.server')).resolveYayasanUnitIds(session.user.id)
      unitCondition = inArray(kasTransaksi.unitId, unitIds)
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      unitCondition = eq(kasTransaksi.unitId, data.unitId)
    }

    const conditions = [unitCondition]
    if (data.bankAccountId) conditions.push(eq(kasTransaksi.bankAccountId, data.bankAccountId))
    if (data.tanggalMulai && data.tanggalAkhir) {
      conditions.push(between(kasTransaksi.tanggal, data.tanggalMulai, data.tanggalAkhir))
    }
    // Exclude non-cash refTypes from ringkasan
    conditions.push(sql`${kasTransaksi.refType} NOT IN ('penyusutan', 'penyesuaian', 'penutup')`)

    const result = await db
      .select({
        tipe: kasTransaksi.tipe,
        total: sql<number>`sum(${kasTransaksi.jumlah})::bigint`,
        count: sql<number>`count(*)::int`,
      })
      .from(kasTransaksi)
      .where(and(...conditions))
      .groupBy(kasTransaksi.tipe)

    const pemasukan = result.find((r) => r.tipe === 'pemasukan')
    const pengeluaran = result.find((r) => r.tipe === 'pengeluaran')
    const totalPemasukan = pemasukan?.total ?? 0
    const totalPengeluaran = pengeluaran?.total ?? 0

    const bankAccountCondition = data.unitId === 'all' || data.unitId === 'semua'
      ? inArray(bankAccount.unitId, await (await import('./keuangan-utils.server')).resolveYayasanUnitIds(session.user.id))
      : eq(bankAccount.unitId, data.unitId)
    const bankAccounts = await db.query.bankAccount.findMany({
      where: and(bankAccountCondition, eq(bankAccount.aktif, true)),
    })
    const totalSaldoBank = bankAccounts.reduce((sum, b) => sum + b.saldo, 0)

    return {
      totalPemasukan,
      totalPengeluaran,
      saldo: totalPemasukan - totalPengeluaran,
      saldoBank: totalSaldoBank,
      jumlahTransaksiPemasukan: pemasukan?.count ?? 0,
      jumlahTransaksiPengeluaran: pengeluaran?.count ?? 0,
    }
  })

// ─── Bank Reconciliation ─────────────────────────────────────────────────────

export const getBankRekonsiliasi = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    let unitCondition
    let coaUnitIds: string[] = []
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await (await import('./keuangan-utils.server')).resolveYayasanUnitIds(session.user.id)
      unitCondition = inArray(bankAccount.unitId, unitIds)
      coaUnitIds = unitIds
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      unitCondition = eq(bankAccount.unitId, data.unitId)
      coaUnitIds = [data.unitId]
    }

    // Balance from bankAccount table (imperative)
    const bankRows = await db.query.bankAccount.findMany({
      where: and(unitCondition, eq(bankAccount.aktif, true)),
    })
    const saldoBank = bankRows.reduce((s, b) => s + b.saldo, 0)

    // Balance from journal entries (double-entry, COA 1.1.01)
    const jurnalRows = await db.select({
      saldo: sql<number>`coalesce(sum(${jurnalDetail.debit} - ${jurnalDetail.kredit})::bigint, 0)`,
    }).from(jurnalDetail)
      .innerJoin(jurnalHeader, eq(jurnalDetail.jurnalId, jurnalHeader.id))
      .innerJoin(coa, eq(jurnalDetail.coaId, coa.id))
      .where(and(
        eq(coa.kode, '1.1.01'),
        inArray(jurnalHeader.unitId, coaUnitIds),
      ))

    const saldoJurnal = jurnalRows[0]?.saldo ?? 0
    const selisih = saldoJurnal - saldoBank

    return {
      saldoBank,
      saldoJurnal,
      selisih,
      seimbang: selisih === 0,
      detailBank: bankRows.map((b) => ({ nama: b.namaBank, jenis: b.jenis, saldo: b.saldo })),
    }
  })

// ─── Kategori ─────────────────────────────────────────────────────────────────

export const getKategoriList = createServerFn({ method: 'GET' })
  .validator(z.object({}).optional())
  .handler(async () => {
    await getSessionOrThrow()
    return db.query.kasKategori.findMany({
      orderBy: (k, { asc }) => [asc(k.tipe), asc(k.nama)],
    })
  })

// ─── Bank Account ─────────────────────────────────────────────────────────────

export const getBankAccountList = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await (await import('./keuangan-utils.server')).resolveYayasanUnitIds(session.user.id)
      return db.query.bankAccount.findMany({
        where: inArray(bankAccount.unitId, unitIds),
        with: { unit: true },
        orderBy: (b, { asc }) => [asc(b.namaBank)],
      })
    }
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
    return db.query.bankAccount.findMany({
      where: eq(bankAccount.unitId, data.unitId),
      with: { unit: true },
      orderBy: (b, { asc }) => [asc(b.namaBank)],
    })
  })

export const createBankAccount = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(),
    namaBank: z.string().min(1, 'Nama bank wajib diisi'),
    atasNama: z.string().optional(),
    nomorRekening: z.string().optional(),
    saldoAwal: z.number().int().default(0),
    jenis: z.enum(['bank', 'kas', 'ems']).default('bank'),
    keterangan: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const [created] = await db.insert(bankAccount).values({
      ...data,
      saldo: data.saldoAwal,
    }).returning()
    return created
  })

export const updateBankAccount = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string().uuid(),
    unitId: z.string().uuid().optional(),
    jenis: z.enum(['bank', 'kas', 'ems']).optional(),
    namaBank: z.string().min(1).optional(),
    atasNama: z.string().min(1).optional(),
    nomorRekening: z.string().min(1).optional(),
    keterangan: z.string().optional(),
    aktif: z.boolean().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.bankAccount.findFirst({ where: eq(bankAccount.id, data.id) })
    if (!existing) throw new Error('Bank account tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const [updated] = await db
      .update(bankAccount).set({ ...data, updatedAt: new Date() })
      .where(eq(bankAccount.id, data.id))
      .returning()
    return updated
  })

export const deleteBankAccount = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.bankAccount.findFirst({ where: eq(bankAccount.id, data.id) })
    if (!existing) throw new Error('Bank tidak ditemukan')

    const { requireMinimumRole, verifySuperAdmin } = await import('#/lib/unit-guard.server')
    const isSuper = await verifySuperAdmin(session.user.id)
    if (!isSuper) {
      await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', false)
    }

    const [txCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(kasTransaksi)
      .where(eq(kasTransaksi.bankAccountId, data.id))
    const txCount = txCountResult?.count ?? 0
    if (txCount > 0) throw new Error(`Tidak bisa dihapus: ${txCount} transaksi masih merujuk ke bank ini. Hapus atau pindahkan transaksi terlebih dahulu.`)

    await db.delete(bankAccount).where(eq(bankAccount.id, data.id))
    return { success: true }
  })

// ─── Vendor ───────────────────────────────────────────────────────────────────

export const getVendorList = createServerFn({ method: 'GET' })
  .validator(z.object({ tipe: z.enum(['vendor', 'supplier', 'customer', 'lainnya']).optional() }))
  .handler(async ({ data }) => {
    await getSessionOrThrow()

    let conditions: any[] = []
    if (data.tipe) conditions.push(eq(vendor.tipe, data.tipe))

    return db.query.vendor.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: (v, { asc }) => [asc(v.nama)],
    })
  })

export const createVendor = createServerFn({ method: 'POST' })
  .validator(z.object({
    nama: z.string().min(1, 'Nama wajib diisi'),
    tipe: z.enum(['vendor', 'supplier', 'customer', 'lainnya']).default('vendor'),
    npwp: z.string().optional(),
    kontak: z.string().optional(),
    telepon: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    alamat: z.string().optional(),
    keterangan: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    if (!(session.user as any).isSuperAdmin) throw new Error('Forbidden')

    const [created] = await db.insert(vendor).values(data).returning()
    return created
  })

export const updateVendor = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string().uuid(),
    nama: z.string().min(1).optional(),
    tipe: z.enum(['vendor', 'supplier', 'customer', 'lainnya']).optional(),
    npwp: z.string().optional(),
    kontak: z.string().optional(),
    telepon: z.string().optional(),
    email: z.string().optional(),
    alamat: z.string().optional(),
    keterangan: z.string().optional(),
    aktif: z.boolean().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    if (!(session.user as any).isSuperAdmin) throw new Error('Forbidden')
    const existing = await db.query.vendor.findFirst({ where: eq(vendor.id, data.id) })
    if (!existing) throw new Error('Vendor tidak ditemukan')

    const [updated] = await db
      .update(vendor).set({ ...data, updatedAt: new Date() })
      .where(eq(vendor.id, data.id))
      .returning()
    return updated
  })

// ─── Hutang Piutang ───────────────────────────────────────────────────────────

export const getHutangPiutangList = createServerFn({ method: 'GET' })
  .validator(z.object({
    unitId: z.string(),
    tipe: z.enum(['hutang', 'piutang']).optional(),
    status: z.enum(['belum_lunas', 'cicil', 'lunas']).optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    let unitIds: string[]
    if (data.unitId === 'all' || data.unitId === 'semua') {
      unitIds = await (await import('./keuangan-utils.server')).resolveYayasanUnitIds(session.user.id)
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      const scope = await (await import('./keuangan-utils.server')).resolveScope(session.user.id, data.unitId)
      unitIds = scope.unitIds
    }

    const conditions = [inArray(hutangPiutang.unitId, unitIds)]
    if (data.tipe) conditions.push(eq(hutangPiutang.tipe, data.tipe))
    if (data.status) conditions.push(eq(hutangPiutang.status, data.status))

    return db.query.hutangPiutang.findMany({
      where: and(...conditions),
      with: { vendor: true, pegawai: true, transaksis: true },
      orderBy: (h, { desc }) => [desc(h.createdAt)],
    })
  })

export const createHutangPiutang = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(),
    tipe: z.enum(['hutang', 'piutang']),
    jumlah: z.number().int().positive('Jumlah harus positif'),
    vendorId: z.string().uuid().optional(),
    pegawaiId: z.string().uuid().optional(),
    pihak: z.string().optional(),
    deskripsi: z.string().min(1, 'Deskripsi wajib diisi'),
    tanggal: z.string(),
    jatuhTempo: z.string().optional(),
    kategori: z.enum(['pembelian', 'penjualan', 'sewa', 'gaji', 'pinjaman', 'lainnya']).default('lainnya'),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const [created] = await db.insert(hutangPiutang).values({
      ...data,
      sisa: data.jumlah,
    }).returning()
    return created
  })

export const updateHutangPiutang = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string().uuid(),
    jumlah: z.number().int().positive().optional(),
    vendorId: z.string().uuid().optional(),
    pegawaiId: z.string().uuid().optional(),
    pihak: z.string().optional(),
    deskripsi: z.string().min(1).optional(),
    jatuhTempo: z.string().optional(),
    kategori: z.enum(['pembelian', 'penjualan', 'sewa', 'gaji', 'pinjaman', 'lainnya']).optional(),
    status: z.enum(['belum_lunas', 'cicil', 'lunas']).optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.hutangPiutang.findFirst({ where: eq(hutangPiutang.id, data.id) })
    if (!existing) throw new Error('Data tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const [updated] = await db.transaction(async (tx) => {
      const current = await tx.query.hutangPiutang.findFirst({ where: eq(hutangPiutang.id, data.id) })
      if (!current) throw new Error('Data tidak ditemukan')

      const updates: any = { ...data, updatedAt: new Date() }
      if (data.jumlah !== undefined) {
        const sudahDibayar = current.jumlah - current.sisa
        updates.sisa = data.jumlah - sudahDibayar
      }

      return tx
        .update(hutangPiutang).set(updates)
        .where(eq(hutangPiutang.id, data.id))
        .returning()
    })

    return updated
  })

export const getRingkasanHutangPiutang = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    let unitIds: string[]
    if (data.unitId === 'all' || data.unitId === 'semua') {
      unitIds = await (await import('./keuangan-utils.server')).resolveYayasanUnitIds(session.user.id)
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      const scope = await (await import('./keuangan-utils.server')).resolveScope(session.user.id, data.unitId)
      unitIds = scope.unitIds
    }

    const conditions = [inArray(hutangPiutang.unitId, unitIds)]

    const result = await db
      .select({
        tipe: hutangPiutang.tipe,
        status: hutangPiutang.status,
        total: sql<number>`sum(${hutangPiutang.sisa})::bigint`,
        count: sql<number>`count(*)::int`,
      })
      .from(hutangPiutang)
      .where(and(...conditions))
      .groupBy(hutangPiutang.tipe, hutangPiutang.status)

    const hutangBelum = result.find((r) => r.tipe === 'hutang' && r.status === 'belum_lunas')
    const hutangCicil = result.find((r) => r.tipe === 'hutang' && r.status === 'cicil')
    const piutangBelum = result.find((r) => r.tipe === 'piutang' && r.status === 'belum_lunas')
    const piutangCicil = result.find((r) => r.tipe === 'piutang' && r.status === 'cicil')

    return {
      totalHutang: (hutangBelum?.total ?? 0) + (hutangCicil?.total ?? 0),
      totalPiutang: (piutangBelum?.total ?? 0) + (piutangCicil?.total ?? 0),
      hutangCount: (hutangBelum?.count ?? 0) + (hutangCicil?.count ?? 0),
      piutangCount: (piutangBelum?.count ?? 0) + (piutangCicil?.count ?? 0),
    }
  })

// ─── Kategori CRUD ──────────────────────────────────────────────────────────

export const createKategori = createServerFn({ method: 'POST' })
  .validator(z.object({
    nama: z.string().min(1, 'Nama wajib diisi'),
    tipe: z.enum(['pemasukan', 'pengeluaran']),
    warna: z.string().default('#6366f1'),
    kodeCoretax: z.string().optional(),
    coaKode: z.string().optional(),
    keterangan: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    if (!(session.user as any).isSuperAdmin) throw new Error('Forbidden')
    const [created] = await db.insert(kasKategori).values(data).returning()
    return created
  })

export const updateKategori = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string().uuid(),
    nama: z.string().min(1).optional(),
    tipe: z.enum(['pemasukan', 'pengeluaran']).optional(),
    warna: z.string().optional(), kodeCoretax: z.string().optional(),
    coaKode: z.string().optional(),
    keterangan: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    if (!(session.user as any).isSuperAdmin) throw new Error('Forbidden')
    const upd: any = {}
    if (data.nama !== undefined) upd.nama = data.nama
    if (data.tipe !== undefined) upd.tipe = data.tipe
    if (data.warna !== undefined) upd.warna = data.warna
    if (data.kodeCoretax !== undefined) upd.kodeCoretax = data.kodeCoretax || null
    if (data.coaKode !== undefined) upd.coaKode = data.coaKode || null
    if (data.keterangan !== undefined) upd.keterangan = data.keterangan || null
    const [r] = await db.update(kasKategori).set(upd).where(eq(kasKategori.id, data.id)).returning()
    return r
  })

export const deleteKategori = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    if (!(session.user as any).isSuperAdmin) throw new Error('Forbidden')
    await db.delete(kasKategori).where(eq(kasKategori.id, data.id))
    return { deleted: true }
  })

// ─── Kategori Coretax (merged into seedCoaAndKategori) ──────────────────────

// ─── Laporan Keuangan (ISAK 35) ─────────────────────────────────────────────

export type NeracaData = {
  kasBank: number
  piutangSPP: number
  piutangLain: number
  asetLancarLainnya: number
  totalAsetLancar: number
  asetTetap: number
  totalAsetTidakLancar: number
  totalAset: number
  hutangJangkaPendek: number
  hutangGaji: number
  hutangPajak: number
  hutangBpjs: number
  pendapatanDiterimaDimuka: number
  totalLiabilitasJangkaPendek: number
  hutangJangkaPanjang: number
  totalLiabilitasJangkaPanjang: number
  totalLiabilitas: number
  sisaDanaTidakTerikat: number
  sisaDanaTerikatTemporer: number
  sisaDanaTerikatPermanen: number
  surplusAkumulasian: number
  penghasilanKomprehensifLain: number
  asetNeto: number
  // Tahun lalu (komparatif)
  kasBankLalu: number
  piutangSPPLalu: number
  piutangLainLalu: number
  asetLancarLainnyaLalu: number
  totalAsetLancarLalu: number
  asetTetapLalu: number
  totalAsetTidakLancarLalu: number
  totalAsetLalu: number
  hutangJangkaPendekLalu: number
  hutangGajiLalu: number
  hutangPajakLalu: number
  hutangBpjsLalu: number
  pendapatanDiterimaDimukaLalu: number
  totalLiabilitasJangkaPendekLalu: number
  hutangJangkaPanjangLalu: number
  totalLiabilitasJangkaPanjangLalu: number
  totalLiabilitasLalu: number
  sisaDanaTidakTerikatLalu: number
  sisaDanaTerikatTemporerLalu: number
  sisaDanaTerikatPermanenLalu: number
  surplusAkumulasianLalu: number
  penghasilanKomprehensifLainLalu: number
  asetNetoLalu: number
  // Metadata
  tahun: string
  tahunLalu: string
  yayasanNama: string | null
  unitCount: number
  // Details
  detailBank: any[]
  detailPiutangSPP: any[]
  detailPiutangLain: any[]
  detailAsetTetap: any[]
  detailHutangJangkaPendek: any[]
  detailHutangGaji: any[]
  detailHutangPajak: any[]
  detailHutangBpjs: any[]
  detailHutangJangkaPanjang: any[]
}

export type SurplusDefisitItem = {
  nama: string
  tipe: 'pemasukan' | 'pengeluaran'
  jumlah: number
  jumlahLalu: number
  kodeCoretax: string | null
  denganPembatasan: boolean
}

export type SurplusDefisitData = {
  items: SurplusDefisitItem[]
  totalPemasukan: number
  totalPengeluaran: number
  bebanPenyusutan: number
  totalBeban: number
  surplus: number
  periode: string
  // ISAK 35 Format A sections
  tanpaPembatasan: { pendapatan: SurplusDefisitItem[]; totalPendapatan: number; beban: SurplusDefisitItem[]; totalBeban: number; surplus: number }
  denganPembatasan: { pendapatan: SurplusDefisitItem[]; totalPendapatan: number; beban: SurplusDefisitItem[]; totalBeban: number; surplus: number }
  penghasilanKomprehensifLain: number
  totalPenghasilanKomprehensif: number
  // Metadata tahun komparatif
  tahun: string
  tahunLalu: string
}

async function getNeracaDariJurnal(unitIds: string[], perTanggal: string) {
  const rows = await db.select({
    coaKode: coa.kode,
    saldoNormal: coa.saldoNormal,
    totalDebit: sql<number>`coalesce(sum(${jurnalDetail.debit})::bigint, 0)`,
    totalKredit: sql<number>`coalesce(sum(${jurnalDetail.kredit})::bigint, 0)`,
  })
    .from(jurnalDetail)
    .innerJoin(jurnalHeader, eq(jurnalDetail.jurnalId, jurnalHeader.id))
    .innerJoin(coa, eq(jurnalDetail.coaId, coa.id))
    .where(and(inArray(jurnalHeader.unitId, unitIds), sql`${jurnalHeader.tanggal} <= ${perTanggal}`))
    .groupBy(coa.kode, coa.saldoNormal)

  const s: Record<string, number> = {}
  for (const r of rows) {
    const bal = r.totalDebit - r.totalKredit
    s[r.coaKode] = r.saldoNormal === 'debit' ? bal : -bal
  }

  const kasBank = s['1.1.01'] || 0
  const piutangSPP = s['1.1.02'] || 0
  const piutangLain = s['1.1.03'] || 0
  const asetLancarLainnya = s['1.1.04'] || 0
  const asetTetap = (s['1.2.01'] || 0) + (s['1.2.02'] || 0) + (s['1.2.03'] || 0) + (s['1.2.04'] || 0) + (s['1.2.05'] || 0) - (s['1.2.06'] || 0)
  const totalAsetLancar = kasBank + piutangSPP + piutangLain + asetLancarLainnya
  const totalAsetTidakLancar = asetTetap
  const totalAset = totalAsetLancar + totalAsetTidakLancar

  const hutangJangkaPendek = s['2.1.01'] || 0
  const hutangGaji = s['2.1.02'] || 0
  const hutangPajak = s['2.1.03'] || 0
  const hutangBpjs = s['2.1.04'] || 0
  const hutangJangkaPanjang = s['2.1.05'] || 0
  const totalLiabilitasJangkaPendek = hutangJangkaPendek + hutangGaji + hutangPajak + hutangBpjs
  const totalLiabilitasJangkaPanjang = hutangJangkaPanjang
  const totalLiabilitas = totalLiabilitasJangkaPendek + totalLiabilitasJangkaPanjang

  const asetNetoTanpaPembatasan = s['3.1.00'] || 0
  const asetNetoTerikatTemporer = s['3.2.00'] || 0
  const asetNetoTerikatPermanen = s['3.3.00'] || 0
  const asetNeto = asetNetoTanpaPembatasan + asetNetoTerikatTemporer + asetNetoTerikatPermanen

  return {
    kasBank, piutangSPP, piutangLain, asetLancarLainnya,
    totalAsetLancar, asetTetap, totalAsetTidakLancar, totalAset,
    hutangJangkaPendek, hutangGaji, hutangPajak, hutangBpjs,
    totalLiabilitasJangkaPendek, hutangJangkaPanjang, totalLiabilitasJangkaPanjang, totalLiabilitas,
    asetNetoTanpaPembatasan, asetNetoTerikatTemporer, asetNetoTerikatPermanen, asetNeto,
  }
}

export const getLaporanNeraca = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string(), tahun: z.string().optional() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const tahun = data.tahun || String(new Date().getFullYear())

    let unitIds: string[]
    let yayasanNama: string | null
    if (data.unitId === 'all' || data.unitId === 'semua') {
      unitIds = await (await import('./keuangan-utils.server')).resolveYayasanUnitIds(session.user.id)
      yayasanNama = null
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      unitIds = [data.unitId]
      yayasanNama = null
    }

    const bankDetail = await db.query.bankAccount.findMany({
      where: and(inArray(bankAccount.unitId, unitIds), eq(bankAccount.aktif, true)),
    })
    const detailBank = bankDetail.map((b) => ({
      label: b.jenis === 'kas' ? `Kas Tunai — ${b.namaBank}` : b.jenis === 'ems' ? `EMS — ${b.namaBank}` : `Bank — ${b.namaBank}`,
      sublabel: b.jenis === 'bank' ? `${b.atasNama} (${b.nomorRekening})` : b.keterangan || '',
      jumlah: b.saldo,
    }))

    const sppRows = await db.query.tagihanSiswa.findMany({
      where: and(inArray(tagihanSiswa.unitId, unitIds), sql`${tagihanSiswa.status} IN ('terbit', 'cicil')`),
      with: { siswa: true },
    })
    // Accumulate per student with month count
    const bySiswa: Record<string, { jumlah: number; bulan: number; nama: string }> = {}
    for (const r of sppRows) {
      const sisa = r.nominal - (r.diskon || 0) - r.sudahDibayar
      if (sisa <= 0) continue
      const nama = r.siswa?.nama || '-'
      if (!bySiswa[nama]) bySiswa[nama] = { jumlah: 0, bulan: 0, nama }
      bySiswa[nama].jumlah += sisa
      bySiswa[nama].bulan++
    }
    const detailPiutangSPP = Object.values(bySiswa)
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 50)
      .map((d) => ({ label: d.nama, sublabel: `${d.bulan} bln`, jumlah: d.jumlah }))

    const hpRows = await db.query.hutangPiutang.findMany({
      where: and(inArray(hutangPiutang.unitId, unitIds), sql`${hutangPiutang.status} IN ('belum_lunas', 'cicil')`),
      with: { vendor: true, pegawai: true },
    })
    const detailPiutangLain = hpRows.filter((r) => r.tipe === 'piutang').map((r) => ({
      label: r.vendor?.nama || r.pegawai?.nama || r.pihak || '-', jumlah: r.sisa,
    }))
    // Pisahkan hutang: pinjaman → jangka panjang, lainnya → jangka pendek
    const detailHutangJangkaPendek = hpRows.filter((r) => r.tipe === 'hutang' && r.kategori !== 'pinjaman').map((r) => ({
      label: r.vendor?.nama || r.pegawai?.nama || r.pihak || '-', jumlah: r.sisa,
    }))
    const detailHutangJangkaPanjang = hpRows.filter((r) => r.tipe === 'hutang' && r.kategori === 'pinjaman').map((r) => ({
      label: r.vendor?.nama || r.pegawai?.nama || r.pihak || '-',
      sublabel: r.deskripsi || '',
      jumlah: r.sisa,
    }))

    const gajiRows = await db.query.penggajian.findMany({
      where: and(inArray(penggajian.unitId, unitIds), sql`${penggajian.status} IN ('draft', 'disetujui')`),
      with: { pegawai: true },
    })
    const detailHutangGaji = gajiRows.map((r) => ({
      label: `${r.pegawai?.nama || '-'} — ${r.periode}`, jumlah: r.totalDiterima,
    }))

    const detailHutangPajak = gajiRows.filter((r) => r.pph21).map((r) => ({
      label: `${r.pegawai?.nama || '-'} — ${r.periode}`, jumlah: r.pph21 || 0,
    }))

    const detailHutangBpjs = gajiRows.filter((r) => (r.bpjsKaryawan || 0) + (r.bpjsPerusahaan || 0) > 0).map((r) => ({
      label: `${r.pegawai?.nama || '-'} — ${r.periode}`, jumlah: (r.bpjsKaryawan || 0) + (r.bpjsPerusahaan || 0),
    }))

    const asetRows = await db.query.asetTetap.findMany({
      where: and(inArray(asetTetap.unitId, unitIds), eq(asetTetap.status, 'aktif')),
    })
    const detailAsetTetap = asetRows.map((r) => ({
      label: `${r.nama} (${r.kategori})`, jumlah: r.hargaPerolehan - r.akumulasiPenyusutan,
    }))

    // ─── Both columns from journals ──────────────────────────────────────────
    const punyaDataTahun = async (year: number) => {
      const [r] = await db.select({
        count: sql<number>`count(*)::int`,
      }).from(jurnalHeader)
        .where(and(
          inArray(jurnalHeader.unitId, unitIds),
          sql`${jurnalHeader.tanggal} >= ${String(year) + '-01-01'}`,
          sql`${jurnalHeader.tanggal} <= ${String(year) + '-12-31'}`,
        ))
      return (r?.count ?? 0) > 0
    }

    const zeroData = {
      kasBank: 0, piutangSPP: 0, piutangLain: 0, asetLancarLainnya: 0,
      totalAsetLancar: 0, asetTetap: 0, totalAsetTidakLancar: 0, totalAset: 0,
      hutangJangkaPendek: 0, hutangGaji: 0, hutangPajak: 0, hutangBpjs: 0,
      totalLiabilitasJangkaPendek: 0, hutangJangkaPanjang: 0,
      totalLiabilitasJangkaPanjang: 0, totalLiabilitas: 0,
      asetNetoTanpaPembatasan: 0, asetNetoTerikatTemporer: 0,
      asetNetoTerikatPermanen: 0, asetNeto: 0,
    }

    const perTanggal = `${tahun}-12-31`
    const cur = await punyaDataTahun(Number(tahun)) ? await getNeracaDariJurnal(unitIds, perTanggal) : zeroData

    const tahunLalu = Number(tahun) - 1
    const perTanggalLalu = `${tahunLalu}-12-31`
    const lalu = await punyaDataTahun(tahunLalu) ? await getNeracaDariJurnal(unitIds, perTanggalLalu) : zeroData

    return {
      // Tahun ini
      kasBank: cur.kasBank, piutangSPP: cur.piutangSPP, piutangLain: cur.piutangLain,
      asetLancarLainnya: cur.asetLancarLainnya,
      totalAsetLancar: cur.totalAsetLancar, asetTetap: cur.asetTetap,
      totalAsetTidakLancar: cur.totalAsetTidakLancar, totalAset: cur.totalAset,
      hutangJangkaPendek: cur.hutangJangkaPendek, hutangGaji: cur.hutangGaji,
      hutangPajak: cur.hutangPajak, hutangBpjs: cur.hutangBpjs,
      pendapatanDiterimaDimuka: 0,
      totalLiabilitasJangkaPendek: cur.totalLiabilitasJangkaPendek,
      hutangJangkaPanjang: cur.hutangJangkaPanjang,
      totalLiabilitasJangkaPanjang: cur.totalLiabilitasJangkaPanjang,
      totalLiabilitas: cur.totalLiabilitas,
      sisaDanaTidakTerikat: cur.asetNetoTanpaPembatasan,
      sisaDanaTerikatTemporer: cur.asetNetoTerikatTemporer,
      sisaDanaTerikatPermanen: cur.asetNetoTerikatPermanen,
      surplusAkumulasian: cur.asetNetoTanpaPembatasan,
      penghasilanKomprehensifLain: 0, asetNeto: cur.asetNeto,
      detailBank, detailPiutangSPP, detailPiutangLain, detailAsetTetap,
      detailHutangJangkaPendek, detailHutangGaji, detailHutangPajak, detailHutangBpjs,
      detailHutangJangkaPanjang,
      // Tahun lalu
      kasBankLalu: lalu.kasBank, piutangSPPLalu: lalu.piutangSPP,
      piutangLainLalu: lalu.piutangLain, asetLancarLainnyaLalu: lalu.asetLancarLainnya,
      totalAsetLancarLalu: lalu.totalAsetLancar, asetTetapLalu: lalu.asetTetap,
      totalAsetTidakLancarLalu: lalu.totalAsetTidakLancar, totalAsetLalu: lalu.totalAset,
      hutangJangkaPendekLalu: lalu.hutangJangkaPendek, hutangGajiLalu: lalu.hutangGaji,
      hutangPajakLalu: lalu.hutangPajak, hutangBpjsLalu: lalu.hutangBpjs,
      pendapatanDiterimaDimukaLalu: 0,
      totalLiabilitasJangkaPendekLalu: lalu.totalLiabilitasJangkaPendek,
      hutangJangkaPanjangLalu: lalu.hutangJangkaPanjang,
      totalLiabilitasJangkaPanjangLalu: lalu.totalLiabilitasJangkaPanjang,
      totalLiabilitasLalu: lalu.totalLiabilitas,
      asetNetoLalu: lalu.asetNeto,
      surplusAkumulasianLalu: lalu.asetNetoTanpaPembatasan,
      penghasilanKomprehensifLainLalu: 0,
      sisaDanaTidakTerikatLalu: lalu.asetNetoTanpaPembatasan,
      sisaDanaTerikatTemporerLalu: lalu.asetNetoTerikatTemporer,
      sisaDanaTerikatPermanenLalu: lalu.asetNetoTerikatPermanen,
      // Metadata
      tahun,
      tahunLalu: String(tahunLalu),
      yayasanNama, unitCount: unitIds.length,
    }
  })

async function getSurplusItemsForRange(unitIds: string[], tglMulai: string, tglAkhir: string): Promise<{ items: SurplusDefisitItem[]; totalPemasukan: number; totalBeban: number; bebanPenyusutan: number }> {
  const rows = await db.select({
    nama: coa.nama,
    tipe: coa.tipe,
    kode: coa.kode,
    jumlah: sql<number>`coalesce((sum(${jurnalDetail.kredit}) - sum(${jurnalDetail.debit}))::bigint, 0)`,
    kodeCoretax: coa.kode,
  }).from(jurnalDetail)
    .innerJoin(jurnalHeader, eq(jurnalDetail.jurnalId, jurnalHeader.id))
    .innerJoin(coa, eq(jurnalDetail.coaId, coa.id))
    .where(and(inArray(jurnalHeader.unitId, unitIds), sql`${coa.tipe} IN ('pendapatan', 'beban')`, sql`${jurnalHeader.tanggal} >= ${tglMulai}`, sql`${jurnalHeader.tanggal} <= ${tglAkhir}`, sql`${jurnalHeader.tipe} <> 'penutup'`))
    .groupBy(coa.kode, coa.nama, coa.tipe, coa.urutan)
    .orderBy(coa.tipe, coa.urutan)

  const items: SurplusDefisitItem[] = rows.map((r) => ({
    nama: r.nama,
    tipe: r.tipe === 'pendapatan' ? 'pemasukan' : 'pengeluaran',
    jumlah: Math.abs(r.jumlah),
    jumlahLalu: 0,
    kodeCoretax: r.kodeCoretax,
    denganPembatasan: r.kode === '4.1.02',
  }))

  const hasPenyusutan = items.some((i) => i.nama === 'Beban Penyusutan')
  let bebanPenyusutan = hasPenyusutan ? (items.find((i) => i.nama === 'Beban Penyusutan')?.jumlah || 0) : 0

  if (!hasPenyusutan) {
    const asetRows = await db.query.asetTetap.findMany({
      where: and(inArray(asetTetap.unitId, unitIds), eq(asetTetap.status, 'aktif')),
    })
    for (const a of asetRows) {
      if (!a.masaManfaat || a.masaManfaat <= 0) continue
      if (a.metodePenyusutan === 'saldo_menurun') {
        bebanPenyusutan += Math.round((a.hargaPerolehan - a.akumulasiPenyusutan) * (2 / a.masaManfaat))
      } else {
        bebanPenyusutan += Math.round((a.hargaPerolehan - (a.nilaiResidu || 0)) / a.masaManfaat)
      }
    }
    if (bebanPenyusutan > 0) {
      items.push({ nama: 'Beban Penyusutan', tipe: 'pengeluaran', jumlah: bebanPenyusutan, jumlahLalu: 0, kodeCoretax: null, denganPembatasan: false })
    }
  }

  const totalPemasukan = items.filter((i) => i.tipe === 'pemasukan').reduce((s, i) => s + i.jumlah, 0)
  const totalBeban = items.filter((i) => i.tipe === 'pengeluaran').reduce((s, i) => s + i.jumlah, 0)
  return { items, totalPemasukan, totalBeban, bebanPenyusutan }
}

function buildSurplusSections(items: SurplusDefisitItem[]) {
  const pendapatanTanpa = items.filter((i) => i.tipe === 'pemasukan' && !i.denganPembatasan)
  const pendapatanDengan = items.filter((i) => i.tipe === 'pemasukan' && i.denganPembatasan)
  const bebanTanpa = items.filter((i) => i.tipe === 'pengeluaran' && !i.denganPembatasan)
  const bebanDengan = items.filter((i) => i.tipe === 'pengeluaran' && i.denganPembatasan)

  const totalPendapatanTanpa = pendapatanTanpa.reduce((s, i) => s + i.jumlah, 0)
  const totalPendapatanDengan = pendapatanDengan.reduce((s, i) => s + i.jumlah, 0)
  const totalBebanTanpa = bebanTanpa.reduce((s, i) => s + i.jumlah, 0)
  const totalBebanDengan = bebanDengan.reduce((s, i) => s + i.jumlah, 0)

  return {
    tanpaPembatasan: {
      pendapatan: pendapatanTanpa,
      totalPendapatan: totalPendapatanTanpa,
      beban: bebanTanpa,
      totalBeban: totalBebanTanpa,
      surplus: totalPendapatanTanpa - totalBebanTanpa,
    },
    denganPembatasan: {
      pendapatan: pendapatanDengan,
      totalPendapatan: totalPendapatanDengan,
      beban: bebanDengan,
      totalBeban: totalBebanDengan,
      surplus: totalPendapatanDengan - totalBebanDengan,
    },
  }
}

export const getLaporanSurplusDefisit = createServerFn({ method: 'GET' })
  .validator(z.object({
    unitId: z.string(),
    tahun: z.string().optional(),
    tanggalMulai: z.string().optional(),
    tanggalAkhir: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const tahun = data.tahun || String(new Date().getFullYear())
    const tahunLalu = String(Number(tahun) - 1)

    let unitIds: string[]
    let yayasanNama: string | null
    if (data.unitId === 'all' || data.unitId === 'semua') {
      unitIds = await (await import('./keuangan-utils.server')).resolveYayasanUnitIds(session.user.id)
      yayasanNama = null
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      unitIds = [data.unitId]
      yayasanNama = null
    }

    const tglMulai = data.tanggalMulai || `${tahun}-01-01`
    const tglAkhir = data.tanggalAkhir || `${tahun}-12-31`
    const tglMulaiLalu = `${tahunLalu}-01-01`
    const tglAkhirLalu = `${tahunLalu}-12-31`

    const [cur, prev] = await Promise.all([
      getSurplusItemsForRange(unitIds, tglMulai, tglAkhir),
      getSurplusItemsForRange(unitIds, tglMulaiLalu, tglAkhirLalu),
    ])

    const totalPemasukan = cur.totalPemasukan
    const totalBeban = cur.totalBeban
    const surplus = totalPemasukan - totalBeban

    // Merge jumlahLalu into current items
    for (const item of cur.items) {
      const prevItem = prev.items.find((p) => p.nama === item.nama && p.tipe === item.tipe)
      item.jumlahLalu = prevItem?.jumlah || 0
    }

    const sections = buildSurplusSections(cur.items)
    const totalPenghasilanKomprehensif = sections.tanpaPembatasan.surplus + sections.denganPembatasan.surplus

    return {
      items: cur.items,
      totalPemasukan,
      totalPengeluaran: cur.totalBeban - cur.bebanPenyusutan,
      bebanPenyusutan: cur.bebanPenyusutan,
      totalBeban,
      surplus,
      periode: `${tglMulai} — ${tglAkhir}`,
      tahun,
      tahunLalu,
      yayasanNama, unitCount: unitIds.length,
      ...sections,
      penghasilanKomprehensifLain: 0,
      totalPenghasilanKomprehensif,
    }
  })

// ─── Laporan Hutang Piutang ──────────────────────────────────────────────────

export type LaporanHPItem = {
  id: string
  tipe: 'hutang' | 'piutang'
  pihak: string
  deskripsi: string
  jumlah: number
  sisa: number
  tanggal: string
  jatuhTempo: string | null
  status: string
  kategori: string
  aging: number
  agingBucket: string
}

export type LaporanHPData = {
  hutang: LaporanHPItem[]
  piutang: LaporanHPItem[]
  totalHutang: number
  totalPiutang: number
  agingHutang: Record<string, number>
  agingPiutang: Record<string, number>
}

export const getLaporanHutangPiutang = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    let unitIds: string[]
    let yayasanNama: string | null
    if (data.unitId === 'all' || data.unitId === 'semua') {
      unitIds = await (await import('./keuangan-utils.server')).resolveYayasanUnitIds(session.user.id)
      yayasanNama = null
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      unitIds = [data.unitId]
      yayasanNama = null
    }

    const rows = await db.query.hutangPiutang.findMany({
      where: and(inArray(hutangPiutang.unitId, unitIds), sql`${hutangPiutang.status} IN ('belum_lunas', 'cicil')`),
      with: { vendor: true, pegawai: true },
      orderBy: (h, { desc }) => [desc(h.createdAt)],
    })

    const mapItem = (r: typeof rows[0]): LaporanHPItem => {
      const pihak = r.vendor?.nama || r.pegawai?.nama || r.pihak || '-'
      const tgl = new Date(r.tanggal)
      const now = new Date()
      const aging = Math.floor((now.getTime() - tgl.getTime()) / (1000 * 60 * 60 * 24))
      const bucket = aging <= 30 ? '0-30' : aging <= 60 ? '31-60' : aging <= 90 ? '61-90' : '>90'
      return {
        id: r.id, tipe: r.tipe as 'hutang' | 'piutang',
        pihak, deskripsi: r.deskripsi, jumlah: r.jumlah,
        sisa: r.sisa, tanggal: r.tanggal, jatuhTempo: r.jatuhTempo,
        status: r.status, kategori: r.kategori, aging, agingBucket: bucket,
      }
    }

    const hutang = rows.filter((r) => r.tipe === 'hutang').map(mapItem)
    const piutang = rows.filter((r) => r.tipe === 'piutang').map(mapItem)

    const totalHutang = hutang.reduce((s, r) => s + r.sisa, 0)
    const totalPiutang = piutang.reduce((s, r) => s + r.sisa, 0)

    const agingHutang: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '>90': 0 }
    const agingPiutang: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '>90': 0 }
    for (const h of hutang) agingHutang[h.agingBucket] += h.sisa
    for (const p of piutang) agingPiutang[p.agingBucket] += p.sisa

    return { hutang, piutang, totalHutang, totalPiutang, agingHutang, agingPiutang, yayasanNama, unitCount: unitIds.length }
  })

// ─── Anggaran CRUD ──────────────────────────────────────────────────────────

export const getAnggaranList = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string(), tipe: z.string().optional(), status: z.string().optional() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    let conditions: any[]
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await (await import('./keuangan-utils.server')).resolveYayasanUnitIds(session.user.id)
      conditions = [inArray(anggaran.unitId, unitIds)]
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      conditions = [eq(anggaran.unitId, data.unitId)]
    }
    if (data.tipe) conditions.push(eq(anggaran.tipe, data.tipe as any))
    if (data.status) conditions.push(eq(anggaran.status, data.status as any))
    return db.query.anggaran.findMany({
      where: and(...conditions),
      with: { unit: true },
      orderBy: (a, { desc }) => [desc(a.createdAt)],
    })
  })

export const createAnggaran = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(), nama: z.string().min(1, 'Nama wajib diisi'),
    total: z.number().int().positive(), periode: z.string().min(1),
    tipe: z.enum(['pemasukan', 'pengeluaran']).default('pengeluaran'),
    keterangan: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    const [created] = await db.insert(anggaran).values({ ...data, createdBy: session.user.id }).returning()
    return created
  })

export const updateAnggaran = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string().uuid(), unitId: z.string().uuid().optional(),
    nama: z.string().min(1).optional(),
    total: z.number().int().positive().optional(),
    periode: z.string().min(1).optional(),
    tipe: z.enum(['pemasukan', 'pengeluaran']).optional(),
    status: z.enum(['draft', 'aktif', 'selesai', 'dibatalkan']).optional(),
    keterangan: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.anggaran.findFirst({ where: eq(anggaran.id, data.id) })
    if (!existing) throw new Error('Anggaran tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    const upd: any = { updatedAt: new Date() }
    if (data.unitId !== undefined) upd.unitId = data.unitId
    if (data.nama !== undefined) upd.nama = data.nama
    if (data.total !== undefined) upd.total = data.total
    if (data.periode !== undefined) upd.periode = data.periode
    if (data.tipe !== undefined) upd.tipe = data.tipe
    if (data.status !== undefined) upd.status = data.status
    if (data.keterangan !== undefined) upd.keterangan = data.keterangan || null
    const [r] = await db.update(anggaran).set(upd).where(eq(anggaran.id, data.id)).returning()
    return r
  })

export const deleteAnggaran = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.anggaran.findFirst({ where: eq(anggaran.id, data.id) })
    if (!existing) throw new Error('Anggaran tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    await db.delete(anggaran).where(eq(anggaran.id, data.id))
    return { deleted: true }
  })

// ─── Chart of Accounts ────────────────────────────────────────────────────────

export const getCoaList = createServerFn({ method: 'GET' })
  .handler(async () => {
    await getSessionOrThrow()
    return db.query.coa.findMany({
      where: eq(coa.aktif, true),
      orderBy: (c, { asc }) => [asc(c.tipe), asc(c.urutan), asc(c.kode)],
    })
  })

export const createCoa = createServerFn({ method: 'POST' })
  .validator(z.object({
    kode: z.string().min(1, 'Kode wajib diisi'),
    nama: z.string().min(1, 'Nama wajib diisi'),
    tipe: z.enum(['aset_lancar', 'aset_tetap', 'liabilitas', 'aset_neto', 'pendapatan', 'beban']),
    subTipe: z.string().optional(),
    saldoNormal: z.enum(['debit', 'kredit']).default('debit'),
    level: z.number().int().default(1),
    urutan: z.number().int().default(0),
    keterangan: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    if (!(session.user as any).isSuperAdmin) throw new Error('Forbidden')
    const [created] = await db.insert(coa).values(data).returning()
    return created
  })

export const updateCoa = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string().uuid(),
    kode: z.string().min(1).optional(),
    nama: z.string().min(1).optional(),
    tipe: z.enum(['aset_lancar', 'aset_tetap', 'liabilitas', 'aset_neto', 'pendapatan', 'beban']).optional(),
    subTipe: z.string().optional(),
    saldoNormal: z.enum(['debit', 'kredit']).optional(),
    level: z.number().int().optional(),
    urutan: z.number().int().optional(),
    keterangan: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    if (!(session.user as any).isSuperAdmin) throw new Error('Forbidden')
    const upd: any = {}
    for (const [k, v] of Object.entries(data)) {
      if (k !== 'id' && v !== undefined) upd[k] = v
    }
    const [r] = await db.update(coa).set(upd).where(eq(coa.id, data.id)).returning()
    return r
  })

export const deleteCoa = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    if (!(session.user as any).isSuperAdmin) throw new Error('Forbidden')
    await db.update(coa).set({ aktif: false }).where(eq(coa.id, data.id))
    return { deleted: true }
  })

export const seedCoaAndKategori = createServerFn({ method: 'POST' })
  .validator(z.object({}).optional())
  .handler(async () => {
    const session = await getSessionOrThrow()
    if (!(session.user as any).isSuperAdmin) throw new Error('Forbidden')

    // Seed COA
    let coaInserted = 0
    for (const c of DEFAULT_COA) {
      const existing = await db.query.coa.findFirst({ where: eq(coa.kode, c.kode) })
      if (!existing) {
        await db.insert(coa).values(c)
        coaInserted++
      }
    }

    // Seed Kategori with COA mapping
    const existingKategori = await db.query.kasKategori.findMany()
    const existingKategoriNames = new Set(existingKategori.map((k) => k.nama))

    let kategoriInserted = 0
    let kategoriUpdated = 0
    for (const kat of DEFAULT_KATEGORI) {
      if (!existingKategoriNames.has(kat.nama)) {
        await db.insert(kasKategori).values({ ...kat }).returning()
        kategoriInserted++
      } else {
        const match = existingKategori.find((e) => e.nama === kat.nama)
        if (match) {
          const updates: any = {}
          if (!match.kodeCoretax && kat.kodeCoretax) updates.kodeCoretax = kat.kodeCoretax
          if (!match.coaKode && kat.coaKode) updates.coaKode = kat.coaKode
          if (kat.keterangan && match.keterangan !== kat.keterangan) updates.keterangan = kat.keterangan
          if (Object.keys(updates).length > 0) {
            await db.update(kasKategori).set(updates).where(eq(kasKategori.id, match.id))
            kategoriUpdated++
          }
        }
      }
    }

    return { 
      coa: { inserted: coaInserted, total: DEFAULT_COA.length },
      kategori: { inserted: kategoriInserted, updated: kategoriUpdated, total: DEFAULT_KATEGORI.length }
    }
  })

// ─── Jurnal (Double-Entry) ────────────────────────────────────────────────────

export const createJurnal = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(),
    tanggal: z.string(),
    tipe: z.enum(['kas', 'penyesuaian', 'penutup']).default('kas'),
    keterangan: z.string(),
    details: z.array(z.object({
      coaId: z.string().uuid(),
      debit: z.number().int().default(0),
      kredit: z.number().int().default(0),
      keterangan: z.string().optional(),
    })),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const totalDebit = data.details.reduce((s, d) => s + d.debit, 0)
    const totalKredit = data.details.reduce((s, d) => s + d.kredit, 0)
    if (totalDebit !== totalKredit) throw new Error(`Jurnal tidak seimbang: Debit ${totalDebit} ≠ Kredit ${totalKredit}`)

    const lastJurnal = await db.query.jurnalHeader.findFirst({
      where: and(eq(jurnalHeader.unitId, data.unitId), eq(jurnalHeader.tipe, data.tipe)),
      orderBy: (j, { desc }) => [desc(j.createdAt)],
    })
    const nextNum = (lastJurnal ? parseInt(lastJurnal.nomor.split('-').pop() || '0') : 0) + 1
    const nomor = `JU-${new Date(data.tanggal).getFullYear()}-${String(nextNum).padStart(4, '0')}`

    const [header] = await db.insert(jurnalHeader).values({
      unitId: data.unitId,
      nomor,
      tanggal: data.tanggal,
      tipe: data.tipe,
      keterangan: data.keterangan,
      createdBy: session.user.id,
    }).returning()

    for (const d of data.details) {
      if (d.debit <= 0 && d.kredit <= 0) continue
      await db.insert(jurnalDetail).values({
        jurnalId: header.id,
        coaId: d.coaId,
        debit: d.debit,
        kredit: d.kredit,
        keterangan: d.keterangan || null,
      })
    }

    return { id: header.id, nomor }
  })

export const getJurnalList = createServerFn({ method: 'GET' })
  .validator(z.object({
    unitId: z.string(),
    tipe: z.string().optional(),
    tanggalMulai: z.string().optional(),
    tanggalAkhir: z.string().optional(),
    page: z.number().optional().default(1),
    pageSize: z.number().optional().default(20),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    let unitCondition
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await (await import('./keuangan-utils.server')).resolveYayasanUnitIds(session.user.id)
      unitCondition = inArray(jurnalHeader.unitId, unitIds)
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      unitCondition = eq(jurnalHeader.unitId, data.unitId)
    }

    const conditions: any[] = [unitCondition]
    if (data.tipe) conditions.push(eq(jurnalHeader.tipe, data.tipe as any))
    if (data.tanggalMulai) conditions.push(sql`${jurnalHeader.tanggal} >= ${data.tanggalMulai}`)
    if (data.tanggalAkhir) conditions.push(sql`${jurnalHeader.tanggal} <= ${data.tanggalAkhir}`)

    const offset = (data.page - 1) * data.pageSize

    const [rows, countResult] = await Promise.all([
      db.query.jurnalHeader.findMany({
        where: and(...conditions),
        with: { details: { with: { coa: true } } },
        limit: data.pageSize,
        offset,
        orderBy: (j, { desc }) => [desc(j.tanggal), desc(j.createdAt)],
      }),
      db.select({ count: sql<number>`count(*)::int` }).from(jurnalHeader).where(and(...conditions)),
    ])

    return { data: rows, total: countResult[0]?.count ?? 0 }
  })

// ─── Buku Besar ───────────────────────────────────────────────────────────────

export const getBukuBesar = createServerFn({ method: 'GET' })
  .validator(z.object({
    unitId: z.string(),
    coaId: z.string().uuid().optional(),
    tipe: z.string().optional(),
    tanggalMulai: z.string().optional(),
    tanggalAkhir: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    let unitCondition
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await (await import('./keuangan-utils.server')).resolveYayasanUnitIds(session.user.id)
      unitCondition = inArray(jurnalHeader.unitId, unitIds)
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      unitCondition = eq(jurnalHeader.unitId, data.unitId)
    }

    const coaConditions: any[] = [eq(coa.aktif, true)]
    if (data.coaId) coaConditions.push(eq(coa.id, data.coaId))
    if (data.tipe) coaConditions.push(eq(coa.tipe, data.tipe as any))

    const accounts = await db.query.coa.findMany({
      where: and(...coaConditions),
      orderBy: (c, { asc }) => [asc(c.tipe), asc(c.kode)],
    })

    if (accounts.length === 0) return []

    const coaIds = accounts.map((a) => a.id)

    const details = await db.select({
      coaId: jurnalDetail.coaId,
      debit: jurnalDetail.debit,
      kredit: jurnalDetail.kredit,
      keterangan: jurnalDetail.keterangan,
      tanggal: jurnalHeader.tanggal,
      nomor: jurnalHeader.nomor,
      jurnalKeterangan: jurnalHeader.keterangan,
    })
      .from(jurnalDetail)
      .innerJoin(jurnalHeader, eq(jurnalDetail.jurnalId, jurnalHeader.id))
      .where(and(
        inArray(jurnalDetail.coaId, coaIds),
        unitCondition,
        ...(data.tanggalMulai ? [sql`${jurnalHeader.tanggal} >= ${data.tanggalMulai}`] : []),
        ...(data.tanggalAkhir ? [sql`${jurnalHeader.tanggal} <= ${data.tanggalAkhir}`] : []),
      ))
      .orderBy(jurnalHeader.tanggal, jurnalHeader.createdAt)

    const byCoa = new Map<string, typeof details>()
    for (const d of details) {
      const arr = byCoa.get(d.coaId) || []
      arr.push(d)
      byCoa.set(d.coaId, arr)
    }

    return accounts
      .map((acc) => {
        const rows = byCoa.get(acc.id) || []
        if (rows.length === 0 && !data.coaId) return null
        const totalDebit = rows.reduce((s, r) => s + r.debit, 0)
        const totalKredit = rows.reduce((s, r) => s + r.kredit, 0)
        const saldo = acc.saldoNormal === 'debit' ? totalDebit - totalKredit : totalKredit - totalDebit
        return {
          coa: acc,
          rows: rows.slice(0, 100),
          totalDebit,
          totalKredit,
          saldo,
        }
      })
      .filter(Boolean)
  })

export const getTrialBalance = createServerFn({ method: 'GET' })
  .validator(z.object({
    unitId: z.string(),
    tanggalMulai: z.string().optional(),
    tanggalAkhir: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    let unitCondition
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await (await import('./keuangan-utils.server')).resolveYayasanUnitIds(session.user.id)
      unitCondition = inArray(jurnalHeader.unitId, unitIds)
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      unitCondition = eq(jurnalHeader.unitId, data.unitId)
    }

    const dateConditions: any[] = []
    if (data.tanggalMulai) dateConditions.push(sql`${jurnalHeader.tanggal} >= ${data.tanggalMulai}`)
    if (data.tanggalAkhir) dateConditions.push(sql`${jurnalHeader.tanggal} <= ${data.tanggalAkhir}`)

    const rows = await db.select({
      coaKode: coa.kode,
      coaNama: coa.nama,
      coaTipe: coa.tipe,
      saldoNormal: coa.saldoNormal,
      totalDebit: sql<number>`coalesce(sum(${jurnalDetail.debit})::bigint, 0)`,
      totalKredit: sql<number>`coalesce(sum(${jurnalDetail.kredit})::bigint, 0)`,
    })
      .from(jurnalDetail)
      .innerJoin(jurnalHeader, eq(jurnalDetail.jurnalId, jurnalHeader.id))
      .innerJoin(coa, eq(jurnalDetail.coaId, coa.id))
      .where(and(unitCondition, ...dateConditions))
      .groupBy(coa.kode, coa.nama, coa.tipe, coa.saldoNormal, coa.urutan)
      .orderBy(coa.urutan, coa.kode)

    const result = rows.map((r) => {
      const balance = r.totalDebit - r.totalKredit
      return {
        ...r,
        saldoDebit: balance > 0 ? balance : 0,
        saldoKredit: balance < 0 ? -balance : 0,
      }
    })

    const totalDebit = result.reduce((s, r) => s + r.totalDebit, 0)
    const totalKredit = result.reduce((s, r) => s + r.totalKredit, 0)
    const totalSaldoDebit = result.reduce((s, r) => s + r.saldoDebit, 0)
    const totalSaldoKredit = result.reduce((s, r) => s + r.saldoKredit, 0)

    return {
      rows: result,
      totalDebit, totalKredit, totalSaldoDebit, totalSaldoKredit,
      balanced: totalSaldoDebit === totalSaldoKredit,
    }
  })

// ─── Jurnal Penyusutan Otomatis ──────────────────────────────────────────────

export const createJurnalPenyusutan = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(),
    periode: z.string(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const existing = await db.query.jurnalHeader.findFirst({
      where: and(
        eq(jurnalHeader.unitId, data.unitId),
        eq(jurnalHeader.tipe, 'penyusutan'),
        sql`${jurnalHeader.tanggal} >= ${data.periode + '-01'} AND ${jurnalHeader.tanggal} <= ${data.periode + '-28'}`,
      ),
    })
    if (existing) throw new Error(`Jurnal penyusutan untuk periode ${data.periode} sudah ada`)

    const assets = await db.query.asetTetap.findMany({
      where: and(eq(asetTetap.unitId, data.unitId), eq(asetTetap.status, 'aktif')),
    })

    if (assets.length === 0) throw new Error('Tidak ada aset tetap aktif')

    const coaBebanPenyusutan = await db.query.coa.findFirst({
      where: eq(coa.kode, '5.1.07'),
    })
    const coaAkumulasi = await db.query.coa.findFirst({
      where: eq(coa.kode, '1.2.06'),
    })
    if (!coaBebanPenyusutan || !coaAkumulasi) throw new Error('COA tidak ditemukan. Jalankan seed data terlebih dahulu.')

    const tanggal = `${data.periode}-28`
    const [jh] = await db.insert(jurnalHeader).values({
      unitId: data.unitId,
      nomor: `JU-${data.periode.slice(0, 4)}-DEPR`,
      tanggal,
      tipe: 'penyusutan',
      keterangan: `Jurnal penyusutan aset tetap periode ${data.periode}`,
      createdBy: session.user.id,
    }).returning()

    let totalPenyusutan = 0
    for (const a of assets) {
      if (!a.masaManfaat || a.masaManfaat <= 0) continue

      let beban: number
      if (a.metodePenyusutan === 'saldo_menurun') {
        // BUG #17 FIX: Divide by 12 for monthly depreciation (consistent with straight-line)
        beban = Math.round((a.hargaPerolehan - a.akumulasiPenyusutan) * (2 / a.masaManfaat) / 12)
      } else {
        beban = Math.round(((a.hargaPerolehan - (a.nilaiResidu || 0)) / a.masaManfaat) / 12)
      }
      beban = Math.max(0, Math.min(beban, a.hargaPerolehan - a.akumulasiPenyusutan))
      if (beban <= 0) continue

      await db.insert(jurnalDetail).values({
        jurnalId: jh.id, coaId: coaBebanPenyusutan.id,
        debit: beban, kredit: 0,
        keterangan: `Penyusutan: ${a.nama} (${a.kodeAset || '-'})`,
      })
      await db.insert(jurnalDetail).values({
        jurnalId: jh.id, coaId: coaAkumulasi.id,
        debit: 0, kredit: beban,
        keterangan: `Akumulasi penyusutan: ${a.nama}`,
      })

      await db.update(asetTetap)
        .set({ akumulasiPenyusutan: a.akumulasiPenyusutan + beban, updatedAt: new Date() })
        .where(eq(asetTetap.id, a.id))

      totalPenyusutan += beban
    }

    if (totalPenyusutan === 0) throw new Error('Tidak ada beban penyusutan yang dapat dihitung')

    return { id: jh.id, nomor: jh.nomor, totalPenyusutan, asetDihitung: assets.length }
  })

// ─── Jurnal Penutup Periode ─────────────────────────────────────────────────

export const createJurnalPenutup = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(),
    periode: z.string(),
    tahunBuku: z.string(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const existing = await db.query.jurnalHeader.findFirst({
      where: and(
        eq(jurnalHeader.unitId, data.unitId),
        eq(jurnalHeader.tipe, 'penutup'),
        sql`${jurnalHeader.keterangan} LIKE ${'%' + data.tahunBuku + '%'}`,
      ),
    })
    if (existing) throw new Error(`Jurnal penutup untuk tahun buku ${data.tahunBuku} sudah ada`)

    const pendapatanCoa = await db.query.coa.findMany({
      where: and(eq(coa.tipe, 'pendapatan'), eq(coa.aktif, true)),
    })

    const bebanCoa = await db.query.coa.findMany({
      where: and(eq(coa.tipe, 'beban'), eq(coa.aktif, true)),
    })

    // ─── Dana reklasifikasi: unrestricted → restricted ────────────────
    const danaRows = await db.query.dana.findMany({ where: eq(dana.unitId, data.unitId) })
    let danaTemporer = 0, danaPermanen = 0
    for (const d of danaRows) {
      const sisa = (d.targetNominal || 0) - (d.realisasi || 0)
      if (d.jenisIkat === 'terikat_temporer') danaTemporer += sisa
      else if (d.jenisIkat === 'terikat_permanen') danaPermanen += sisa
    }
    const danaTotal = danaTemporer + danaPermanen
    if (danaTotal > 0) {
      const coa310 = await db.query.coa.findFirst({ where: eq(coa.kode, '3.1.00') })
      const coa320 = await db.query.coa.findFirst({ where: eq(coa.kode, '3.2.00') })
      const coa330 = await db.query.coa.findFirst({ where: eq(coa.kode, '3.3.00') })

      const danaHeader = await db.query.jurnalHeader.findFirst({
        where: and(
          eq(jurnalHeader.unitId, data.unitId),
          eq(jurnalHeader.tipe, 'penyesuaian'),
          sql`${jurnalHeader.keterangan} LIKE ${'%Reklasifikasi dana%' + data.tahunBuku + '%'}`,
        ),
      })
      if (!danaHeader) {
        const [jhDana] = await db.insert(jurnalHeader).values({
          unitId: data.unitId,
          nomor: `JU-${data.tahunBuku}-DANA`,
          tanggal: `${data.tahunBuku}-12-31`,
          tipe: 'penyesuaian',
          keterangan: `Reklasifikasi dana terikat tahun ${data.tahunBuku}`,
          createdBy: session.user.id,
        }).returning()
        if (coa310 && coa320 && danaTemporer > 0) {
          await db.insert(jurnalDetail).values({ jurnalId: jhDana.id, coaId: coa310.id, debit: danaTemporer, kredit: 0, keterangan: 'Reklas ke terikat temporer' })
          await db.insert(jurnalDetail).values({ jurnalId: jhDana.id, coaId: coa320.id, debit: 0, kredit: danaTemporer, keterangan: 'Dana terikat temporer' })
        }
        if (coa310 && coa330 && danaPermanen > 0) {
          await db.insert(jurnalDetail).values({ jurnalId: jhDana.id, coaId: coa310.id, debit: danaPermanen, kredit: 0, keterangan: 'Reklas ke terikat permanen' })
          await db.insert(jurnalDetail).values({ jurnalId: jhDana.id, coaId: coa330.id, debit: 0, kredit: danaPermanen, keterangan: 'Dana terikat permanen' })
        }
      }
    }

    const [jh] = await db.insert(jurnalHeader).values({
      unitId: data.unitId,
      nomor: `JU-${data.tahunBuku}-CLOSE`,
      tanggal: `${data.tahunBuku}-12-31`,
      tipe: 'penutup',
      keterangan: `Jurnal penutup tahun buku ${data.tahunBuku}`,
      createdBy: session.user.id,
    }).returning()

    let totalPendapatan = 0
    let totalBeban = 0

    for (const pCoa of pendapatanCoa) {
      const jdRows = await db.select({
        saldo: sql<number>`coalesce(sum(${jurnalDetail.debit} - ${jurnalDetail.kredit})::bigint, 0)`,
      }).from(jurnalDetail)
        .innerJoin(jurnalHeader, eq(jurnalDetail.jurnalId, jurnalHeader.id))
        .where(and(
          eq(jurnalHeader.unitId, data.unitId),
          eq(jurnalDetail.coaId, pCoa.id),
          sql`${jurnalHeader.tipe} <> 'penutup'`,
          sql`${jurnalHeader.tanggal} >= ${data.tahunBuku + '-01-01'}`,
          sql`${jurnalHeader.tanggal} <= ${data.tahunBuku + '-12-31'}`,
        ))

      const balance = jdRows[0]?.saldo || 0
      if (balance === 0) continue
      const amount = Math.abs(balance)
      totalPendapatan += amount

      await db.insert(jurnalDetail).values({
        jurnalId: jh.id, coaId: pCoa.id,
        debit: amount, kredit: 0,
        keterangan: `Penutupan pendapatan: ${pCoa.nama}`,
      })
    }

    for (const bCoa of bebanCoa) {
      const jdRows = await db.select({
        saldo: sql<number>`coalesce(sum(${jurnalDetail.debit} - ${jurnalDetail.kredit})::bigint, 0)`,
      }).from(jurnalDetail)
        .innerJoin(jurnalHeader, eq(jurnalDetail.jurnalId, jurnalHeader.id))
        .where(and(
          eq(jurnalHeader.unitId, data.unitId),
          eq(jurnalDetail.coaId, bCoa.id),
          sql`${jurnalHeader.tipe} <> 'penutup'`,
          sql`${jurnalHeader.tanggal} >= ${data.tahunBuku + '-01-01'}`,
          sql`${jurnalHeader.tanggal} <= ${data.tahunBuku + '-12-31'}`,
        ))

      const balance = jdRows[0]?.saldo || 0
      if (balance === 0) continue
      const amount = Math.abs(balance)
      totalBeban += amount

      await db.insert(jurnalDetail).values({
        jurnalId: jh.id, coaId: bCoa.id,
        debit: 0, kredit: amount,
        keterangan: `Penutupan beban: ${bCoa.nama}`,
      })
    }

    const coaAsetNeto = await db.query.coa.findFirst({
      where: eq(coa.kode, '3.1.00'),
    })
    if (!coaAsetNeto) throw new Error('COA Aset Neto tidak ditemukan')

    const surplus = totalPendapatan - totalBeban
    if (surplus > 0) {
      await db.insert(jurnalDetail).values({
        jurnalId: jh.id, coaId: coaAsetNeto.id,
        debit: 0, kredit: surplus,
        keterangan: `Surplus tahun ${data.tahunBuku}`,
      })
    } else if (surplus < 0) {
      await db.insert(jurnalDetail).values({
        jurnalId: jh.id, coaId: coaAsetNeto.id,
        debit: Math.abs(surplus), kredit: 0,
        keterangan: `Defisit tahun ${data.tahunBuku}`,
      })
    }

    return { id: jh.id, nomor: jh.nomor, totalPendapatan, totalBeban, surplus }
  })

export const deleteJurnalPenutup = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(),
    tahunBuku: z.string(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const headers = await db.query.jurnalHeader.findMany({
      where: and(
        eq(jurnalHeader.unitId, data.unitId),
        eq(jurnalHeader.tipe, 'penutup'),
        sql`${jurnalHeader.keterangan} LIKE ${'%' + data.tahunBuku + '%'}`,
      ),
    })
    if (headers.length === 0) throw new Error(`Tidak ada jurnal penutup untuk tahun buku ${data.tahunBuku}`)

    for (const h of headers) {
      await db.delete(jurnalDetail).where(eq(jurnalDetail.jurnalId, h.id))
    }
    await db.delete(jurnalHeader).where(
      and(
        eq(jurnalHeader.unitId, data.unitId),
        eq(jurnalHeader.tipe, 'penutup'),
        sql`${jurnalHeader.keterangan} LIKE ${'%' + data.tahunBuku + '%'}`,
      ),
    )

    // Also delete dana reklasifikasi entries if they were created by createJurnalPenutup
    const danaHeaders = await db.query.jurnalHeader.findMany({
      where: and(
        eq(jurnalHeader.unitId, data.unitId),
        eq(jurnalHeader.tipe, 'penyesuaian'),
        sql`${jurnalHeader.keterangan} LIKE ${'%Reklasifikasi dana%' + data.tahunBuku + '%'}`,
      ),
    })
    for (const h of danaHeaders) {
      await db.delete(jurnalDetail).where(eq(jurnalDetail.jurnalId, h.id))
    }
    if (danaHeaders.length > 0) {
      await db.delete(jurnalHeader).where(
        and(
          eq(jurnalHeader.unitId, data.unitId),
          eq(jurnalHeader.tipe, 'penyesuaian'),
          sql`${jurnalHeader.keterangan} LIKE ${'%Reklasifikasi dana%' + data.tahunBuku + '%'}`,
        ),
      )
    }

    return { deleted: headers.length + danaHeaders.length }
  })

interface ArusKasItem { nama: string; masuk: number; keluar: number }

async function getArusKasData(unitIds: string[], tahun: string, endingBankBalance: number) {
  const rows = await db.select({
    jurnalId: jurnalDetail.jurnalId,
    coaKode: coa.kode,
    coaNama: coa.nama,
    debit: jurnalDetail.debit,
    kredit: jurnalDetail.kredit,
  }).from(jurnalDetail)
    .innerJoin(jurnalHeader, eq(jurnalDetail.jurnalId, jurnalHeader.id))
    .innerJoin(coa, eq(jurnalDetail.coaId, coa.id))
    .where(and(
      inArray(jurnalHeader.unitId, unitIds),
      sql`${jurnalHeader.tanggal} >= ${tahun + '-01-01'} AND ${jurnalHeader.tanggal} <= ${tahun + '-12-31'}`,
      sql`${jurnalHeader.tipe} <> 'penutup'`,
      sql`${jurnalHeader.tipe} <> 'penyesuaian'`,
    ))

  // Group by jurnalId: separate kas entry vs counter COA
  const jurnalMap = new Map<string, { kasDebit: number; kasKredit: number; counter: string[] }>()
  for (const r of rows) {
    if (!jurnalMap.has(r.jurnalId)) {
      jurnalMap.set(r.jurnalId, { kasDebit: 0, kasKredit: 0, counter: [] })
    }
    const j = jurnalMap.get(r.jurnalId)!
    if (r.coaKode === '1.1.01') {
      j.kasDebit += r.debit
      j.kasKredit += r.kredit
    } else {
      j.counter.push(r.coaKode)
    }
  }

  // Skip entries that don't involve kas at all (non-cash adjustments)
  const kasEntries = Array.from(jurnalMap.entries()).filter(
    ([, j]) => j.kasDebit !== 0 || j.kasKredit !== 0
  )

  // Build items per category from kas entries only
  const itemToCat: Record<string, 'operasi' | 'investasi' | 'pendanaan'> = {}
  const itemAgg: Record<string, { masuk: number; keluar: number }> = {}
  const catTotals: Record<string, { masuk: number; keluar: number; net: number }> = {
    operasi: { masuk: 0, keluar: 0, net: 0 },
    investasi: { masuk: 0, keluar: 0, net: 0 },
    pendanaan: { masuk: 0, keluar: 0, net: 0 },
  }

  const ITEM_NAMES: Record<string, string> = {
    '4.1.01': 'Kas dari pendapatan jasa (SPP)',
    '4.1.02': 'Kas dari sumbangan / donasi',
    '4.1.03': 'Kas dari bantuan pemerintah',
    '4.1.04': 'Penerimaan lain-lain',
    '5.1.01': 'Kas yang dibayarkan kepada karyawan',
    '5.1.02': 'Pembayaran ATK & perlengkapan',
    '5.1.03': 'Pembayaran listrik, air & telepon',
    '5.1.04': 'Pembayaran kegiatan operasional',
    '5.1.05': 'Pembayaran pemeliharaan',
    '5.1.06': 'Pembayaran transportasi',
    '5.1.08': 'Pengeluaran lain-lain',
  }

  for (const [, j] of kasEntries) {
    const net = j.kasDebit - j.kasKredit

    let cat: 'operasi' | 'investasi' | 'pendanaan' = 'operasi'
    let nama = 'Kas dari aktivitas operasi lainnya'
    for (const c of j.counter) {
      if (c.startsWith('1.2.')) { cat = 'investasi'; nama = 'Pembelian aset tetap'; break }
      if (c === '2.1.05') { cat = 'pendanaan'; nama = 'Pembayaran pinjaman bank'; break }
      if (c.startsWith('3.')) { cat = 'pendanaan'; nama = 'Penerimaan sumbangan dibatasi untuk investasi'; break }
      if (ITEM_NAMES[c]) { nama = ITEM_NAMES[c]; break }
    }

    itemToCat[nama] = cat
    if (!itemAgg[nama]) itemAgg[nama] = { masuk: 0, keluar: 0 }
    if (net > 0) itemAgg[nama].masuk += net
    else itemAgg[nama].keluar += Math.abs(net)

    catTotals[cat].masuk += net > 0 ? net : 0
    catTotals[cat].keluar += net < 0 ? Math.abs(net) : 0
    catTotals[cat].net += net
  }

  const operasiItems: ArusKasItem[] = []
  const investasiItems: ArusKasItem[] = []
  const pendanaanItems: ArusKasItem[] = []

  for (const [nama, val] of Object.entries(itemAgg)) {
    const cat = itemToCat[nama]
    const item: ArusKasItem = { nama, masuk: val.masuk, keluar: val.keluar }
    if (cat === 'operasi') operasiItems.push(item)
    else if (cat === 'investasi') investasiItems.push(item)
    else pendanaanItems.push(item)
  }

  const kenaikanNeto = catTotals.operasi.net + catTotals.investasi.net + catTotals.pendanaan.net

  return {
    operasiItems,
    operasiMasuk: catTotals.operasi.masuk,
    operasiKeluar: catTotals.operasi.keluar,
    operasiNet: catTotals.operasi.net,
    investasiItems,
    investasiMasuk: catTotals.investasi.masuk,
    investasiKeluar: catTotals.investasi.keluar,
    investasiNet: catTotals.investasi.net,
    pendanaanItems,
    pendanaanMasuk: catTotals.pendanaan.masuk,
    pendanaanKeluar: catTotals.pendanaan.keluar,
    pendanaanNet: catTotals.pendanaan.net,
    kenaikanNeto,
    saldoAwal: endingBankBalance - kenaikanNeto,
    saldoAkhir: endingBankBalance,
  }
}

export const getArusKas = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string(), tahun: z.string() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const tahunLalu = String(Number(data.tahun) - 1)

    let unitIds: string[]
    if (data.unitId === 'all' || data.unitId === 'semua') {
      unitIds = await (await import('./keuangan-utils.server')).resolveYayasanUnitIds(session.user.id)
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      unitIds = [data.unitId]
    }

    const [bankRows] = await db.select({ saldo: sql<number>`coalesce(sum(saldo)::bigint, 0)` })
      .from(bankAccount).where(and(eq(bankAccount.aktif, true), inArray(bankAccount.unitId, unitIds)))
    const currentBalance = bankRows?.saldo ?? 0

    const cur = await getArusKasData(unitIds, data.tahun, currentBalance)
    const prevBalance = currentBalance - cur.kenaikanNeto
    const prev = await getArusKasData(unitIds, tahunLalu, prevBalance)

    return {
      tahun: data.tahun, tahunLalu,
      operasiItems: cur.operasiItems, operasiMasuk: cur.operasiMasuk, operasiKeluar: cur.operasiKeluar, operasiNet: cur.operasiNet,
      investasiItems: cur.investasiItems, investasiMasuk: cur.investasiMasuk, investasiKeluar: cur.investasiKeluar, investasiNet: cur.investasiNet,
      pendanaanItems: cur.pendanaanItems, pendanaanMasuk: cur.pendanaanMasuk, pendanaanKeluar: cur.pendanaanKeluar, pendanaanNet: cur.pendanaanNet,
      kenaikanNeto: cur.kenaikanNeto, saldoAwal: cur.saldoAwal, saldoAkhir: cur.saldoAkhir,
      operasiItemsLalu: prev.operasiItems, operasiMasukLalu: prev.operasiMasuk, operasiKeluarLalu: prev.operasiKeluar, operasiNetLalu: prev.operasiNet,
      investasiItemsLalu: prev.investasiItems, investasiMasukLalu: prev.investasiMasuk, investasiKeluarLalu: prev.investasiKeluar, investasiNetLalu: prev.investasiNet,
      pendanaanItemsLalu: prev.pendanaanItems, pendanaanMasukLalu: prev.pendanaanMasuk, pendanaanKeluarLalu: prev.pendanaanKeluar, pendanaanNetLalu: prev.pendanaanNet,
      kenaikanNetoLalu: prev.kenaikanNeto, saldoAwalLalu: prev.saldoAwal, saldoAkhirLalu: prev.saldoAkhir,
    }
  })

export const getCalkDepresiasi = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    let unitIds: string[]
    if (data.unitId === 'all' || data.unitId === 'semua') {
      unitIds = await (await import('./keuangan-utils.server')).resolveYayasanUnitIds(session.user.id)
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      unitIds = [data.unitId]
    }

    const coa126 = await db.query.coa.findFirst({ where: eq(coa.kode, '1.2.06') })
    if (!coa126) return { totalAkumulasi: 0 }

    const [row] = await db.select({
      total: sql<number>`coalesce(sum(${jurnalDetail.kredit} - ${jurnalDetail.debit})::bigint, 0)`,
    }).from(jurnalDetail)
      .innerJoin(jurnalHeader, eq(jurnalDetail.jurnalId, jurnalHeader.id))
      .where(and(inArray(jurnalHeader.unitId, unitIds), eq(jurnalDetail.coaId, coa126.id)))

    return { totalAkumulasi: row?.total ?? 0 }
  })

// ─── Perubahan Aset Neto (ISAK 35) ──────────────────────────────────────────

async function getAsetNetoCoaBalances(unitCondition: any, tahun: string) {
  const coas = ['3.1.00', '3.2.00', '3.3.00']
  const result: Record<string, { saldoAwal: number; perubahan: number; saldoAkhir: number }> = {}

  for (const kode of coas) {
    const acc = await db.query.coa.findFirst({ where: and(eq(coa.kode, kode), eq(coa.aktif, true)) })
    if (!acc) { result[kode] = { saldoAwal: 0, perubahan: 0, saldoAkhir: 0 }; continue }

    const [before] = await db.select({
      saldo: sql<number>`coalesce(sum(${jurnalDetail.kredit} - ${jurnalDetail.debit})::bigint, 0)`,
    }).from(jurnalDetail)
      .innerJoin(jurnalHeader, eq(jurnalDetail.jurnalId, jurnalHeader.id))
      .where(and(unitCondition, eq(jurnalDetail.coaId, acc.id), sql`${jurnalHeader.tanggal} < ${tahun + '-01-01'}`))

    const [during] = await db.select({
      perubahan: sql<number>`coalesce(sum(${jurnalDetail.kredit} - ${jurnalDetail.debit})::bigint, 0)`,
    }).from(jurnalDetail)
      .innerJoin(jurnalHeader, eq(jurnalDetail.jurnalId, jurnalHeader.id))
      .where(and(unitCondition, eq(jurnalDetail.coaId, acc.id),
        sql`${jurnalHeader.tanggal} >= ${tahun + '-01-01'} AND ${jurnalHeader.tanggal} <= ${tahun + '-12-31'}`))

    const saldoAwal = before?.saldo ?? 0
    const perubahan = during?.perubahan ?? 0
    result[kode] = { saldoAwal, perubahan, saldoAkhir: saldoAwal + perubahan }
  }

  return result
}

export const getPerubahanAsetNeto = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string(), tahun: z.string() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const tahunLalu = String(Number(data.tahun) - 1)
    let unitCondition
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await (await import('./keuangan-utils.server')).resolveYayasanUnitIds(session.user.id)
      unitCondition = inArray(jurnalHeader.unitId, unitIds)
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      unitCondition = eq(jurnalHeader.unitId, data.unitId)
    }

    const [cur, prev] = await Promise.all([
      getAsetNetoCoaBalances(unitCondition, data.tahun),
      getAsetNetoCoaBalances(unitCondition, tahunLalu),
    ])

    const t = (k: string) => cur[k] || { saldoAwal: 0, perubahan: 0, saldoAkhir: 0 }
    const p = (k: string) => prev[k] || { saldoAwal: 0, perubahan: 0, saldoAkhir: 0 }

    const totalAkhir = t('3.1.00').saldoAkhir + t('3.2.00').saldoAkhir + t('3.3.00').saldoAkhir
    const totalAkhirLalu = p('3.1.00').saldoAkhir + p('3.2.00').saldoAkhir + p('3.3.00').saldoAkhir

    return {
      tahun: data.tahun,
      tahunLalu,
      tanpaPembatasan: {
        saldoAwal: t('3.1.00').saldoAwal,
        surplus: t('3.1.00').perubahan,
        asetDibebaskan: 0,
        saldoAkhir: t('3.1.00').saldoAkhir,
        saldoAwalLalu: p('3.1.00').saldoAwal,
        surplusLalu: p('3.1.00').perubahan,
        asetDibebaskanLalu: 0,
        saldoAkhirLalu: p('3.1.00').saldoAkhir,
      },
      pkl: {
        saldoAwal: 0, tahunBerjalan: 0, saldoAkhir: 0,
        saldoAwalLalu: 0, tahunBerjalanLalu: 0, saldoAkhirLalu: 0,
      },
      denganPembatasan: {
        saldoAwal: t('3.2.00').saldoAwal + t('3.3.00').saldoAwal,
        surplus: t('3.2.00').perubahan + t('3.3.00').perubahan,
        asetDibebaskan: 0,
        saldoAkhir: t('3.2.00').saldoAkhir + t('3.3.00').saldoAkhir,
        saldoAwalLalu: p('3.2.00').saldoAwal + p('3.3.00').saldoAwal,
        surplusLalu: p('3.2.00').perubahan + p('3.3.00').perubahan,
        asetDibebaskanLalu: 0,
        saldoAkhirLalu: p('3.2.00').saldoAkhir + p('3.3.00').saldoAkhir,
      },
      totalAkhir,
      totalAkhirLalu,
    }
  })

// ─── Excel Export ─────────────────────────────────────────────────────────────

const ExportFilterSchema = TransaksiFilterSchema.omit({ page: true, pageSize: true })

export const exportTransaksiExcel = createServerFn({ method: 'GET' })
  .validator(ExportFilterSchema)
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)

    const conditions = [eq(kasTransaksi.unitId, data.unitId)]
    if (data.tipe) conditions.push(eq(kasTransaksi.tipe, data.tipe))
    if (data.refType) conditions.push(eq(kasTransaksi.refType, data.refType))
    if (data.kategoriId) conditions.push(eq(kasTransaksi.kategoriId, data.kategoriId))
    if (data.bankAccountId) conditions.push(eq(kasTransaksi.bankAccountId, data.bankAccountId))
    if (data.tanggalMulai && data.tanggalAkhir) {
      conditions.push(between(kasTransaksi.tanggal, data.tanggalMulai, data.tanggalAkhir))
    }

    const rows = await db.query.kasTransaksi.findMany({
      where: and(...conditions),
      with: { kategori: true, bankAccount: true, vendor: true, hutangPiutang: true },
      orderBy: (t, { asc, desc }) => {
        const fn = data.sortDir === 'desc' ? desc : asc
        if (data.sortBy === 'jumlah') return [fn(t.jumlah), asc(t.createdAt)]
        if (data.sortBy === 'tipe') return [fn(t.tipe), asc(t.createdAt)]
        if (data.sortBy === 'keterangan') return [fn(t.keterangan), asc(t.createdAt)]
        return [fn(t.tanggal), fn(t.createdAt)]
      },
    })

    // Enrich payment rows with student info
    const paymentRefIds = rows
      .filter((r) => r.refType === 'spp' || r.refType === 'kas')
      .map((r) => r.refId)
      .filter(Boolean) as string[]

    const siswaMap = new Map<string, { nama: string; nis: string | null }>()
    if (paymentRefIds.length > 0) {
      const tagihanRows = await db.query.tagihanSiswa.findMany({
        where: inArray(tagihanSiswa.id, paymentRefIds),
        with: { siswa: true },
      })
      for (const tr of tagihanRows) {
        if (tr.siswa) {
          siswaMap.set(tr.id, { nama: tr.siswa.nama, nis: tr.siswa.nis })
        }
      }
    }

    const { default: XLSX } = await import('xlsx')

    const REFTYPE_LABEL: Record<string, string> = {
      kas: 'Kas Manual', spp: 'SPP', gaji: 'Gaji',
      penyusutan: 'Penyusutan', penyesuaian: 'Penyesuaian',
      penutup: 'Penutup', dana: 'Dana',
    }

    const headers = [
      'No', 'Tanggal', 'Keterangan', 'Kategori', 'Sumber', 'Bank',
      'Aliran', 'Jumlah (Rp)', 'Referensi', 'Siswa', 'NIS', 'Vendor',
    ]

    const excelData = rows.map((r, i) => {
      const s = (r.refType === 'spp' || r.refType === 'kas') && r.refId ? siswaMap.get(r.refId) : undefined
      return [
        i + 1,
        r.tanggal,
        r.keterangan,
        r.kategori?.nama || '-',
        REFTYPE_LABEL[r.refType] || r.refType,
        r.bankAccount?.namaBank || '-',
        r.tipe === 'pemasukan' ? 'Masuk' : 'Keluar',
        r.jumlah,
        r.referensi || '-',
        s?.nama || '-',
        s?.nis || '-',
        r.vendor?.nama || '-',
      ]
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...excelData])

    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 14 },  // Tanggal
      { wch: 40 },  // Keterangan
      { wch: 18 },  // Kategori
      { wch: 16 },  // Sumber
      { wch: 18 },  // Bank
      { wch: 10 },  // Aliran
      { wch: 18 },  // Jumlah
      { wch: 20 },  // Referensi
      { wch: 24 },  // Siswa
      { wch: 14 },  // NIS
      { wch: 20 },  // Vendor
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Transaksi Kas')

    const now = new Date()
    const ts = now.toISOString().slice(0, 19).replace(/[:-]/g, '')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const base64 = buf.toString('base64')

    return { base64, fileName: `Data_Kas_${ts}.xlsx` }
  })
