import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, eq, sql, inArray } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { dana } from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'
import { resolveYayasanUnitIds } from './keuangan-utils.server'

async function getSessionOrThrow() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request!.headers })
  if (!session?.user) throw new Error('Unauthenticated')
  return session
}

export const DanaSchema = z.object({
  unitId: z.string().uuid(),
  kode: z.string().optional(),
  nama: z.string().min(1, 'Nama wajib diisi'),
  tipe: z.enum(['donor', 'investor', 'endowment', 'internal']).default('donor'),
  sumber: z.string().optional(),
  npwp: z.string().optional(),
  jenisIkat: z.enum(['tidak_terikat', 'terikat_temporer', 'terikat_permanen']).default('tidak_terikat'),
  tujuan: z.string().optional(),
  targetNominal: z.number().int().default(0),
  realisasi: z.number().int().default(0),
  tanggalMulai: z.string().optional(),
  tanggalSelesai: z.string().optional(),
  status: z.enum(['aktif', 'selesai', 'dibatalkan']).default('aktif'),
  keterangan: z.string().optional(),
})

export const getDanaList = createServerFn({ method: 'GET' })
  .validator(z.object({
    unitId: z.string(), tipe: z.string().optional(),
    jenisIkat: z.string().optional(), status: z.string().optional(),
    page: z.number().default(1), pageSize: z.number().default(20),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    let conditions: any[]
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await resolveYayasanUnitIds(session.user.id)
      conditions = [inArray(dana.unitId, unitIds)]
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      conditions = [eq(dana.unitId, data.unitId)]
    }

    if (data.tipe) conditions.push(eq(dana.tipe, data.tipe as any))
    if (data.jenisIkat) conditions.push(eq(dana.jenisIkat, data.jenisIkat as any))
    if (data.status) conditions.push(eq(dana.status, data.status as any))
    const offset = (data.page - 1) * data.pageSize
    const [rows, countResult] = await Promise.all([
      db.query.dana.findMany({ where: and(...conditions), limit: data.pageSize, offset, orderBy: (t, { desc }) => [desc(t.createdAt)] }),
      db.select({ count: sql<number>`count(*)::int` }).from(dana).where(and(...conditions)),
    ])
    return { data: rows, total: countResult[0]?.count ?? 0 }
  })

export const createDana = createServerFn({ method: 'POST' })
  .validator(DanaSchema)
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    const [created] = await db.insert(dana).values(data).returning()
    return created
  })

export const updateDana = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid(), data: DanaSchema.partial() }))
  .handler(async ({ data: { id, data: updates } }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.dana.findFirst({ where: eq(dana.id, id) })
    if (!existing) throw new Error('Dana tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    const [updated] = await db.update(dana).set({ ...updates, updatedAt: new Date() }).where(eq(dana.id, id)).returning()
    return updated
  })

export const deleteDana = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.dana.findFirst({ where: eq(dana.id, data.id) })
    if (!existing) throw new Error('Dana tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    await db.update(dana).set({ status: 'dibatalkan', updatedAt: new Date() }).where(eq(dana.id, data.id))
    return { deleted: true }
  })

// ─── Ringkasan Dana untuk Neraca ────────────────────────────────────────────

export type RingkasanDana = {
  tidakTerikat: number
  terikatTemporer: number
  terikatPermanen: number
  totalDana: number
}

export const getRingkasanDana = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    let unitCondition
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await resolveYayasanUnitIds(session.user.id)
      unitCondition = inArray(dana.unitId, unitIds)
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      unitCondition = eq(dana.unitId, data.unitId)
    }

    const rows = await db.query.dana.findMany({ where: and(unitCondition, eq(dana.status, 'aktif')) })

    const ringkasan: RingkasanDana = { tidakTerikat: 0, terikatTemporer: 0, terikatPermanen: 0, totalDana: 0 }

    for (const r of rows) {
      const sisa = r.targetNominal - r.realisasi
      if (r.jenisIkat === 'tidak_terikat') ringkasan.tidakTerikat += sisa
      else if (r.jenisIkat === 'terikat_temporer') ringkasan.terikatTemporer += sisa
      else if (r.jenisIkat === 'terikat_permanen') ringkasan.terikatPermanen += sisa
      ringkasan.totalDana += sisa
    }

    return ringkasan
  })
