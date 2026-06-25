import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { tahunAjaran, siswaRiwayat, siswa } from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'

async function getSessionOrThrow() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request!.headers })
  if (!session?.user) throw new Error('Unauthenticated')
  return session
}

export const getTahunAjaranList = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)

    return db.query.tahunAjaran.findMany({
      where: eq(tahunAjaran.unitId, data.unitId),
      orderBy: (t, { desc }) => [desc(t.tanggalMulai)],
    })
  })

export const createTahunAjaran = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      unitId: z.string().uuid(),
      nama: z.string().min(1, 'Nama wajib diisi'),
      tanggalMulai: z.string(),
      tanggalSelesai: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    await db.transaction(async (tx) => {
      await tx.update(tahunAjaran).set({ aktif: false, updatedAt: new Date() })
        .where(and(eq(tahunAjaran.unitId, data.unitId), eq(tahunAjaran.aktif, true)))
      const [created] = await tx.insert(tahunAjaran).values({ ...data, aktif: true }).returning()
      return created
    })
  })

export const updateTahunAjaran = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string().uuid(),
      nama: z.string().min(1).optional(),
      tanggalMulai: z.string().optional(),
      tanggalSelesai: z.string().optional(),
      aktif: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.tahunAjaran.findFirst({ where: eq(tahunAjaran.id, data.id) })
    if (!existing) throw new Error('Tahun ajaran tidak ditemukan')

    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    // If activating this TA, deactivate all others in the same unit
    if (data.aktif === true) {
      await db.update(tahunAjaran).set({ aktif: false, updatedAt: new Date() })
        .where(and(eq(tahunAjaran.unitId, existing.unitId), eq(tahunAjaran.aktif, true)))
    }

    const [updated] = await db
      .update(tahunAjaran)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tahunAjaran.id, data.id))
      .returning()

    return updated
  })

export const deleteTahunAjaran = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.tahunAjaran.findFirst({ where: eq(tahunAjaran.id, data.id) })
    if (!existing) throw new Error('Tahun ajaran tidak ditemukan')

    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const [deleted] = await db.delete(tahunAjaran).where(eq(tahunAjaran.id, data.id)).returning()
    return deleted
  })

// ─── Student Status / Graduation ───────────────────────────────────────────────

export const getSiswaRiwayat = createServerFn({ method: 'GET' })
  .validator(z.object({ siswaId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const s = await db.query.siswa.findFirst({ where: eq(siswa.id, data.siswaId) })
    if (!s) throw new Error('Siswa tidak ditemukan')
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, s.unitId, (session.user as any).isSuperAdmin)

    return db.query.siswaRiwayat.findMany({
      where: eq(siswaRiwayat.siswaId, data.siswaId),
      with: {
        tahunAjaran: true,
        kelas: true,
      },
      orderBy: (r, { desc }) => [desc(r.tanggal)],
    })
  })

export const catatStatusSiswa = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      siswaId: z.string().uuid(),
      tahunAjaranId: z.string().uuid(),
      kelasId: z.string().uuid().nullable().optional(),
      status: z.enum(['aktif', 'nonaktif', 'lulus', 'pindah', 'dikeluarkan']),
      tanggal: z.string(),
      keterangan: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const s = await db.query.siswa.findFirst({ where: eq(siswa.id, data.siswaId) })
    if (!s) throw new Error('Siswa tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, s.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const [riwayat] = await db.insert(siswaRiwayat).values(data).returning()

    await db
      .update(siswa)
      .set({
        status: data.status,
        tahunKeluar: data.status !== 'aktif' ? parseInt(data.tanggal.slice(0, 4)) : s.tahunKeluar,
        updatedAt: new Date(),
      })
      .where(eq(siswa.id, data.siswaId))

    return riwayat
  })
