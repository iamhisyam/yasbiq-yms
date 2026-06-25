import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { bosPeriode, bosRkas, bosRealisasi, kasTransaksi, jurnalHeader, jurnalDetail, bankAccount } from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'
import { ensureKategori, generateJurnalKas } from './keuangan-utils.server'

async function getSessionOrThrow() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request!.headers })
  if (!session?.user) throw new Error('Unauthenticated')
  return session
}

// ─── Periode BOS ─────────────────────────────────────────────────────────────

export const getBosPeriodeList = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
    return db.query.bosPeriode.findMany({
      where: eq(bosPeriode.unitId, data.unitId),
      orderBy: (p, { desc }) => [desc(p.tahun)],
      with: { rkasItems: { with: { realisasis: true } } },
    })
  })

export const createBosPeriode = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(), tahun: z.number().int(),
    nama: z.string().min(1), jumlahDana: z.number().int().default(0),
    rekeningKhusus: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    const [r] = await db.insert(bosPeriode).values(data).returning()
    return r
  })

export const updateBosPeriode = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string().uuid(), tahun: z.number().int().optional(),
    nama: z.string().min(1).optional(), jumlahDana: z.number().int().optional(),
    rekeningKhusus: z.string().optional(), status: z.enum(['aktif', 'selesai']).optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.bosPeriode.findFirst({ where: eq(bosPeriode.id, data.id) })
    if (!existing) throw new Error('Periode tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    const upd: any = { updatedAt: new Date() }
    if (data.tahun !== undefined) upd.tahun = data.tahun
    if (data.nama !== undefined) upd.nama = data.nama
    if (data.jumlahDana !== undefined) upd.jumlahDana = data.jumlahDana
    if (data.rekeningKhusus !== undefined) upd.rekeningKhusus = data.rekeningKhusus || null
    if (data.status !== undefined) upd.status = data.status
    const [r] = await db.update(bosPeriode).set(upd).where(eq(bosPeriode.id, data.id)).returning()
    return r
  })

export const deleteBosPeriode = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.bosPeriode.findFirst({ where: eq(bosPeriode.id, data.id) })
    if (!existing) throw new Error('Periode tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    await db.delete(bosPeriode).where(eq(bosPeriode.id, data.id))
    return { deleted: true }
  })

// ─── RKAS ────────────────────────────────────────────────────────────────────

export const getBosRkas = createServerFn({ method: 'GET' })
  .validator(z.object({ periodeId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const periode = await db.query.bosPeriode.findFirst({ where: eq(bosPeriode.id, data.periodeId) })
    if (!periode) throw new Error('Periode tidak ditemukan')
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, periode.unitId, (session.user as any).isSuperAdmin)
    return db.query.bosRkas.findMany({
      where: eq(bosRkas.periodeId, data.periodeId),
      with: { realisasis: true },
      orderBy: (r, { asc }) => [asc(r.kodeRekening), asc(r.komponen)],
    })
  })

export const createBosRkas = createServerFn({ method: 'POST' })
  .validator(z.object({
    periodeId: z.string().uuid(), kodeRekening: z.string().optional(),
    komponen: z.string().min(1), subKomponen: z.string().optional(),
    anggaran: z.number().int().default(0), keterangan: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const periode = await db.query.bosPeriode.findFirst({ where: eq(bosPeriode.id, data.periodeId) })
    if (!periode) throw new Error('Periode tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, periode.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    const [r] = await db.insert(bosRkas).values(data).returning()
    return r
  })

export const updateBosRkas = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string().uuid(), kodeRekening: z.string().optional(),
    komponen: z.string().min(1).optional(), subKomponen: z.string().optional(),
    anggaran: z.number().int().optional(), keterangan: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.bosRkas.findFirst({ where: eq(bosRkas.id, data.id), with: { periode: true } })
    if (!existing) throw new Error('RKAS tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.periode.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    const upd: any = { updatedAt: new Date() }
    if (data.kodeRekening !== undefined) upd.kodeRekening = data.kodeRekening || null
    if (data.komponen !== undefined) upd.komponen = data.komponen
    if (data.subKomponen !== undefined) upd.subKomponen = data.subKomponen || null
    if (data.anggaran !== undefined) upd.anggaran = data.anggaran
    if (data.keterangan !== undefined) upd.keterangan = data.keterangan || null
    const [r] = await db.update(bosRkas).set(upd).where(eq(bosRkas.id, data.id)).returning()
    return r
  })

export const deleteBosRkas = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.bosRkas.findFirst({ where: eq(bosRkas.id, data.id), with: { periode: true } })
    if (!existing) throw new Error('RKAS tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.periode.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    await db.delete(bosRkas).where(eq(bosRkas.id, data.id))
    return { deleted: true }
  })

// ─── Realisasi ───────────────────────────────────────────────────────────────

export const createBosRealisasi = createServerFn({ method: 'POST' })
  .validator(z.object({
    rkasId: z.string().uuid(), tanggal: z.string().min(1),
    uraian: z.string().min(1), jumlah: z.number().int().positive(),
    bukti: z.string().optional(), bankAccountId: z.string().uuid().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const rkas = await db.query.bosRkas.findFirst({ where: eq(bosRkas.id, data.rkasId), with: { periode: true } })
    if (!rkas) throw new Error('RKAS tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, rkas.periode.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    // Find or create kategori "Realisasi BOS"
    const kategori = await ensureKategori('Realisasi BOS', 'pengeluaran', '411211', 'Realisasi BOS — Bantuan Operasional Sekolah (PPh Pasal 23)')

    let ktRow: typeof kasTransaksi.$inferSelect | undefined
    await db.transaction(async (tx) => {
      const [r] = await tx.insert(bosRealisasi).values(data).returning()
      const [row] = await tx.insert(kasTransaksi).values({
        unitId: rkas.periode.unitId, kategoriId: kategori.id,
        bankAccountId: data.bankAccountId || null,
        tipe: 'pengeluaran', refType: 'kas',
        refId: r.id,
        jumlah: data.jumlah,
        keterangan: `BOS: ${data.uraian} — ${rkas.komponen}`,
        tanggal: data.tanggal, referensi: `bos/${r.id}`,
        createdBy: session.user.id,
      }).returning()
      ktRow = row

      // Update bank balance if bankAccountId is provided
      if (data.bankAccountId) {
        // Check bank balance sufficiency with row lock
        const [bank] = await tx.select().from(bankAccount)
          .where(eq(bankAccount.id, data.bankAccountId))
          .for('update')
        if (bank && bank.saldo - data.jumlah < 0) {
          throw new Error(`Saldo ${bank.namaBank} tidak mencukupi. Saldo: Rp${bank.saldo.toLocaleString('id-ID')}, dibutuhkan: Rp${data.jumlah.toLocaleString('id-ID')}`)
        }
        await tx.update(bankAccount)
          .set({ saldo: sql`${bankAccount.saldo} - ${data.jumlah}`, updatedAt: new Date() })
          .where(eq(bankAccount.id, data.bankAccountId))
      }
    })

    // Generate journal for BOS realization
    try {
      await generateJurnalKas(
        rkas.periode.unitId, 'pengeluaran', data.jumlah,
        kategori.id, null, data.tanggal,
        `bos/${data.rkasId}`,
        `BOS: ${data.uraian} — ${rkas.komponen}`,
        session.user.id, ktRow!.id,
      )
    } catch (e) { console.error('Journal generation failed for BOS realisasi:', e) }

    return { success: true }
  })

export const deleteBosRealisasi = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.bosRealisasi.findFirst({ where: eq(bosRealisasi.id, data.id), with: { rkas: { with: { periode: true } } } })
    if (!existing) throw new Error('Realisasi tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.rkas.periode.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    await db.transaction(async (tx) => {
      // BUG #7 FIX: Reverse bank balance before deleting kasTransaksi
      const ktRows = await tx.query.kasTransaksi.findMany({ where: eq(kasTransaksi.referensi, `bos/${data.id}`) })
      for (const kt of ktRows) {
        if (kt.bankAccountId && kt.tipe === 'pengeluaran') {
          await tx.update(bankAccount)
            .set({ saldo: sql`${bankAccount.saldo} + ${kt.jumlah}`, updatedAt: new Date() })
            .where(eq(bankAccount.id, kt.bankAccountId))
        }
        const jhs = await tx.query.jurnalHeader.findMany({ where: eq(jurnalHeader.transaksiId, kt.id) })
        for (const jh of jhs) {
          await tx.delete(jurnalDetail).where(eq(jurnalDetail.jurnalId, jh.id))
          await tx.delete(jurnalHeader).where(eq(jurnalHeader.id, jh.id))
        }
      }
      await tx.delete(kasTransaksi).where(eq(kasTransaksi.referensi, `bos/${data.id}`))
      await tx.delete(bosRealisasi).where(eq(bosRealisasi.id, data.id))
    })
    return { deleted: true }
  })

// ─── Ringkasan & Laporan ─────────────────────────────────────────────────────

export const getRingkasanBos = createServerFn({ method: 'GET' })
  .validator(z.object({ periodeId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const periode = await db.query.bosPeriode.findFirst({ where: eq(bosPeriode.id, data.periodeId) })
    if (!periode) throw new Error('Periode tidak ditemukan')
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, periode.unitId, (session.user as any).isSuperAdmin)
    const rows = await db.query.bosRkas.findMany({
      where: eq(bosRkas.periodeId, data.periodeId),
      with: { realisasis: true },
    })

    const komponen: Array<{
      id: string; kodeRekening: string | null; komponen: string
      subKomponen: string | null; anggaran: number; realisasi: number; sisa: number
    }> = []
    let totalAnggaran = 0, totalRealisasi = 0

    for (const r of rows) {
      const realisasi = r.realisasis.reduce((s, x) => s + x.jumlah, 0)
      komponen.push({
        id: r.id, kodeRekening: r.kodeRekening, komponen: r.komponen,
        subKomponen: r.subKomponen, anggaran: r.anggaran,
        realisasi, sisa: r.anggaran - realisasi,
      })
      totalAnggaran += r.anggaran
      totalRealisasi += realisasi
    }

    return { komponen, totalAnggaran, totalRealisasi, sisa: totalAnggaran - totalRealisasi }
  })
