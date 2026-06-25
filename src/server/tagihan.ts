import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { tagihan, tagihanItem, tagihanSiswa, pembayaran, siswa, kelas, tingkat, kasTransaksi, bankAccount } from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'
import { ensureKategori, generateJurnalKas } from './keuangan-utils.server'

async function getSessionOrThrow() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request!.headers })
  if (!session?.user) throw new Error('Unauthenticated')
  return session
}

// ─── Tagihan Template CRUD ───────────────────────────────────────────────────

const ItemInput = z.object({
  nama: z.string().min(1), qty: z.number().int().min(1),
  hargaSatuan: z.number().int().min(0), diskon: z.number().int().min(0).default(0),
})

export const getTagihanList = createServerFn({ method: 'GET' })
  .validator(z.object({
    unitId: z.string().uuid(), status: z.string().optional(),
    tahunAjaran: z.string().optional(), page: z.number().default(1),
    pageSize: z.number().default(20),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
    const conditions = [eq(tagihan.unitId, data.unitId), eq(tagihan.jenis, 'lainnya')]
    if (data.status) conditions.push(eq(tagihan.status, data.status as any))
    if (data.tahunAjaran) conditions.push(eq(tagihan.tahunAjaran, data.tahunAjaran))

    const offset = (data.page - 1) * data.pageSize
    const [rows, countResult] = await Promise.all([
      db.query.tagihan.findMany({
        where: and(...conditions), with: { items: true, siswaTagihan: { with: { siswa: true } } },
        limit: data.pageSize, offset,
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      }),
      db.select({ count: sql<number>`count(*)::int` }).from(tagihan).where(and(...conditions)),
    ])
    return { data: rows, total: countResult[0]?.count ?? 0, page: data.page, pageSize: data.pageSize }
  })

export const createTagihan = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(), tahunAjaran: z.string().min(1),
    judul: z.string().optional(), dueDate: z.string().optional(),
    keterangan: z.string().optional(), items: z.array(ItemInput).min(1),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const itemRows = data.items.map((it) => {
      const subtotal = Math.max((it.qty * it.hargaSatuan) - it.diskon, 0)
      return { nama: it.nama, qty: it.qty, hargaSatuan: it.hargaSatuan, diskon: it.diskon, subtotal }
    })
    const nominal = itemRows.reduce((s, i) => s + i.subtotal, 0)

    const [created] = await db.insert(tagihan).values({
      unitId: data.unitId, jenis: 'lainnya', tahunAjaran: data.tahunAjaran,
      judul: data.judul || null, status: 'draft', nominal,
      dueDate: data.dueDate || null, keterangan: data.keterangan || null,
    }).returning()

    await db.insert(tagihanItem).values(itemRows.map((ir) => ({ ...ir, tagihanId: created.id })))
    return { ...created, items: itemRows }
  })

export const updateTagihan = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string().uuid(), tahunAjaran: z.string().min(1).optional(),
    judul: z.string().optional(), dueDate: z.string().optional(),
    keterangan: z.string().optional(), items: z.array(ItemInput).min(1).optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.tagihan.findFirst({ where: eq(tagihan.id, data.id), with: { items: true } })
    if (!existing) throw new Error('Tagihan tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    if (existing.status !== 'draft') throw new Error('Hanya template draft bisa diedit')

    const upd: any = { updatedAt: new Date() }
    if (data.tahunAjaran !== undefined) upd.tahunAjaran = data.tahunAjaran
    if (data.judul !== undefined) upd.judul = data.judul || null
    if (data.dueDate !== undefined) upd.dueDate = data.dueDate || null
    if (data.keterangan !== undefined) upd.keterangan = data.keterangan || null

    if (data.items) {
      const itemRows = data.items.map((it) => {
        const subtotal = Math.max((it.qty * it.hargaSatuan) - it.diskon, 0)
        return { nama: it.nama, qty: it.qty, hargaSatuan: it.hargaSatuan, diskon: it.diskon, subtotal }
      })
      upd.nominal = itemRows.reduce((s, i) => s + i.subtotal, 0)
      await db.transaction(async (tx) => {
        await tx.delete(tagihanItem).where(eq(tagihanItem.tagihanId, data.id))
        await tx.insert(tagihanItem).values(itemRows.map((ir) => ({ ...ir, tagihanId: data.id })))
      })
    }

    const [r] = await db.update(tagihan).set(upd).where(eq(tagihan.id, data.id)).returning()
    return r
  })

export const deleteTagihan = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const bill = await db.query.tagihan.findFirst({ where: eq(tagihan.id, data.id) })
    if (!bill) throw new Error('Tagihan tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, bill.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    if (bill.status !== 'draft') throw new Error('Hanya template draft bisa dihapus')
    await db.delete(tagihan).where(eq(tagihan.id, data.id))
    return { deleted: true }
  })

// ─── Publish to Tingkat ─────────────────────────────────────────────────────

export const publishTagihanToClass = createServerFn({ method: 'POST' })
  .validator(z.object({
    tagihanId: z.string().uuid(), tingkatIds: z.array(z.string().uuid()).min(1),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const tmpl = await db.query.tagihan.findFirst({
      where: eq(tagihan.id, data.tagihanId), with: { items: true },
    })
    if (!tmpl) throw new Error('Tagihan template tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, tmpl.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    if (tmpl.status !== 'draft') throw new Error('Hanya template draft bisa diterbitkan')

    const existing = await db.query.tagihanSiswa.findMany({
      where: eq(tagihanSiswa.tagihanId, tmpl.id),
      columns: { siswaId: true },
    })
    const alreadyAssigned = new Set(existing.map((e) => e.siswaId))

    const { fetchBeasiswaMapForUnit } = await import('./beasiswa-utils.server')
    const beasiswaBySiswa = await fetchBeasiswaMapForUnit(tmpl.unitId)

    const kelasList = await db.query.kelas.findMany({
      where: and(eq(kelas.unitId, tmpl.unitId), inArray(kelas.tingkatId, data.tingkatIds)),
    })
    const kelasIds = kelasList.map((k) => k.id)
    if (kelasIds.length === 0) throw new Error('Tidak ada kelas dengan tingkat yang dipilih')

    let totalPublished = 0
    const allToInsert: any[] = []

    for (const kelasId of kelasIds) {
      const siswaList = await db.query.siswa.findMany({
        where: and(eq(siswa.unitId, tmpl.unitId), eq(siswa.kelasId, kelasId), eq(siswa.status, 'aktif')),
      })

      for (const s of siswaList) {
        if (alreadyAssigned.has(s.id)) continue
        alreadyAssigned.add(s.id)

        let diskon = 0
        let beasiswaId: string | null = null

        const b = beasiswaBySiswa.get(s.id)
        if (b) {
          beasiswaId = b.beasiswaId
          if (b.tipe === 'gratis') {
            diskon = tmpl.nominal
          } else if (b.jenisPotongan === 'persen') {
            diskon = Math.round(tmpl.nominal * b.besaran / 100)
          } else {
            diskon = b.besaran
          }
          if (diskon > tmpl.nominal) diskon = tmpl.nominal
        }

        const status = diskon >= tmpl.nominal ? 'dibebaskan' as const : 'terbit' as const

        allToInsert.push({
          tagihanId: tmpl.id, siswaId: s.id, unitId: tmpl.unitId,
          nominal: tmpl.nominal, beasiswaId, diskon,
          sudahDibayar: 0, status,
        })
        totalPublished++
      }
    }

    if (allToInsert.length === 0) throw new Error('Tidak ada siswa aktif baru di tingkat yang dipilih')

    await db.transaction(async (tx) => {
      await tx.insert(tagihanSiswa).values(allToInsert)
      await tx.update(tagihan).set({
        status: 'terbit', siswaCount: (tmpl.siswaCount || 0) + totalPublished,
        tanggalTerbit: new Date().toISOString().split('T')[0],
        updatedAt: new Date(),
      }).where(eq(tagihan.id, tmpl.id))
    })

    return { published: totalPublished }
  })

// ─── Per-Siswa List ──────────────────────────────────────────────────────────

export const getTagihanSiswaList = createServerFn({ method: 'GET' })
  .validator(z.object({
    unitId: z.string().uuid(), tagihanId: z.string().uuid().optional(),
    status: z.string().optional(), siswaId: z.string().uuid().optional(),
    search: z.string().optional(),
    page: z.number().default(1), pageSize: z.number().default(20),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
    const offset = (data.page - 1) * data.pageSize
    const conditions = [eq(tagihanSiswa.unitId, data.unitId), sql`EXISTS (SELECT 1 FROM tagihan WHERE tagihan.id = ${tagihanSiswa.tagihanId} AND tagihan.jenis = 'lainnya')`]
    if (data.tagihanId) conditions.push(eq(tagihanSiswa.tagihanId, data.tagihanId))
    if (data.status) conditions.push(eq(tagihanSiswa.status, data.status as any))
    if (data.siswaId) conditions.push(eq(tagihanSiswa.siswaId, data.siswaId))
    if (data.search) {
      conditions.push(sql`EXISTS (SELECT 1 FROM siswa WHERE siswa.id = ${tagihanSiswa.siswaId} AND (siswa.nama ILIKE ${'%' + data.search + '%'} OR siswa.nis ILIKE ${'%' + data.search + '%'}))`)
    }

    const [rows, countResult] = await Promise.all([
      db.query.tagihanSiswa.findMany({
        where: and(...conditions),
        with: { siswa: true, tagihan: { with: { items: true } }, pembayarans: true, beasiswa: true },
        limit: data.pageSize, offset,
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      }),
      db.select({ count: sql<number>`count(*)::int` }).from(tagihanSiswa).where(and(...conditions)),
    ])
    return { data: rows, total: countResult[0]?.count ?? 0, page: data.page, pageSize: data.pageSize }
  })

// ─── Bayar (unified — works for both SPP and tagihan) ────────────────────────

const BULAN_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export const bayarTagihan = createServerFn({ method: 'POST' })
  .validator(z.object({
    tagihanSiswaId: z.string().uuid(), jumlahBayar: z.number().int().positive(),
    tanggalBayar: z.string(), metode: z.enum(['tunai', 'transfer', 'qris', 'lainnya']).default('tunai'),
    buktiUrl: z.string().optional(), catatan: z.string().optional(),
    bankAccountId: z.string().uuid().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const ts = await db.query.tagihanSiswa.findFirst({
      where: eq(tagihanSiswa.id, data.tagihanSiswaId),
      with: { siswa: true },
    })
    if (!ts) throw new Error('Tagihan siswa tidak ditemukan')
    if (ts.status === 'lunas') throw new Error('Tagihan sudah lunas')
    if (ts.status === 'dibebaskan') throw new Error('Tagihan sudah dibebaskan')
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, ts.unitId, (session.user as any).isSuperAdmin)

    const totalHutang = ts.nominal - ts.diskon
    const sisa = totalHutang - ts.sudahDibayar
    if (data.jumlahBayar > sisa) throw new Error(`Jumlah bayar melebihi sisa tagihan (Rp${sisa.toLocaleString('id-ID')})`)

    // Find tagihan header to determine jenis for kas kategori
    const tagihanRecord = await db.query.tagihan.findFirst({ where: eq(tagihan.id, ts.tagihanId) })
    if (!tagihanRecord) throw new Error('Tagihan header tidak ditemukan')

    // Find or create kas kategori for this payment type
    const kategoriNama = tagihanRecord.jenis === 'spp' ? 'Penerimaan SPP' : 'Penerimaan Tagihan'
    const kategori = await ensureKategori(kategoriNama, 'pemasukan', '411281')

    // Build keterangan for kas transaksi — include student name
    const namaSiswa = ts.siswa?.nama || 'Siswa'
    let ket = `Pembayaran ${tagihanRecord.judul || (tagihanRecord.jenis === 'spp' ? `SPP ${BULAN_NAMES[tagihanRecord.bulan || 0]} ${tagihanRecord.tahun || ''}` : 'Tagihan')} - ${namaSiswa}`

    let ktRow: typeof kasTransaksi.$inferSelect | undefined
    await db.transaction(async (tx) => {
      // BUG #10 FIX: Use FOR UPDATE to prevent race condition
      const [latest] = await tx.select().from(tagihanSiswa)
        .where(eq(tagihanSiswa.id, data.tagihanSiswaId))
        .for('update')
      if (!latest) throw new Error('Tagihan siswa tidak ditemukan')
      if (latest.status === 'lunas' || latest.status === 'dibebaskan') throw new Error('Tagihan sudah dibayarkan')

      const sisaNow = (latest.nominal - latest.diskon) - latest.sudahDibayar
      if (data.jumlahBayar > sisaNow) throw new Error(`Jumlah bayar melebihi sisa tagihan (Rp${sisaNow.toLocaleString('id-ID')})`)

      const sudahDibayarBaru = latest.sudahDibayar + data.jumlahBayar
      const statusBaru = sudahDibayarBaru >= (latest.nominal - latest.diskon) ? 'lunas' : 'cicil'

      await tx.insert(pembayaran).values({
        tagihanSiswaId: data.tagihanSiswaId, jumlahBayar: data.jumlahBayar,
        tanggalBayar: data.tanggalBayar, metode: data.metode,
        buktiUrl: data.buktiUrl || null, catatan: data.catatan || null,
        createdBy: session.user.id,
      })

      await tx.update(tagihanSiswa).set({ sudahDibayar: sudahDibayarBaru, status: statusBaru, updatedAt: new Date() })
        .where(eq(tagihanSiswa.id, data.tagihanSiswaId))

      // Update tagihan header status if all students have paid
      const allSiswa = await tx.query.tagihanSiswa.findMany({
        where: eq(tagihanSiswa.tagihanId, ts.tagihanId),
        columns: { status: true },
      })
      const allPaid = allSiswa.every((s) => s.status === 'lunas' || s.status === 'dibebaskan')
      const anyCicil = allSiswa.some((s) => s.status === 'cicil')
      const headerStatus = allPaid ? 'lunas' : anyCicil ? 'cicil' : 'terbit'
      await tx.update(tagihan).set({ status: headerStatus as any, updatedAt: new Date() })
        .where(eq(tagihan.id, ts.tagihanId))

      const [row] = await tx.insert(kasTransaksi).values({
        unitId: ts.unitId, kategoriId: kategori.id,
        tipe: 'pemasukan', refType: tagihanRecord.jenis === 'spp' ? 'spp' : 'kas',
        refId: ts.id,
        jumlah: data.jumlahBayar,
        keterangan: ket, tanggal: data.tanggalBayar,
        referensi: `${tagihanRecord.jenis === 'spp' ? 'spp' : 'tagihan'}/${ts.id}`,
        bankAccountId: data.bankAccountId || null,
        createdBy: session.user.id,
      }).returning()
      ktRow = row

      // Update bank balance if linked
      if (data.bankAccountId) {
        await tx.update(bankAccount)
          .set({ saldo: sql`${bankAccount.saldo} + ${data.jumlahBayar}`, updatedAt: new Date() })
          .where(eq(bankAccount.id, data.bankAccountId))
      }
    })

    // Generate journal entry for this payment
    try {
      await generateJurnalKas(
        ts.unitId, 'pemasukan', data.jumlahBayar,
        kategori.id, null, data.tanggalBayar,
        `${tagihanRecord.jenis === 'spp' ? 'spp' : 'tagihan'}/${ts.id}`,
        ket, session.user.id, ktRow!.id,
      )
    } catch (e) { console.error('Journal generation failed for tagihan payment:', e) }

    return { success: true }
  })

// ─── Tingkat List ─────────────────────────────────────────────────────────────

export const getTingkatList = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
    return db.query.tingkat.findMany({ where: eq(tingkat.unitId, data.unitId), orderBy: (t, { asc }) => [asc(t.urutan), asc(t.nama)] })
  })

// ─── Detail Per-Siswa ─────────────────────────────────────────────────────────

export const getTagihanSiswaDetail = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const ts = await db.query.tagihanSiswa.findFirst({
      where: eq(tagihanSiswa.id, data.id),
      with: {
        siswa: { with: { kelasRef: { with: { tingkatRef: true } } } },
        tagihan: { with: { items: true } },
        pembayarans: true, beasiswa: true,
      },
    })
    if (!ts) throw new Error('Tagihan tidak ditemukan')
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, ts.unitId, (session.user as any).isSuperAdmin)
    return ts
  })

// ─── Ringkasan ───────────────────────────────────────────────────────────────

export const getRingkasanTagihan = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)

    const [result] = await db.select({
      total: sql<number>`count(*)::int`,
      terbit: sql<number>`count(*) FILTER (WHERE ${tagihanSiswa.status} = 'terbit')::int`,
      cicil: sql<number>`count(*) FILTER (WHERE ${tagihanSiswa.status} = 'cicil')::int`,
      totalNominal: sql<number>`coalesce(sum(${tagihanSiswa.nominal})::bigint, 0)`,
      totalDiskon: sql<number>`coalesce(sum(${tagihanSiswa.diskon})::bigint, 0)`,
      totalTerkumpul: sql<number>`coalesce(sum(${tagihanSiswa.sudahDibayar})::bigint, 0)`,
      totalSisa: sql<number>`coalesce(sum(${tagihanSiswa.nominal} - ${tagihanSiswa.diskon} - ${tagihanSiswa.sudahDibayar})::bigint, 0)`,
    }).from(tagihanSiswa).where(
      and(
        eq(tagihanSiswa.unitId, data.unitId),
        sql`EXISTS (SELECT 1 FROM tagihan WHERE tagihan.id = ${tagihanSiswa.tagihanId} AND tagihan.jenis = 'lainnya' AND tagihan.status IN ('terbit', 'cicil'))`,
      ),
    )

    return result || { total: 0, terbit: 0, cicil: 0, totalNominal: 0, totalDiskon: 0, totalTerkumpul: 0, totalSisa: 0 }
  })
