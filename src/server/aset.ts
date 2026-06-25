import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, eq, not, sql, inArray } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { asetTetap } from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'
import { resolveYayasanUnitIds } from './keuangan-utils.server'

async function getSessionOrThrow() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request!.headers })
  if (!session?.user) throw new Error('Unauthenticated')
  return session
}

export const AsetSchema = z.object({
  unitId: z.string().uuid(),
  kodeAset: z.string().optional(),
  nama: z.string().min(1, 'Nama aset wajib diisi'),
  kategori: z.enum(['tanah', 'gedung', 'kendaraan', 'peralatan', 'inventaris', 'lainnya']).default('lainnya'),
  tanggalPerolehan: z.string().min(1),
  hargaPerolehan: z.number().int().positive(),
  masaManfaat: z.number().int().positive().optional(),
  metodePenyusutan: z.enum(['garis_lurus', 'saldo_menurun']).default('garis_lurus'),
  nilaiResidu: z.number().int().default(0),
  lokasi: z.string().optional(),
  keterangan: z.string().optional(),
  status: z.enum(['aktif', 'dijual', 'dihapuskan']).default('aktif'),
})

export const getAsetList = createServerFn({ method: 'GET' })
  .validator(z.object({
    unitId: z.string(), kategori: z.string().optional(),
    status: z.string().optional(), search: z.string().optional(),
    page: z.number().default(1), pageSize: z.number().default(20),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    let conditions: any[]
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await resolveYayasanUnitIds(session.user.id)
      conditions = [inArray(asetTetap.unitId, unitIds)]
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      conditions = [eq(asetTetap.unitId, data.unitId)]
    }
    if (!data.status) conditions.push(not(eq(asetTetap.status, 'dihapuskan')))
    if (data.kategori) conditions.push(eq(asetTetap.kategori, data.kategori as any))
    if (data.status) conditions.push(eq(asetTetap.status, data.status as any))
    if (data.search) conditions.push(sql`(${asetTetap.nama} ILIKE ${'%' + data.search + '%'} OR ${asetTetap.kodeAset} ILIKE ${'%' + data.search + '%'})`)

    const offset = (data.page - 1) * data.pageSize
    const [rows, countResult] = await Promise.all([
      db.query.asetTetap.findMany({
        where: and(...conditions),
        with: { unit: true },
        limit: data.pageSize, offset,
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      }),
      db.select({ count: sql<number>`count(*)::int` }).from(asetTetap).where(and(...conditions)),
    ])
    return { data: rows, total: countResult[0]?.count ?? 0 }
  })

export const getAsetById = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const row = await db.query.asetTetap.findFirst({ where: eq(asetTetap.id, data.id) })
    if (!row) throw new Error('Aset tidak ditemukan')
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, row.unitId, (session.user as any).isSuperAdmin)
    return row
  })

export const createAset = createServerFn({ method: 'POST' })
  .validator(AsetSchema)
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    const [created] = await db.insert(asetTetap).values(data).returning()
    return created
  })

export const updateAset = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid(), data: AsetSchema.partial() }))
  .handler(async ({ data: { id, data: updates } }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.asetTetap.findFirst({ where: eq(asetTetap.id, id) })
    if (!existing) throw new Error('Aset tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    const [updated] = await db.update(asetTetap).set({ ...updates, updatedAt: new Date() }).where(eq(asetTetap.id, id)).returning()
    return updated
  })

export const deleteAset = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.asetTetap.findFirst({ where: eq(asetTetap.id, data.id) })
    if (!existing) throw new Error('Aset tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    await db.update(asetTetap).set({ status: 'dihapuskan', updatedAt: new Date() }).where(eq(asetTetap.id, data.id))
    return { deleted: true }
  })

// ─── Ringkasan ──────────────────────────────────────────────────────────────

export const getRingkasanAset = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    let unitCondition
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await resolveYayasanUnitIds(session.user.id)
      unitCondition = inArray(asetTetap.unitId, unitIds)
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      unitCondition = eq(asetTetap.unitId, data.unitId)
    }

    const rows = await db.query.asetTetap.findMany({ where: and(unitCondition, not(eq(asetTetap.status, 'dihapuskan'))) })

    const byKategori: Record<string, { total: number; count: number; penyusutan: number; nilaiBuku: number }> = {}
    let totalHarga = 0, totalPenyusutan = 0, totalNilaiBuku = 0

    for (const r of rows) {
      const kat = r.kategori
      if (!byKategori[kat]) byKategori[kat] = { total: 0, count: 0, penyusutan: 0, nilaiBuku: 0 }
      byKategori[kat].total += r.hargaPerolehan
      byKategori[kat].count++
      byKategori[kat].penyusutan += r.akumulasiPenyusutan
      byKategori[kat].nilaiBuku += r.hargaPerolehan - r.akumulasiPenyusutan

      if (r.status === 'aktif') {
        totalHarga += r.hargaPerolehan
        totalPenyusutan += r.akumulasiPenyusutan
        totalNilaiBuku += r.hargaPerolehan - r.akumulasiPenyusutan
      }
    }

    return { byKategori, totalHarga, totalPenyusutan, totalNilaiBuku, totalAset: rows.length }
  })

// ─── Laporan Coretax ────────────────────────────────────────────────────────

export type LaporanAsetItem = {
  id: string
  kodeAset: string | null
  nama: string
  kategori: string
  tanggalPerolehan: string
  hargaPerolehan: number
  masaManfaat: number | null
  metodePenyusutan: string | null
  akumulasiPenyusutan: number
  penyusutanTahunIni: number
  nilaiBuku: number
  status: string
}

export const getLaporanAsetCoretax = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string(), tahunPajak: z.number().int().default(new Date().getFullYear()) }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    let unitCondition
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await resolveYayasanUnitIds(session.user.id)
      unitCondition = inArray(asetTetap.unitId, unitIds)
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      unitCondition = eq(asetTetap.unitId, data.unitId)
    }

    const rows = await db.query.asetTetap.findMany({ where: and(unitCondition, eq(asetTetap.status, 'aktif')) })

    const items: LaporanAsetItem[] = rows.map((r) => {
      const tahunPerolehan = parseInt(r.tanggalPerolehan?.slice(0, 4) || '0')
      const tahunBerjalan = data.tahunPajak
      const tahunKe = Math.max(0, tahunBerjalan - tahunPerolehan)

      let penyusutanTahunan = 0
      if (r.masaManfaat && r.masaManfaat > 0) {
        if (r.metodePenyusutan === 'saldo_menurun') {
          const nbAwal = r.hargaPerolehan - (r.akumulasiPenyusutan || 0)
          penyusutanTahunan = Math.round(nbAwal * (2 / r.masaManfaat))
        } else {
          penyusutanTahunan = Math.round((r.hargaPerolehan - (r.nilaiResidu || 0)) / r.masaManfaat)
        }
      }

      const akumSebelum = Math.min(r.akumulasiPenyusutan || 0, r.hargaPerolehan - (r.nilaiResidu || 0))
      const penyusutanTahunIni = tahunKe >= 0 ? penyusutanTahunan : 0
      const akumTotal = Math.min(akumSebelum + penyusutanTahunIni, r.hargaPerolehan - (r.nilaiResidu || 0))

      return {
        id: r.id, kodeAset: r.kodeAset, nama: r.nama,
        kategori: r.kategori, tanggalPerolehan: r.tanggalPerolehan,
        hargaPerolehan: r.hargaPerolehan, masaManfaat: r.masaManfaat,
        metodePenyusutan: r.metodePenyusutan,
        akumulasiPenyusutan: akumSebelum,
        penyusutanTahunIni,
        nilaiBuku: r.hargaPerolehan - akumTotal,
        status: r.status,
      }
    })

    const totalPerolehan = items.reduce((s, i) => s + i.hargaPerolehan, 0)
    const totalAkum = items.reduce((s, i) => s + i.akumulasiPenyusutan, 0)
    const totalPenyusutanTahunIni = items.reduce((s, i) => s + i.penyusutanTahunIni, 0)
    const totalNilaiBuku = items.reduce((s, i) => s + i.nilaiBuku, 0)

    return { items, totalPerolehan, totalAkum, totalPenyusutanTahunIni, totalNilaiBuku, tahunPajak: data.tahunPajak }
  })
