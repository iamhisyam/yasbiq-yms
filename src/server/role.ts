import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, and, inArray } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { userUnit, authUser, unit } from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'
import type { UserRole } from '#/lib/unit-guard-types'

async function getSessionOrThrow() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request!.headers })
  if (!session?.user) throw new Error('Unauthenticated: silakan login terlebih dahulu')
  const isSuper = (session.user as any).isSuperAdmin
  if (isSuper) return { session, isSuper: true as const, yayasanIds: null as string[] | null }

  const adminAssignments = await db.query.userUnit.findMany({
    where: and(eq(userUnit.userId, session.user.id), eq(userUnit.role, 'admin_yayasan')),
    with: { unit: true },
  })
  if (adminAssignments.length === 0) {
    throw new Error('Akses ditolak: hanya Super Admin atau Admin Yayasan yang dapat mengelola role')
  }

  const yayasanIds = [...new Set(adminAssignments.map((a) => a.unit.yayasanId))]
  return { session, isSuper: false as const, yayasanIds }
}

function validateScope(unitId: string, yayasanIds: string[]): Promise<boolean> {
  return db.query.unit.findFirst({
    where: and(eq(unit.id, unitId), inArray(unit.yayasanId, yayasanIds)),
  }).then(Boolean)
}

export const getAllUsers = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { isSuper, yayasanIds } = await getSessionOrThrow()

    const users = await db.query.authUser.findMany({
      with: {
        userUnits: {
          with: {
            unit: true,
          },
        },
      },
      orderBy: (u, { asc }) => [asc(u.name)],
    })

    return users.map((u) => {
      let filteredUnits = u.userUnits || []
      if (!isSuper && yayasanIds) {
        filteredUnits = filteredUnits.filter((uu) => yayasanIds.includes(uu.unit.yayasanId))
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        isSuperAdmin: u.isSuperAdmin,
        image: u.image,
        createdAt: u.createdAt,
        assignments: filteredUnits.map((uu) => ({
          id: uu.id,
          unitId: uu.unitId,
          unitNama: uu.unit?.nama || '-',
          unitJenjang: uu.unit?.jenjang || '-',
          role: uu.role as UserRole,
          isBendahara: uu.isBendahara,
          createdAt: uu.createdAt,
        })),
      }
    })
  })

export const getAllUnits = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { isSuper, yayasanIds } = await getSessionOrThrow()

    const conditions = [eq(unit.aktif, true)]
    if (!isSuper && yayasanIds) {
      conditions.push(inArray(unit.yayasanId, yayasanIds))
    }

    return db.query.unit.findMany({
      where: and(...conditions),
      orderBy: (u, { asc }) => [asc(u.nama)],
    })
  })

export const assignUserToUnit = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      userId: z.string(),
      unitId: z.string().uuid(),
      role: z.enum(['super_admin', 'admin_yayasan', 'operator', 'guru']),
      isBendahara: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { isSuper, yayasanIds } = await getSessionOrThrow()

    if (!isSuper && yayasanIds) {
      const valid = await validateScope(data.unitId, yayasanIds)
      if (!valid) throw new Error('Akses ditolak: unit di luar wewenang Anda')
    }

    const existing = await db.query.userUnit.findFirst({
      where: and(eq(userUnit.userId, data.userId), eq(userUnit.unitId, data.unitId)),
    })

    if (existing) {
      throw new Error('User sudah memiliki akses ke unit ini')
    }

    const [created] = await db.insert(userUnit).values({
      userId: data.userId,
      unitId: data.unitId,
      role: data.role,
      isBendahara: data.isBendahara ?? false,
    }).returning()
    return created
  })

export const updateUserUnitRole = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      assignmentId: z.string().uuid(),
      role: z.enum(['super_admin', 'admin_yayasan', 'operator', 'guru']),
    }),
  )
  .handler(async ({ data }) => {
    const { isSuper, yayasanIds } = await getSessionOrThrow()

    if (!isSuper && yayasanIds) {
      const assignment = await db.query.userUnit.findFirst({
        where: eq(userUnit.id, data.assignmentId),
        with: { unit: true },
      })
      if (!assignment || !yayasanIds.includes(assignment.unit.yayasanId)) {
        throw new Error('Akses ditolak: assignment di luar wewenang Anda')
      }
    }

    const [updated] = await db
      .update(userUnit)
      .set({ role: data.role, updatedAt: new Date() })
      .where(eq(userUnit.id, data.assignmentId))
      .returning()

    return updated
  })

export const removeUserFromUnit = createServerFn({ method: 'POST' })
  .validator(z.object({ assignmentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { isSuper, yayasanIds } = await getSessionOrThrow()

    if (!isSuper && yayasanIds) {
      const assignment = await db.query.userUnit.findFirst({
        where: eq(userUnit.id, data.assignmentId),
        with: { unit: true },
      })
      if (!assignment || !yayasanIds.includes(assignment.unit.yayasanId)) {
        throw new Error('Akses ditolak: assignment di luar wewenang Anda')
      }
    }

    const [deleted] = await db
      .delete(userUnit)
      .where(eq(userUnit.id, data.assignmentId))
      .returning()

    return deleted
  })

export const toggleSuperAdmin = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const { isSuper } = await getSessionOrThrow()
    if (!isSuper) throw new Error('Akses ditolak: hanya Super Admin')

    const user = await db.query.authUser.findFirst({
      where: eq(authUser.id, data.userId),
    })
    if (!user) throw new Error('User tidak ditemukan')

    const [updated] = await db
      .update(authUser)
      .set({ isSuperAdmin: !user.isSuperAdmin })
      .where(eq(authUser.id, data.userId))
      .returning()

    return updated
  })

export const toggleBendahara = createServerFn({ method: 'POST' })
  .validator(z.object({ assignmentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { isSuper, yayasanIds } = await getSessionOrThrow()

    const assignment = await db.query.userUnit.findFirst({
      where: eq(userUnit.id, data.assignmentId),
      with: { unit: true },
    })
    if (!assignment) throw new Error('Assignment tidak ditemukan')

    if (!isSuper && yayasanIds && !yayasanIds.includes(assignment.unit.yayasanId)) {
      throw new Error('Akses ditolak: assignment di luar wewenang Anda')
    }

    const [updated] = await db
      .update(userUnit)
      .set({ isBendahara: !assignment.isBendahara, updatedAt: new Date() })
      .where(eq(userUnit.id, data.assignmentId))
      .returning()

    return updated
  })
