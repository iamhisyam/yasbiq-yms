import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, asc } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { yayasan, unit } from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'

async function getSessionOrThrow() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request!.headers })
  if (!session?.user) throw new Error('Unauthenticated')
  return session
}

export type PengaturanMap = Record<string, string>

// ─── Yayasan-Level Settings ────────────────────────────────────────────────

export const getYayasanPengaturan = createServerFn({ method: 'GET' })
  .handler(async () => {
    await getSessionOrThrow()
    const y = await db.query.yayasan.findFirst()
    if (!y) return {} as PengaturanMap

    return {
      nama: y.nama || '',
      npwp: y.npwp || '',
      statusPkp: y.statusPkp || '',
      ketua: y.ketua || '',
      bendahara: y.bendahara || '',
      sekretaris: y.sekretaris || '',
      headerDokumen: y.headerDokumen || '',
      footerDokumen: y.footerDokumen || '',
      logoDokumen: y.logoDokumen || '',
      alamat: y.alamat || '',
      telepon: y.telepon || '',
      email: y.email || '',
    } as PengaturanMap
  })

export const saveYayasanPengaturan = createServerFn({ method: 'POST' })
  .validator(z.object({
    nama: z.string().optional(),
    npwp: z.string().optional(),
    statusPkp: z.string().optional(),
    ketua: z.string().optional(),
    bendahara: z.string().optional(),
    sekretaris: z.string().optional(),
    headerDokumen: z.string().optional(),
    footerDokumen: z.string().optional(),
    logoDokumen: z.string().optional(),
    alamat: z.string().optional(),
    telepon: z.string().optional(),
    email: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    if (!(session.user as any).isSuperAdmin) throw new Error('Hanya super_admin yang dapat mengubah pengaturan yayasan')

    const y = await db.query.yayasan.findFirst()
    if (!y) throw new Error('Yayasan tidak ditemukan')

    await db.update(yayasan).set(data).where(eq(yayasan.id, y.id))
    return { saved: true }
  })

// ─── Unit-Level Settings (for Pengaturan page) ────────────────────────────

export const getUnitPengaturan = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)

    const u = await db.query.unit.findFirst({ where: eq(unit.id, data.unitId) })
    if (!u) throw new Error('Unit tidak ditemukan')

    return {
      nama: u.nama || '',
      nomorUnit: u.nomorUnit || '',
      jenjang: u.jenjang || '',
      alamat: u.alamat || '',
      telepon: u.telepon || '',
      email: u.email || '',
      kepalaUnit: u.kepalaUnit || '',
    } as PengaturanMap
  })

export const saveUnitPengaturan = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(),
    data: z.object({
      nama: z.string().optional(),
      nomorUnit: z.string().optional(),
      alamat: z.string().optional(),
      telepon: z.string().optional(),
      email: z.string().optional(),
      kepalaUnit: z.string().optional(),
    }),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    await db.update(unit).set(data.data).where(eq(unit.id, data.unitId))
    return { saved: true }
  })

// ─── All Units with Settings (for General page table) ─────────────────────

export type UnitPengaturanItem = {
  id: string
  nama: string
  jenjang: string
  settings: PengaturanMap
}

export const getAllUnitsPengaturan = createServerFn({ method: 'GET' })
  .handler(async () => {
    const session = await getSessionOrThrow()
    if (!(session.user as any).isSuperAdmin) throw new Error('Hanya super_admin yang dapat mengakses')

    const unitsData = await db.query.unit.findMany({
      orderBy: [asc(unit.nama)],
    })

    const result: UnitPengaturanItem[] = unitsData.map((u) => ({
      id: u.id,
      nama: u.nama,
      jenjang: u.jenjang,
      settings: {
        nama: u.nama || '',
        nomorUnit: u.nomorUnit || '',
        jenjang: u.jenjang || '',
        alamat: u.alamat || '',
        telepon: u.telepon || '',
        email: u.email || '',
        kepalaUnit: u.kepalaUnit || '',
      } as PengaturanMap,
    }))

    return result
  })
