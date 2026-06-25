import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { beasiswa, siswaBeasiswa } from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { resolveYayasanUnitIds } from './keuangan-utils.server'
import { getRequest } from '@tanstack/react-start/server'

async function getSessionOrThrow() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request!.headers })
  if (!session?.user) throw new Error('Unauthenticated')
  return session
}

// ─── Beasiswa CRUD ─────────────────────────────────────────────────────────────

export const getBeasiswaList = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    let conditions: any[]
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await resolveYayasanUnitIds(session.user.id)
      conditions = [inArray(beasiswa.unitId, unitIds)]
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      conditions = [eq(beasiswa.unitId, data.unitId)]
    }

    const list = await db.query.beasiswa.findMany({
      where: and(...conditions),
      orderBy: (b, { desc }) => [desc(b.createdAt)],
      with: { siswaAssignments: true, unit: true },
    })
    return list.map((b) => ({
      ...b,
      siswaCount: b.siswaAssignments.length,
    }))
  })

export const createBeasiswa = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(),
    nama: z.string().min(1, 'Nama beasiswa wajib diisi'),
    tipe: z.enum(['potongan', 'gratis']),
    jenisPotongan: z.enum(['persen', 'nominal']).nullable().optional(),
    besaranPotongan: z.number().int().nullable().optional(),
    keterangan: z.string().nullable().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const [created] = await db.insert(beasiswa).values({
      unitId: data.unitId,
      nama: data.nama,
      tipe: data.tipe,
      jenisPotongan: data.jenisPotongan ?? null,
      besaranPotongan: data.besaranPotongan ?? null,
      keterangan: data.keterangan ?? null,
    }).returning()

    return created
  })

export const updateBeasiswa = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string().uuid(),
    unitId: z.string().uuid().optional(),
    nama: z.string().min(1).optional(),
    tipe: z.enum(['potongan', 'gratis']).optional(),
    jenisPotongan: z.enum(['persen', 'nominal']).nullable().optional(),
    besaranPotongan: z.number().int().nullable().optional(),
    keterangan: z.string().nullable().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.beasiswa.findFirst({ where: eq(beasiswa.id, data.id) })
    if (!existing) throw new Error('Beasiswa tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const updateData: any = {}
    if (data.nama !== undefined) updateData.nama = data.nama
    if (data.tipe !== undefined) updateData.tipe = data.tipe
    if (data.jenisPotongan !== undefined) updateData.jenisPotongan = data.jenisPotongan
    if (data.besaranPotongan !== undefined) updateData.besaranPotongan = data.besaranPotongan
    if (data.keterangan !== undefined) updateData.keterangan = data.keterangan
    updateData.updatedAt = new Date()

    const [updated] = await db.update(beasiswa)
      .set(updateData)
      .where(eq(beasiswa.id, data.id))
      .returning()

    return updated
  })

export const toggleBeasiswa = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.beasiswa.findFirst({ where: eq(beasiswa.id, data.id) })
    if (!existing) throw new Error('Beasiswa tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const [updated] = await db.update(beasiswa)
      .set({ aktif: !existing.aktif, updatedAt: new Date() })
      .where(eq(beasiswa.id, data.id))
      .returning()

    return updated
  })

// ─── Siswa Beasiswa Assignments ────────────────────────────────────────────────

export const getSiswaBeasiswaList = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    let whereCondition: any
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await resolveYayasanUnitIds(session.user.id)
      whereCondition = inArray(siswaBeasiswa.unitId, unitIds)
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      whereCondition = eq(siswaBeasiswa.unitId, data.unitId)
    }

    return db.query.siswaBeasiswa.findMany({
      where: whereCondition,
      with: { siswa: true, beasiswa: true },
      orderBy: (sb, { desc }) => [desc(sb.createdAt)],
    })
  })

export const assignBeasiswa = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(),
    siswaIds: z.array(z.string().uuid()).min(1, 'Pilih minimal 1 siswa'),
    beasiswaId: z.string().uuid(),
    tahunAjaran: z.string().min(1, 'Tahun ajaran wajib diisi'),
    keterangan: z.string().nullable().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    // Skip duplikat: filter out students already assigned this beasiswa+TA
    const existing = await db.query.siswaBeasiswa.findMany({
      where: and(
        inArray(siswaBeasiswa.siswaId, data.siswaIds),
        eq(siswaBeasiswa.beasiswaId, data.beasiswaId),
        eq(siswaBeasiswa.tahunAjaran, data.tahunAjaran),
      ),
      columns: { siswaId: true },
    })
    const existingSiswaIds = new Set(existing.map((e) => e.siswaId))
    const newSiswaIds = data.siswaIds.filter((id) => !existingSiswaIds.has(id))

    if (newSiswaIds.length === 0) throw new Error('Semua siswa terpilih sudah memiliki beasiswa ini')

    const values = newSiswaIds.map((siswaId) => ({
      unitId: data.unitId,
      siswaId,
      beasiswaId: data.beasiswaId,
      tahunAjaran: data.tahunAjaran,
      keterangan: data.keterangan ?? null,
    }))

    const created = await db.insert(siswaBeasiswa).values(values).returning()
    return created
  })

export const removeBeasiswa = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.siswaBeasiswa.findFirst({ where: eq(siswaBeasiswa.id, data.id) })
    if (!existing) throw new Error('Data beasiswa siswa tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    await db.delete(siswaBeasiswa).where(eq(siswaBeasiswa.id, data.id))
    return { deleted: true }
  })
