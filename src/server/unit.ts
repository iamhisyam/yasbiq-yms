import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { unit, yayasan } from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'

async function getSuperAdminSessionOrThrow() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request!.headers })
  if (!session?.user) throw new Error('Unauthenticated')
  if (!(session.user as any).isSuperAdmin) throw new Error('Akses ditolak: hanya Super Admin')
  return session
}

async function getDefaultYayasanId() {
  const [y] = await db.select({ id: yayasan.id }).from(yayasan).limit(1)
  if (!y) throw new Error('Yayasan belum dibuat. Jalankan db:seed terlebih dahulu.')
  return y.id
}

export const getUnits = createServerFn({ method: 'GET' })
  .handler(async () => {
    await getSuperAdminSessionOrThrow()

    return db.query.unit.findMany({
      with: { yayasan: true },
      orderBy: (u, { asc }) => [asc(u.nama)],
    })
  })

export const createUnit = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      nama: z.string().min(2, 'Nama minimal 2 karakter'),
      jenjang: z.enum(['TK', 'SD', 'SMP', 'SMA', 'SMK', 'Lainnya']),
      nomorUnit: z.string().optional(),
      alamat: z.string().optional(),
      telepon: z.string().optional(),
      email: z.string().optional(),
      kepalaUnit: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await getSuperAdminSessionOrThrow()
    const yayasanId = await getDefaultYayasanId()

    const [created] = await db
      .insert(unit)
      .values({ ...data, yayasanId })
      .returning()

    return created
  })

export const updateUnit = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string().uuid(),
      nama: z.string().min(2).optional(),
      jenjang: z.enum(['TK', 'SD', 'SMP', 'SMA', 'SMK', 'Lainnya']).optional(),
      nomorUnit: z.string().optional(),
      alamat: z.string().optional(),
      telepon: z.string().optional(),
      email: z.string().optional(),
      kepalaUnit: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await getSuperAdminSessionOrThrow()

    const [updated] = await db
      .update(unit)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(unit.id, data.id))
      .returning()

    return updated
  })

export const toggleUnitActive = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await getSuperAdminSessionOrThrow()

    const existing = await db.query.unit.findFirst({ where: eq(unit.id, data.id) })
    if (!existing) throw new Error('Unit tidak ditemukan')

    const [updated] = await db
      .update(unit)
      .set({ aktif: !existing.aktif, updatedAt: new Date() })
      .where(eq(unit.id, data.id))
      .returning()

    return updated
  })

export const deleteUnit = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await getSuperAdminSessionOrThrow()

    const [deleted] = await db
      .delete(unit)
      .where(eq(unit.id, data.id))
      .returning()

    return deleted
  })
