import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { kelas, pegawai, tingkat, siswa } from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'

async function getSessionOrThrow() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request!.headers })
  if (!session?.user) throw new Error('Unauthenticated')
  return session
}

export const getKelasList = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
    return db.query.kelas.findMany({
      where: eq(kelas.unitId, data.unitId),
      with: { waliKelas: true, tingkatRef: true },
      orderBy: (k, { asc }) => [asc(k.nama)],
    })
  })

export const createKelas = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(), nama: z.string().min(1, 'Nama kelas wajib diisi'),
    tingkatId: z.string().uuid().optional(),
    waliKelasId: z.string().uuid().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    const [created] = await db.insert(kelas).values(data).returning()
    return created
  })

export const updateKelas = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string().uuid(), nama: z.string().min(1).optional(),
    tingkatId: z.string().uuid().optional(),
    waliKelasId: z.string().uuid().nullable().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.kelas.findFirst({ where: eq(kelas.id, data.id) })
    if (!existing) throw new Error('Kelas tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    const [updated] = await db.update(kelas)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(kelas.id, data.id)).returning()
    return updated
  })

export const deleteKelas = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.kelas.findFirst({ where: eq(kelas.id, data.id) })
    if (!existing) throw new Error('Kelas tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    
    // Check for existing students
    const studentCount = await db.query.siswa.findFirst({ 
      where: eq(siswa.kelasId, data.id) 
    })
    if (studentCount) throw new Error('Tidak dapat menghapus kelas yang masih memiliki siswa')
    
    const [deleted] = await db.delete(kelas).where(eq(kelas.id, data.id)).returning()
    return deleted
  })

export const getWaliKelasOptions = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
    return db.query.pegawai.findMany({
      where: eq(pegawai.unitId, data.unitId),
      columns: { id: true, nama: true, nip: true, jabatan: true },
      orderBy: (p, { asc }) => [asc(p.nama)],
    })
  })

export const getTingkatOptions = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
    return db.query.tingkat.findMany({
      where: eq(tingkat.unitId, data.unitId),
      orderBy: (t, { asc }) => [asc(t.urutan), asc(t.nama)],
    })
  })

// ─── Detail Kelas ────────────────────────────────────────────────────────────

export const getKelasById = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const row = await db.query.kelas.findFirst({
      where: eq(kelas.id, data.id),
      with: { waliKelas: true, tingkatRef: true, unit: true },
    })
    if (!row) throw new Error('Kelas tidak ditemukan')
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, row.unitId, (session.user as any).isSuperAdmin)
    return row
  })

export const getSiswaByKelas = createServerFn({ method: 'GET' })
  .validator(z.object({
    kelasId: z.string().uuid(), search: z.string().optional(),
    status: z.string().optional(), page: z.number().default(1),
    pageSize: z.number().default(50),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    const kls = await db.query.kelas.findFirst({ where: eq(kelas.id, data.kelasId), columns: { unitId: true } })
    if (!kls) throw new Error('Kelas tidak ditemukan')
    await requireUnitAccess(session.user.id, kls.unitId, (session.user as any).isSuperAdmin)
    const conditions = [eq(siswa.kelasId, data.kelasId)]
    if (data.search) {
      conditions.push(sql`(siswa.nama ILIKE ${'%' + data.search + '%'} OR siswa.nis ILIKE ${'%' + data.search + '%'})`)
    }
    if (data.status) conditions.push(eq(siswa.status, data.status as any))

    const offset = (data.page - 1) * data.pageSize
    const [rows, countResult] = await Promise.all([
      db.query.siswa.findMany({
        where: and(...conditions),
        with: { walis: true },
        limit: data.pageSize, offset,
        orderBy: (s, { asc }) => [asc(s.nama)],
      }),
      db.select({ count: sql<number>`count(*)::int` }).from(siswa).where(and(...conditions)),
    ])
    return { data: rows, total: countResult[0]?.count ?? 0, page: data.page, pageSize: data.pageSize }
  })
