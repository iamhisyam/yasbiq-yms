/**
 * Server Functions: Authentication & Authorization
 * Digunakan untuk session verification di router dan layout
 */
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'
import { db } from '#/db/index.server'
import { userUnit, unit } from '#/db/schema/index'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import type { UserRole } from '#/lib/unit-guard-types'

export const getCurrentSession = createServerFn({ method: 'GET' })
  .handler(async () => {
    const request = getRequest()
    if (!request) return null

    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) return null
    return { user: session.user, session: { id: session.session.id } }
  })

export const getUserUnits = createServerFn({ method: 'GET' })
  .handler(async () => {
    const request = getRequest()
    if (!request) return []
    
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) return []

    const isSuper = (session.user as any).isSuperAdmin

    // Jika super admin, return semua unit dengan role super_admin
    if (isSuper) {
      const units = await db.query.unit.findMany({
        where: eq(unit.aktif, true),
        with: {
          yayasan: true
        }
      })
      return units.map((u) => ({ ...u, role: 'super_admin' as UserRole, isBendahara: false }))
    }

    // Ambil unit yang diassign ke user beserta role-nya
    const userAccess = await db.query.userUnit.findMany({
      where: eq(userUnit.userId, session.user.id),
      with: {
        unit: {
          with: {
            yayasan: true
          }
        }
      }
    })

    return userAccess.map((ua) => ({ ...ua.unit, role: ua.role as UserRole, isBendahara: ua.isBendahara }))
  })

export const canManageUsers = createServerFn({ method: 'GET' })
  .handler(async () => {
    const request = getRequest()
    if (!request) return false

    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) return false

    if ((session.user as any).isSuperAdmin) return true

    const adminCheck = await db.query.userUnit.findFirst({
      where: and(eq(userUnit.userId, session.user.id), eq(userUnit.role, 'admin_yayasan')),
    })
    return !!adminCheck
  })

export const requireRole = createServerFn({ method: 'GET' })
  .validator(z.object({
    minimumRole: z.enum(['super_admin', 'admin_yayasan', 'operator', 'guru']),
  }))
  .handler(async ({ data }) => {
    const request = getRequest()
    if (!request) return { allowed: false }

    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) return { allowed: false }

    const user = session.user as any
    if (user.isSuperAdmin) return { allowed: true }

    const roleHierarchy: Record<string, number> = {
      super_admin: 3, admin_yayasan: 2, operator: 1, guru: 0,
    }
    const minLevel = roleHierarchy[data.minimumRole]
    if (minLevel === undefined) return { allowed: false }

    const userRoles = await db.query.userUnit.findMany({
      where: eq(userUnit.userId, user.id),
      columns: { role: true },
    })

    const hasRole = userRoles.some((uu) => (roleHierarchy[uu.role] ?? -1) >= minLevel)
    return { allowed: hasRole }
  })

