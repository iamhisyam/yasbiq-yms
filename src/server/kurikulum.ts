import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { kurikulum, angkatanKurikulum } from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'

async function getSessionOrThrow() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request!.headers })
  if (!session?.user) throw new Error('Unauthenticated')
  return session
}

// ─── Kurikulum CRUD ───────────────────────────────────────────────────────────

export const getKurikulumList = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)

    return db.query.kurikulum.findMany({
      where: eq(kurikulum.unitId, data.unitId),
      orderBy: (k, { asc }) => [asc(k.nama)],
    })
  })

export const createKurikulum = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(),
    nama: z.string().min(1, 'Nama kurikulum wajib diisi'),
    deskripsi: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const [created] = await db.insert(kurikulum).values(data).returning()
    return created
  })

export const updateKurikulum = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string().uuid(),
    nama: z.string().min(1).optional(),
    deskripsi: z.string().optional(),
    aktif: z.boolean().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.kurikulum.findFirst({ where: eq(kurikulum.id, data.id) })
    if (!existing) throw new Error('Kurikulum tidak ditemukan')

    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const [updated] = await db
      .update(kurikulum)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(kurikulum.id, data.id))
      .returning()

    return updated
  })

export const deleteKurikulum = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.kurikulum.findFirst({ where: eq(kurikulum.id, data.id) })
    if (!existing) throw new Error('Kurikulum tidak ditemukan')

    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const [deleted] = await db.delete(kurikulum).where(eq(kurikulum.id, data.id)).returning()
    return deleted
  })

// ─── Angkatan Kurikulum ───────────────────────────────────────────────────────

export const getAngkatanKurikulumList = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)

    return db.query.angkatanKurikulum.findMany({
      where: eq(angkatanKurikulum.unitId, data.unitId),
      with: { kurikulum: true },
      orderBy: (a, { desc }) => [desc(a.tahun)],
    })
  })

export const upsertAngkatanKurikulum = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(),
    tahun: z.number().int().min(1900).max(2100),
    kurikulumId: z.string().uuid(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const existing = await db.query.angkatanKurikulum.findFirst({
      where: and(eq(angkatanKurikulum.unitId, data.unitId), eq(angkatanKurikulum.tahun, data.tahun)),
    })

    if (existing) {
      const [updated] = await db
        .update(angkatanKurikulum)
        .set({ kurikulumId: data.kurikulumId })
        .where(eq(angkatanKurikulum.id, existing.id))
        .returning()
      return updated
    }

    const [created] = await db.insert(angkatanKurikulum).values(data).returning()
    return created
  })

export const deleteAngkatanKurikulum = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.angkatanKurikulum.findFirst({ where: eq(angkatanKurikulum.id, data.id) })
    if (!existing) throw new Error('Data tidak ditemukan')

    const kur = await db.query.kurikulum.findFirst({ where: eq(kurikulum.id, existing.kurikulumId) })
    if (kur) {
      const { requireMinimumRole } = await import('#/lib/unit-guard.server')
      await requireMinimumRole(session.user.id, kur.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    }

    const [deleted] = await db.delete(angkatanKurikulum).where(eq(angkatanKurikulum.id, data.id)).returning()
    return deleted
  })
