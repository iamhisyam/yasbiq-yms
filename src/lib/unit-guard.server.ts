/**
 * Unit Access Guard
 * Utility untuk validasi akses user terhadap unit tertentu
 */
import { db } from '#/db/index.server'
import { userUnit, authUser } from '#/db/schema/index'
import { and, eq } from 'drizzle-orm'

import type { UserRole } from './unit-guard-types'
export type { UserRole }

/**
 * Cek apakah user bisa mengakses unit tertentu
 */
export async function canAccessUnit(
  userId: string,
  unitId: string,
): Promise<boolean> {
  const access = await db.query.userUnit.findFirst({
    where: and(
      eq(userUnit.userId, userId),
      eq(userUnit.unitId, unitId),
    ),
  })
  return !!access
}

/**
 * Ambil role user di unit tertentu
 */
export async function getUserRoleInUnit(
  userId: string,
  unitId: string,
): Promise<UserRole | null> {
  const access = await db.query.userUnit.findFirst({
    where: and(
      eq(userUnit.userId, userId),
      eq(userUnit.unitId, unitId),
    ),
  })
  return (access?.role as UserRole) ?? null
}

/**
 * Ambil semua unit yang bisa diakses user
 */
export async function getUserAccessibleUnits(userId: string) {
  return db.query.userUnit.findMany({
    where: eq(userUnit.userId, userId),
    with: {
      unit: true,
    },
  })
}

/**
 * BUG #12 FIX: Verifikasi isSuperAdmin dari database, bukan dari session
 */
export async function verifySuperAdmin(userId: string): Promise<boolean> {
  const user = await db.query.authUser.findFirst({
    where: eq(authUser.id, userId),
    columns: { isSuperAdmin: true },
  })
  return user?.isSuperAdmin ?? false
}

/**
 * Guard: throw jika user tidak punya akses ke unit
 */
export async function requireUnitAccess(
  userId: string,
  unitId: string,
  isSuperAdminFlag = false,
): Promise<void> {
  // BUG #12 FIX: Verify super admin status from database
  if (isSuperAdminFlag) {
    const verified = await verifySuperAdmin(userId)
    if (verified) return
  }

  const hasAccess = await canAccessUnit(userId, unitId)
  if (!hasAccess) {
    throw new Error('Akses ditolak: Anda tidak memiliki akses ke unit ini')
  }
}

/**
 * Guard: throw jika user bukan minimal role tertentu di unit
 */
export async function requireMinimumRole(
  userId: string,
  unitId: string,
  minimumRole: UserRole,
  isSuperAdminFlag = false,
): Promise<void> {
  // BUG #12 FIX: Verify super admin status from database
  if (isSuperAdminFlag) {
    const verified = await verifySuperAdmin(userId)
    if (verified) return
  }

  const roleHierarchy: Record<UserRole, number> = {
    super_admin: 3,
    admin_yayasan: 2,
    operator: 1,
    guru: 0,
  }

  const userRole = await getUserRoleInUnit(userId, unitId)
  if (!userRole) {
    throw new Error('Akses ditolak: Anda tidak terdaftar di unit ini')
  }

  if (roleHierarchy[userRole] < roleHierarchy[minimumRole]) {
    throw new Error(
      `Akses ditolak: Dibutuhkan role minimal ${minimumRole}`,
    )
  }
}
