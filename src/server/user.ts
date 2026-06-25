import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, and, inArray } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { authUser, authAccount, userUnit, unit } from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'
import { hashPassword, verifyPassword } from 'better-auth/crypto'
import { checkRateLimit } from '#/lib/rate-limiter.server'

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
    throw new Error('Akses ditolak: hanya Super Admin atau Admin Yayasan')
  }

  const yayasanIds = [...new Set(adminAssignments.map((a) => a.unit.yayasanId))]
  return { session, isSuper: false as const, yayasanIds }
}

async function getUserYayasanIds(userId: string): Promise<string[]> {
  const units = await db.query.userUnit.findMany({
    where: eq(userUnit.userId, userId),
    with: { unit: true },
  })
  return [...new Set(units.map((u) => u.unit.yayasanId))]
}

async function assertUserInYayasanScope(targetUserId: string, callerYayasanIds: string[]): Promise<void> {
  const targetYayasanIds = await getUserYayasanIds(targetUserId)
  const inScope = targetYayasanIds.some((id) => callerYayasanIds.includes(id))
  if (!inScope) throw new Error('Akses ditolak: user di luar wewenang Anda')
}

export const getUsers = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { isSuper, yayasanIds } = await getSessionOrThrow()

    if (isSuper) {
      return db.query.authUser.findMany({
        orderBy: (u, { asc }) => [asc(u.name)],
      })
    }

    const unitsInScope = await db.query.unit.findMany({
      where: inArray(unit.yayasanId, yayasanIds!),
      columns: { id: true },
    })
    const unitIdList = unitsInScope.map((u) => u.id)

    const userAssignments = await db.query.userUnit.findMany({
      where: inArray(userUnit.unitId, unitIdList),
      columns: { userId: true },
    })
    const userIdList = [...new Set(userAssignments.map((a) => a.userId))]

    return db.query.authUser.findMany({
      where: inArray(authUser.id, userIdList),
      orderBy: (u, { asc }) => [asc(u.name)],
    })
  })

export const createUser = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z.string().min(2, 'Nama minimal 2 karakter'),
      email: z.string().email('Email tidak valid'),
      password: z.string().min(6, 'Password minimal 6 karakter'),
      isSuperAdmin: z.boolean().default(false),
    }),
  )
  .handler(async ({ data }) => {
    const { isSuper } = await getSessionOrThrow()
    const rl = checkRateLimit('createUser', 10, 60_000)
    if (!rl.allowed) throw new Error('Terlalu banyak permintaan. Coba lagi nanti.')
    if (data.isSuperAdmin && !isSuper) throw new Error('Hanya Super Admin yang dapat membuat Super Admin')

    const existing = await db.query.authUser.findFirst({
      where: eq(authUser.email, data.email),
    })
    if (existing) throw new Error('Gagal membuat user: data tidak valid')

    const result = await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: data.name,
      },
      headers: new Headers({ 'content-type': 'application/json' }),
    })

    if (!result?.user) throw new Error('Gagal membuat user')

    if (data.isSuperAdmin) {
      await db
        .update(authUser)
        .set({ isSuperAdmin: true })
        .where(eq(authUser.id, result.user.id))
    }

    return result.user
  })

export const updateUser = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      userId: z.string(),
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { isSuper, yayasanIds } = await getSessionOrThrow()
    if (!isSuper && yayasanIds) {
      await assertUserInYayasanScope(data.userId, yayasanIds)
    }

    if (data.email) {
      const existing = await db.query.authUser.findFirst({
        where: eq(authUser.email, data.email),
      })
      if (existing && existing.id !== data.userId) throw new Error('Email sudah digunakan user lain')
    }

    const [updated] = await db
      .update(authUser)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(authUser.id, data.userId))
      .returning()

    return updated
  })

export const resetPassword = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      userId: z.string(),
      currentPassword: z.string().optional(),
      newPassword: z.string().min(6, 'Password minimal 6 karakter'),
    }),
  )
  .handler(async ({ data }) => {
    const rl = checkRateLimit('resetPassword', 5, 60_000)
    if (!rl.allowed) throw new Error('Terlalu banyak permintaan. Coba lagi nanti.')
    const { session, isSuper, yayasanIds } = await getSessionOrThrow()
    if (!isSuper && yayasanIds) {
      await assertUserInYayasanScope(data.userId, yayasanIds)
    }

    const user = await db.query.authUser.findFirst({
      where: eq(authUser.id, data.userId),
    })
    if (!user) throw new Error('User tidak ditemukan')

    const isOwnAccount = data.userId === session.user.id
    if (isOwnAccount) {
      if (!data.currentPassword) throw new Error('Password saat ini wajib diisi')
      const account = await db.query.authAccount.findFirst({
        where: and(eq(authAccount.userId, data.userId), eq(authAccount.providerId, 'credential')),
      })
      if (!account?.password) throw new Error('Akun credential tidak ditemukan')
      const isValid = await verifyPassword({ hash: account.password, password: data.currentPassword })
      if (!isValid) throw new Error('Password saat ini salah')
    }

    const hashed = await hashPassword(data.newPassword)

    await db
      .update(authAccount)
      .set({ password: hashed })
      .where(eq(authAccount.userId, data.userId))

    return { success: true }
  })

export const deleteUser = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const { session, isSuper, yayasanIds } = await getSessionOrThrow()
    if (session.user.id === data.userId) throw new Error('Tidak dapat menghapus akun sendiri')
    if (!isSuper && yayasanIds) {
      await assertUserInYayasanScope(data.userId, yayasanIds)
    }

    await db.delete(authUser).where(eq(authUser.id, data.userId))
    return { success: true }
  })
