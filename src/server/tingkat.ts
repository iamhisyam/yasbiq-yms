import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { tingkat, kelas } from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'

async function getSessionOrThrow() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request!.headers })
  if (!session?.user) throw new Error('Unauthenticated')
  return session
}

export const getTingkatList = createServerFn({ method: 'GET' })
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

export const createTingkat = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(), nama: z.string().min(1),
    kode: z.string().optional(), urutan: z.number().int().default(0),
    keterangan: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    const [r] = await db.insert(tingkat).values(data).returning()
    return r
  })

export const updateTingkat = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string().uuid(), nama: z.string().min(1).optional(),
    kode: z.string().optional(), urutan: z.number().int().optional(),
    keterangan: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.tingkat.findFirst({ where: eq(tingkat.id, data.id) })
    if (!existing) throw new Error('Tingkat tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    const upd: any = { updatedAt: new Date() }
    if (data.nama !== undefined) upd.nama = data.nama
    if (data.kode !== undefined) upd.kode = data.kode || null
    if (data.urutan !== undefined) upd.urutan = data.urutan
    if (data.keterangan !== undefined) upd.keterangan = data.keterangan || null
    const [r] = await db.update(tingkat).set(upd).where(eq(tingkat.id, data.id)).returning()
    return r
  })

export const deleteTingkat = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.tingkat.findFirst({ where: eq(tingkat.id, data.id) })
    if (!existing) throw new Error('Tingkat tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    
    // Check for existing kelas records
    const existingKelas = await db.query.kelas.findFirst({ 
      where: eq(kelas.tingkatId, data.id) 
    })
    if (existingKelas) throw new Error('Tidak dapat menghapus tingkat yang masih memiliki kelas')
    
    await db.delete(tingkat).where(eq(tingkat.id, data.id))
    return { deleted: true }
  })
