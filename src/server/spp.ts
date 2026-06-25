import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, eq, sql, inArray } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { siswa, sppSetting, tagihan, tagihanItem, tagihanSiswa } from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { BULAN_NAMES } from '#/lib/format'
import { getRequest } from '@tanstack/react-start/server'
import { resolveYayasanUnitIds } from './keuangan-utils.server'

async function getSessionOrThrow() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request!.headers })
  if (!session?.user) throw new Error('Unauthenticated')
  return session
}

// ─── SPP Setting CRUD ────────────────────────────────────────────────────────

export const getSppSettingList = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
    return db.query.sppSetting.findMany({
      where: eq(sppSetting.unitId, data.unitId),
      with: { tingkatRef: true },
      orderBy: (s, { asc }) => [asc(s.tingkatId)],
    })
  })

export const checkSppSettingExists = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string().uuid(), tahunAjaran: z.string().min(1) }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
    const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(sppSetting)
      .where(and(eq(sppSetting.unitId, data.unitId), eq(sppSetting.tahunAjaran, data.tahunAjaran)))
    return (result?.count ?? 0) > 0
  })

export const createSppSetting = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(), tingkatId: z.string().uuid(),
    nominal: z.number().int().positive(), tahunAjaran: z.string().min(1),
    keterangan: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    const [r] = await db.insert(sppSetting).values(data).returning()
    return r
  })

export const updateSppSetting = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string().uuid(), tingkatId: z.string().uuid().optional(),
    nominal: z.number().int().positive().optional(),
    tahunAjaran: z.string().min(1).optional(), keterangan: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.sppSetting.findFirst({ where: eq(sppSetting.id, data.id) })
    if (!existing) throw new Error('Setting tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    const upd: any = { updatedAt: new Date() }
    if (data.tingkatId !== undefined) upd.tingkatId = data.tingkatId
    if (data.nominal !== undefined) upd.nominal = data.nominal
    if (data.tahunAjaran !== undefined) upd.tahunAjaran = data.tahunAjaran
    if (data.keterangan !== undefined) upd.keterangan = data.keterangan
    const [r] = await db.update(sppSetting).set(upd).where(eq(sppSetting.id, data.id)).returning()
    return r
  })

export const deleteSppSetting = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.sppSetting.findFirst({ where: eq(sppSetting.id, data.id) })
    if (!existing) throw new Error('Setting tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    await db.delete(sppSetting).where(eq(sppSetting.id, data.id))
    return { deleted: true }
  })

// ─── Generate SPP Bulanan ────────────────────────────────────────────────────

export const generateSPP = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(), bulan: z.number().int().min(1).max(12),
    tahun: z.number().int().min(2000), dueDate: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const tahunAjaranNama = `${data.tahun}/${data.tahun + 1}`
    const [settingCount] = await db.select({ count: sql<number>`count(*)::int` }).from(sppSetting)
      .where(and(eq(sppSetting.unitId, data.unitId), eq(sppSetting.tahunAjaran, tahunAjaranNama)))
    if ((settingCount?.count ?? 0) === 0) {
      throw new Error(`Belum ada setting SPP untuk tahun ajaran ${tahunAjaranNama}. Tambah setting di tab Setting terlebih dahulu.`)
    }

    const siswaAktif = await db.query.siswa.findMany({
      where: and(eq(siswa.unitId, data.unitId), eq(siswa.status, 'aktif')),
      with: { kelasRef: { with: { tingkatRef: true } } },
    })

    const settings = await db.query.sppSetting.findMany({
      where: eq(sppSetting.unitId, data.unitId),
    })
    const settingByTingkat = Object.fromEntries(settings.map((s) => [s.tingkatId, s.nominal]))

    const existing = await db.query.tagihanSiswa.findMany({
      where: and(
        eq(tagihanSiswa.unitId, data.unitId),
        sql`EXISTS (SELECT 1 FROM tagihan WHERE tagihan.id = ${tagihanSiswa.tagihanId} AND tagihan.jenis = 'spp' AND tagihan.bulan = ${data.bulan} AND tagihan.tahun = ${data.tahun})`,
      ),
    })
    const existingSiswaIds = new Set(existing.map((t) => t.siswaId))
    const newSiswa = siswaAktif.filter((s) => !existingSiswaIds.has(s.id))

    if (newSiswa.length === 0) return { generated: 0, skipped: existingSiswaIds.size, missingSetting: 0 }

    const { fetchBeasiswaMapForUnit } = await import('./beasiswa-utils.server')
    const beasiswaBySiswa = await fetchBeasiswaMapForUnit(data.unitId)

    const judul = `SPP ${BULAN_NAMES[data.bulan]} ${data.tahun}`

    let missingSetting = 0
    const perSiswa = newSiswa.map((s) => {
      const tingkatId = s.kelasRef?.tingkatId || ''
      const nominal = settingByTingkat[tingkatId] ?? 0
      if (!nominal && !settingByTingkat[tingkatId]) missingSetting++
      let diskon = 0
      let beasiswaId: string | null = null

      const b = beasiswaBySiswa.get(s.id)
      if (b) {
        beasiswaId = b.beasiswaId
        if (b.tipe === 'gratis') {
          diskon = nominal
        } else if (b.jenisPotongan === 'persen') {
          diskon = Math.round(nominal * b.besaran / 100)
        } else {
          diskon = b.besaran
        }
        if (diskon > nominal) diskon = nominal
      }

      const status = diskon >= nominal ? 'dibebaskan' as const : 'terbit' as const

      return { siswaId: s.id, nominal, diskon, beasiswaId, status }
    })

    await db.transaction(async (tx) => {
      const [tmpl] = await tx.insert(tagihan).values({
        unitId: data.unitId, jenis: 'spp', judul,
        tahunAjaran: tahunAjaranNama, bulan: data.bulan, tahun: data.tahun,
        nominal: perSiswa.reduce((s, p) => s + p.nominal, 0),
        status: 'terbit', tanggalTerbit: new Date().toISOString().split('T')[0],
        dueDate: data.dueDate || null, siswaCount: perSiswa.length,
      }).returning()

      await tx.insert(tagihanItem).values({
        tagihanId: tmpl.id, nama: `SPP ${BULAN_NAMES[data.bulan]} ${data.tahun}`,
        qty: 1, hargaSatuan: perSiswa[0]?.nominal || 0, diskon: 0,
        subtotal: perSiswa[0]?.nominal || 0,
      })

      await tx.insert(tagihanSiswa).values(perSiswa.map((p) => ({
        tagihanId: tmpl.id, siswaId: p.siswaId, unitId: data.unitId,
        nominal: p.nominal, diskon: p.diskon, beasiswaId: p.beasiswaId,
        sudahDibayar: 0, status: p.status,
      })))
    })

    return { generated: perSiswa.length, skipped: existingSiswaIds.size, missingSetting }
  })

// ─── Get SPP Tagihan List ────────────────────────────────────────────────────

export const getSppTagihanList = createServerFn({ method: 'GET' })
  .validator(z.object({
    unitId: z.string().uuid(), bulan: z.number().int().min(0).max(12).optional(),
    tahun: z.number().int().min(2000).optional(),
    status: z.enum(['terbit', 'cicil', 'lunas', 'dibebaskan']).optional(),
    search: z.string().optional(),
    page: z.number().default(1), pageSize: z.number().default(20),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)

    const { unitId, bulan, tahun, status, search, page, pageSize } = data
    const offset = (page - 1) * pageSize

    const conditions = [eq(tagihanSiswa.unitId, unitId), sql`EXISTS (SELECT 1 FROM tagihan WHERE tagihan.id = ${tagihanSiswa.tagihanId} AND tagihan.jenis = 'spp')`]
    if (bulan && bulan > 0) conditions.push(sql`EXISTS (SELECT 1 FROM tagihan WHERE tagihan.id = ${tagihanSiswa.tagihanId} AND tagihan.bulan = ${bulan})`)
    if (tahun) conditions.push(sql`EXISTS (SELECT 1 FROM tagihan WHERE tagihan.id = ${tagihanSiswa.tagihanId} AND tagihan.tahun = ${tahun})`)
    if (status) conditions.push(eq(tagihanSiswa.status, status))
    if (search) {
      conditions.push(sql`EXISTS (SELECT 1 FROM siswa WHERE siswa.id = ${tagihanSiswa.siswaId} AND (siswa.nama ILIKE ${'%' + search + '%'} OR siswa.nis ILIKE ${'%' + search + '%'}))`)
    }

    const [rows, countResult] = await Promise.all([
      db.query.tagihanSiswa.findMany({
        where: and(...conditions),
        with: { siswa: { with: { kelasRef: { with: { tingkatRef: true } } } }, tagihan: { with: { items: true } }, pembayarans: true, beasiswa: true },
        limit: pageSize, offset,
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      }),
      db.select({ count: sql<number>`count(*)::int` }).from(tagihanSiswa).where(and(...conditions)),
    ])

    return { data: rows, total: countResult[0]?.count ?? 0, page, pageSize }
  })

// ─── Delete SPP Tagihan (per-siswa row) ──────────────────────────────────────

export const deleteSppTagihan = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const ts = await db.query.tagihanSiswa.findFirst({ where: eq(tagihanSiswa.id, data.id), with: { pembayarans: true } })
    if (!ts) throw new Error('Tagihan tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, ts.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    if (ts.status === 'lunas') throw new Error('Tagihan sudah lunas, tidak bisa dihapus')
    if (ts.sudahDibayar > 0) throw new Error('Tagihan sudah ada pembayaran, tidak bisa dihapus')

    await db.transaction(async (tx) => {
      await tx.delete(tagihanSiswa).where(eq(tagihanSiswa.id, data.id))
    })
    return { deleted: true }
  })

// ─── Delete SPP Bulan (entire generation) ────────────────────────────────────

export const deleteSppBulan = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(), bulan: z.number().int().min(1).max(12),
    tahun: z.number().int().min(2000),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const rows = await db.query.tagihanSiswa.findMany({
      where: and(
        eq(tagihanSiswa.unitId, data.unitId),
        sql`EXISTS (SELECT 1 FROM tagihan WHERE tagihan.id = ${tagihanSiswa.tagihanId} AND tagihan.jenis = 'spp' AND tagihan.bulan = ${data.bulan} AND tagihan.tahun = ${data.tahun})`,
      ),
      with: { pembayarans: true },
    })

    const paid = rows.filter((r) => r.sudahDibayar > 0)
    if (paid.length > 0) throw new Error(`${paid.length} tagihan sudah memiliki pembayaran, hapus dibatalkan`)

    if (rows.length === 0) throw new Error('Tidak ada tagihan SPP untuk bulan dan tahun ini')

    const tagihanIds = [...new Set(rows.map((r) => r.tagihanId))]
    await db.transaction(async (tx) => {
      for (const tid of tagihanIds) {
        await tx.delete(tagihan).where(eq(tagihan.id, tid))
      }
    })

    return { deleted: rows.length }
  })

// ─── Ringkasan SPP ───────────────────────────────────────────────────────────

export const getRingkasanSPP = createServerFn({ method: 'GET' })
  .validator(z.object({
    unitId: z.string(),
    bulan: z.number().int().min(1).max(12),
    tahun: z.number().int().min(2000),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    let unitCondition
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await resolveYayasanUnitIds(session.user.id)
      unitCondition = inArray(tagihanSiswa.unitId, unitIds)
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      unitCondition = eq(tagihanSiswa.unitId, data.unitId)
    }

    const [result] = await db.select({
      total: sql<number>`count(*)::int`,
      lunas: sql<number>`count(*) FILTER (WHERE ${tagihanSiswa.status} = 'lunas')::int`,
      cicil: sql<number>`count(*) FILTER (WHERE ${tagihanSiswa.status} = 'cicil')::int`,
      terbit: sql<number>`count(*) FILTER (WHERE ${tagihanSiswa.status} = 'terbit')::int`,
      dibebaskan: sql<number>`count(*) FILTER (WHERE ${tagihanSiswa.status} = 'dibebaskan')::int`,
      totalNominal: sql<number>`coalesce(sum(${tagihanSiswa.nominal})::bigint, 0)`,
      totalTerkumpul: sql<number>`coalesce(sum(${tagihanSiswa.sudahDibayar})::bigint, 0)`,
    }).from(tagihanSiswa).where(
      and(
        unitCondition,
        sql`EXISTS (SELECT 1 FROM tagihan WHERE tagihan.id = ${tagihanSiswa.tagihanId} AND tagihan.jenis = 'spp' AND tagihan.bulan = ${data.bulan} AND tagihan.tahun = ${data.tahun})`,
      ),
    )

    return result || { total: 0, lunas: 0, cicil: 0, terbit: 0, dibebaskan: 0, totalNominal: 0, totalTerkumpul: 0 }
  })

// ─── Detail SPP (per-siswa) ─────────────────────────────────────────────────

export const getSppDetail = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const ts = await db.query.tagihanSiswa.findFirst({
      where: eq(tagihanSiswa.id, data.id),
      with: { siswa: { with: { kelasRef: { with: { tingkatRef: true } } } }, tagihan: true, pembayarans: true, beasiswa: true },
    })
    if (!ts) throw new Error('Tagihan tidak ditemukan')
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, ts.unitId, (session.user as any).isSuperAdmin)
    return ts
  })

// ─── Laporan ─────────────────────────────────────────────────────────────────

export type LaporanByKelasItem = {
  kelasId: string
  kelasNama: string
  tingkatNama: string | null
  totalSiswa: number
  totalNominal: number
  totalDiskon: number
  totalTerkumpul: number
  totalSisa: number
  lunas: number
  cicil: number
  terbit: number
  dibebaskan: number
}

export const getLaporanByKelas = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string().uuid(), bulan: z.number().int().min(1).max(12), tahun: z.number().int().min(2000) }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)

    const rows = await db.query.tagihanSiswa.findMany({
      where: and(
        eq(tagihanSiswa.unitId, data.unitId),
        sql`EXISTS (SELECT 1 FROM tagihan WHERE tagihan.id = ${tagihanSiswa.tagihanId} AND tagihan.jenis = 'spp' AND tagihan.bulan = ${data.bulan} AND tagihan.tahun = ${data.tahun})`,
      ),
      with: { siswa: { with: { kelasRef: { with: { tingkatRef: true } } } } },
    })

    const byKelas: Record<string, LaporanByKelasItem> = {}
    for (const r of rows) {
      const kelasRef = r.siswa?.kelasRef
      const key = kelasRef?.id || 'tanpa-kelas'
      if (!byKelas[key]) {
        byKelas[key] = {
          kelasId: key, kelasNama: kelasRef?.nama || 'Tanpa Kelas',
          tingkatNama: kelasRef?.tingkatRef?.nama || null,
          totalSiswa: 0, totalNominal: 0, totalDiskon: 0,
          totalTerkumpul: 0, totalSisa: 0,
          lunas: 0, cicil: 0, terbit: 0, dibebaskan: 0,
        }
      }
      byKelas[key].totalSiswa++
      byKelas[key].totalNominal += r.nominal
      byKelas[key].totalDiskon += r.diskon
      byKelas[key].totalTerkumpul += r.sudahDibayar
      byKelas[key].totalSisa += r.nominal - r.diskon - r.sudahDibayar
      byKelas[key][r.status as keyof LaporanByKelasItem]++
    }

    return Object.values(byKelas).sort((a, b) => (a.tingkatNama || '').localeCompare(b.tingkatNama || '') || a.kelasNama.localeCompare(b.kelasNama))
  })

export type LaporanSummary = {
  totalSiswa: number
  totalNominal: number
  totalDiskon: number
  totalTerkumpul: number
  totalSisa: number
  terbit: number
  cicil: number
  lunas: number
  dibebaskan: number
}

export const getLaporanSummary = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string().uuid(), bulan: z.number().int().min(1).max(12), tahun: z.number().int().min(2000) }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)

    const rows = await db.query.tagihanSiswa.findMany({
      where: and(
        eq(tagihanSiswa.unitId, data.unitId),
        sql`EXISTS (SELECT 1 FROM tagihan WHERE tagihan.id = ${tagihanSiswa.tagihanId} AND tagihan.jenis = 'spp' AND tagihan.bulan = ${data.bulan} AND tagihan.tahun = ${data.tahun})`,
      ),
    })

    const result: LaporanSummary = {
      totalSiswa: rows.length, totalNominal: 0, totalDiskon: 0,
      totalTerkumpul: 0, totalSisa: 0,
      terbit: 0, cicil: 0, lunas: 0, dibebaskan: 0,
    }

    for (const r of rows) {
      result.totalNominal += r.nominal
      result.totalDiskon += r.diskon
      result.totalTerkumpul += r.sudahDibayar
      result.totalSisa += r.nominal - r.diskon - r.sudahDibayar
      result[r.status as keyof LaporanSummary]++
    }

    return result
  })

export type DetailSiswaItem = {
  siswaId: string; nama: string; nis: string
  kelasId: string; kelasNama: string; tingkatNama: string | null
  nominal: number; diskon: number; sudahDibayar: number; sisa: number; status: string
}

export const getLaporanDetailSiswa = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string().uuid(), bulan: z.number().int().min(1).max(12), tahun: z.number().int().min(2000) }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)

    const rows = await db.query.tagihanSiswa.findMany({
      where: and(
        eq(tagihanSiswa.unitId, data.unitId),
        sql`EXISTS (SELECT 1 FROM tagihan WHERE tagihan.id = ${tagihanSiswa.tagihanId} AND tagihan.jenis = 'spp' AND tagihan.bulan = ${data.bulan} AND tagihan.tahun = ${data.tahun})`,
      ),
      with: { siswa: { with: { kelasRef: { with: { tingkatRef: true } } } } },
    })

    const byKelompok: Record<string, { tingkatId: string; tingkatNama: string | null; kelasGroups: Record<string, { kelasId: string; kelasNama: string; siswa: DetailSiswaItem[] }> }> = {}
    for (const r of rows) {
      const kelasRef = r.siswa?.kelasRef
      const tingkatNama = kelasRef?.tingkatRef?.nama || null
      const tKey = tingkatNama || 'tanpa-tingkat'
      if (!byKelompok[tKey]) {
        byKelompok[tKey] = { tingkatId: tKey, tingkatNama: tingkatNama, kelasGroups: {} }
      }
      const kId = kelasRef?.id || 'tanpa-kelas'
      if (!byKelompok[tKey].kelasGroups[kId]) {
        byKelompok[tKey].kelasGroups[kId] = { kelasId: kId, kelasNama: kelasRef?.nama || 'Tanpa Kelas', siswa: [] }
      }
      byKelompok[tKey].kelasGroups[kId].siswa.push({
        siswaId: r.siswaId,
        nama: r.siswa?.nama || '-',
        nis: r.siswa?.nis || '',
        kelasId: kId,
        kelasNama: kelasRef?.nama || 'Tanpa Kelas',
        tingkatNama: tingkatNama,
        nominal: r.nominal,
        diskon: r.diskon,
        sudahDibayar: r.sudahDibayar,
        sisa: r.nominal - r.diskon - r.sudahDibayar,
        status: r.status,
      })
    }

    return Object.values(byKelompok)
      .sort((a, b) => (a.tingkatNama || '').localeCompare(b.tingkatNama || ''))
      .map((t) => ({
        tingkatId: t.tingkatId,
        tingkatNama: t.tingkatNama,
        kelasGroups: Object.values(t.kelasGroups).sort((a, b) => a.kelasNama.localeCompare(b.kelasNama)),
      }))
  })
