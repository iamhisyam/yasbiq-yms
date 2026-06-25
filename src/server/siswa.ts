/**
 * Server Functions: Siswa
 * CRUD operations untuk data siswa
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, eq, ilike, sql, inArray } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { siswa, wali, tagihanSiswa } from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'
import { resolveYayasanUnitIds } from './keuangan-utils.server'

// ─── Validation Schemas ───────────────────────────────────────────────────────

export const SiswaSchema = z.object({
  unitId: z.string().uuid(),
  nis: z.string().min(1, 'NIS wajib diisi'),
  nama: z.string().min(2, 'Nama minimal 2 karakter'),
  kelasId: z.string().uuid().nullable().optional(),
  jenisKelamin: z.enum(['L', 'P']).optional(),
  tanggalLahir: z.string().optional(),
  alamat: z.string().optional(),
  tahunMasuk: z.number().int().min(2000).max(2099),
  status: z
    .enum(['aktif', 'nonaktif', 'lulus', 'pindah', 'dikeluarkan'])
    .default('aktif'),
  keterangan: z.string().optional(),
})

export const SiswaFilterSchema = z.object({
  unitId: z.string(),
  search: z.string().optional(),
  kelasId: z.string().uuid().optional(),
  status: z.enum(['aktif', 'nonaktif', 'lulus', 'pindah', 'dikeluarkan']).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
})

// ─── Helper: Get Session ──────────────────────────────────────────────────────

async function getSessionOrThrow() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request!.headers })
  if (!session?.user) throw new Error('Unauthenticated: silakan login terlebih dahulu')
  return session
}

// ─── Server Functions ─────────────────────────────────────────────────────────

export const getSiswaList = createServerFn({ method: 'GET' })
  .validator(SiswaFilterSchema)
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    let conditions: any[]
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await resolveYayasanUnitIds(session.user.id)
      conditions = [inArray(siswa.unitId, unitIds)]
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      conditions = [eq(siswa.unitId, data.unitId)]
    }

    const { search, kelasId, status, page, pageSize } = data
    const offset = (page - 1) * pageSize
    if (search) conditions.push(ilike(siswa.nama, `%${search}%`))
    if (kelasId) conditions.push(eq(siswa.kelasId, kelasId))
    if (status) conditions.push(eq(siswa.status, status))

    const [rows, countResult] = await Promise.all([
      db.query.siswa.findMany({
        where: and(...conditions),
        with: { walis: true, kelasRef: true },
        limit: pageSize,
        offset,
        orderBy: (s, { asc }) => [asc(s.nama)],
      }),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(siswa)
        .where(and(...conditions)),
    ])

    return {
      data: rows,
      total: countResult[0]?.count ?? 0,
      page,
      pageSize,
    }
  })

export const getSiswaById = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    const result = await db.query.siswa.findFirst({
      where: eq(siswa.id, data.id),
      with: { walis: true, unit: true, kelasRef: true },
    })
    if (!result) throw new Error('Siswa tidak ditemukan')

    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(
      session.user.id,
      result.unitId,
      (session.user as any).isSuperAdmin,
    )

    return result
  })

export const createSiswa = createServerFn({ method: 'POST' })
  .validator(SiswaSchema)
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(
      session.user.id,
      data.unitId,
      'admin_yayasan',
      (session.user as any).isSuperAdmin,
    )

    const [created] = await db.insert(siswa).values(data).returning()
    return created
  })

export const updateSiswa = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid(), data: SiswaSchema.partial() }))
  .handler(async ({ data: { id, data: updates } }) => {
    const session = await getSessionOrThrow()

    const existing = await db.query.siswa.findFirst({ where: eq(siswa.id, id) })
    if (!existing) throw new Error('Siswa tidak ditemukan')

    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(
      session.user.id,
      existing.unitId,
      'admin_yayasan',
      (session.user as any).isSuperAdmin,
    )

    const [updated] = await db
      .update(siswa)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(siswa.id, id))
      .returning()

    return updated
  })

export const deleteSiswa = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    const existing = await db.query.siswa.findFirst({
      where: eq(siswa.id, data.id),
    })
    if (!existing) throw new Error('Siswa tidak ditemukan')

    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(
      session.user.id,
      existing.unitId,
      'admin_yayasan',
      (session.user as any).isSuperAdmin,
    )

    // Soft delete: ubah status ke nonaktif
    const [updated] = await db
      .update(siswa)
      .set({ status: 'nonaktif', updatedAt: new Date() })
      .where(eq(siswa.id, data.id))
      .returning()

    return updated
  })

// ─── Detail Siswa ────────────────────────────────────────────────────────────

export const getSiswaDetail = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const result = await db.query.siswa.findFirst({
      where: eq(siswa.id, data.id),
      with: {
        walis: true, unit: true,
        kelasRef: { with: { tingkatRef: true, waliKelas: true } },
      },
    })
    if (!result) throw new Error('Siswa tidak ditemukan')
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, result.unitId, (session.user as any).isSuperAdmin)
    return result
  })

export const getSiswaSppList = createServerFn({ method: 'GET' })
  .validator(z.object({ siswaId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const sw = await db.query.siswa.findFirst({ where: eq(siswa.id, data.siswaId), columns: { unitId: true } })
    if (!sw) throw new Error('Siswa tidak ditemukan')
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, sw.unitId, (session.user as any).isSuperAdmin)
    return db.query.tagihanSiswa.findMany({
      where: and(eq(tagihanSiswa.siswaId, data.siswaId), sql`EXISTS (SELECT 1 FROM tagihan WHERE tagihan.id = ${tagihanSiswa.tagihanId} AND tagihan.jenis = 'spp')`),
      with: { tagihan: true, pembayarans: true, beasiswa: true },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: 12,
    })
  })

export const getSiswaTagihanList = createServerFn({ method: 'GET' })
  .validator(z.object({ siswaId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const sw = await db.query.siswa.findFirst({ where: eq(siswa.id, data.siswaId), columns: { unitId: true } })
    if (!sw) throw new Error('Siswa tidak ditemukan')
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, sw.unitId, (session.user as any).isSuperAdmin)
    return db.query.tagihanSiswa.findMany({
      where: and(eq(tagihanSiswa.siswaId, data.siswaId), sql`EXISTS (SELECT 1 FROM tagihan WHERE tagihan.id = ${tagihanSiswa.tagihanId} AND tagihan.jenis = 'lainnya')`),
      with: { tagihan: { with: { items: true } }, pembayarans: true, beasiswa: true },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: 12,
    })
  })

// ─── Wali ────────────────────────────────────────────────────────────────────

export const createWali = createServerFn({ method: 'POST' })
  .validator(z.object({
    siswaId: z.string().uuid(),
    nama: z.string().min(1, 'Nama wajib diisi'),
    hubungan: z.enum(['ayah', 'ibu', 'wali', 'kakek', 'nenek', 'lainnya']).default('ayah'),
    telepon: z.string().optional(),
    email: z.string().optional(),
    pekerjaan: z.string().optional(),
    alamat: z.string().optional(),
    isPrimary: z.boolean().default(false),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const sw = await db.query.siswa.findFirst({ where: eq(siswa.id, data.siswaId) })
    if (!sw) throw new Error('Siswa tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, sw.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    const [created] = await db.insert(wali).values(data).returning()
    return created
  })

export const deleteWali = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const w = await db.query.wali.findFirst({ where: eq(wali.id, data.id), with: { siswa: true } })
    if (!w) throw new Error('Wali tidak ditemukan')
    if (!w.siswa) throw new Error('Data siswa tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, w.siswa.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    await db.delete(wali).where(eq(wali.id, data.id))
    return { deleted: true }
  })
