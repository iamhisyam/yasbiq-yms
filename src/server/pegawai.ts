import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, and, sql, ilike, inArray, isNull, or } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { pegawai, mataPelajaran, pegawaiMapel, penggajian, penggajianKomponen, penggajianDetail, kasTransaksi, userUnit, jurnalHeader, jurnalDetail, bankAccount } from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'
import { ensureKategori, resolveYayasanUnitIds, generateJurnalKas } from './keuangan-utils.server'
import { hitungPph21, hitungBpjsKesehatan, hitungBpjsTK, hitungThr } from './pajak-utils'
import { verifySuperAdmin } from '#/lib/unit-guard.server'

async function getSessionOrThrow() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request!.headers })
  if (!session?.user) throw new Error('Unauthenticated')
  return session
}

// ─── Pegawai CRUD ─────────────────────────────────────────────────────────────

export const getPegawaiList = createServerFn({ method: 'GET' })
  .validator(z.object({
    unitId: z.string(),
    search: z.string().optional(),
    jabatan: z.string().optional(),
    status: z.string().optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    let conditions: any[]
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await resolveYayasanUnitIds(session.user.id)
      conditions = [or(inArray(pegawai.unitId, unitIds), isNull(pegawai.unitId))]
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      conditions = [eq(pegawai.unitId, data.unitId)]
    }

    const { search, jabatan, status, page, pageSize } = data
    const offset = (page - 1) * pageSize

    if (search) conditions.push(ilike(pegawai.nama, `%${search}%`))
    if (jabatan) conditions.push(eq(pegawai.jabatan, jabatan as any))
    if (status === 'aktif') conditions.push(eq(pegawai.aktif, true))
    if (status === 'nonaktif') conditions.push(eq(pegawai.aktif, false))

    const [rows, countResult] = await Promise.all([
      db.query.pegawai.findMany({
        where: and(...conditions),
        with: { mapelAssignments: { with: { mataPelajaran: true } }, unit: true },
        limit: pageSize,
        offset,
        orderBy: (p, { asc }) => [asc(p.nama)],
      }),
      db.select({ count: sql<number>`count(*)::int` }).from(pegawai).where(and(...conditions)),
    ])

    return { data: rows, total: countResult[0]?.count ?? 0, page, pageSize }
  })

export const createPegawai = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().optional(),
    nip: z.string().optional(),
    nama: z.string().min(2, 'Nama minimal 2 karakter'),
    jenisKelamin: z.string().optional(),
    tempatLahir: z.string().optional(),
    tanggalLahir: z.string().optional(),
    alamat: z.string().optional(),
    telepon: z.string().optional(),
    email: z.string().optional(),
    statusPegawai: z.string().optional(),
    jabatan: z.string().optional(),
    tanggalMasuk: z.string().optional(),
    tanggalKeluar: z.string().optional(),
    pendidikanTerakhir: z.string().optional(),
    jurusan: z.string().optional(),
    bank: z.string().optional(),
    nomorRekening: z.string().optional(),
    gajiPokok: z.number().int().optional().default(0),
    statusPajak: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const vals: any = { ...data }
    if (!vals.unitId) vals.unitId = null
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    if (vals.unitId) {
      await requireMinimumRole(session.user.id, vals.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    }

    const [created] = await db.insert(pegawai).values(vals).returning()
    return created
  })

export const updatePegawai = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid(), data: z.object({
    unitId: z.string().optional(),
    nip: z.string().optional(),
    nama: z.string().min(2).optional(),
    jenisKelamin: z.string().optional(),
    tempatLahir: z.string().optional(),
    tanggalLahir: z.string().optional(),
    alamat: z.string().optional(),
    telepon: z.string().optional(),
    email: z.string().optional(),
    statusPegawai: z.string().optional(),
    jabatan: z.string().optional(),
    tanggalMasuk: z.string().optional(),
    tanggalKeluar: z.string().optional(),
    pendidikanTerakhir: z.string().optional(),
    jurusan: z.string().optional(),
    bank: z.string().optional(),
    nomorRekening: z.string().optional(),
    gajiPokok: z.number().int().optional(),
    statusPajak: z.string().optional(),
    aktif: z.boolean().optional(),
  }) }))
  .handler(async ({ data: { id, data: updates } }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.pegawai.findFirst({ where: eq(pegawai.id, id) })
    if (!existing) throw new Error('Pegawai tidak ditemukan')

    const vals: any = { ...updates, updatedAt: new Date() }
    if ('unitId' in updates && !updates.unitId) vals.unitId = null

    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId || 'unit', 'admin_yayasan', (session.user as any).isSuperAdmin)

    const [updated] = await db
      .update(pegawai)
      .set(vals)
      .where(eq(pegawai.id, id))
      .returning()

    return updated
  })

export const deletePegawai = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.pegawai.findFirst({ where: eq(pegawai.id, data.id) })
    if (!existing) throw new Error('Pegawai tidak ditemukan')

    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    // Check for existing payroll records
    const existingPayroll = await db.query.penggajian.findFirst({ 
      where: eq(penggajian.pegawaiId, data.id) 
    })
    if (existingPayroll) throw new Error('Tidak dapat menghapus pegawai yang memiliki data penggajian')

    const [deleted] = await db.delete(pegawai).where(eq(pegawai.id, data.id)).returning()
    return deleted
  })

// ─── Mata Pelajaran ───────────────────────────────────────────────────────────

export const getMapelList = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)

    return db.query.mataPelajaran.findMany({
      where: eq(mataPelajaran.unitId, data.unitId),
      orderBy: (m, { asc }) => [asc(m.nama)],
    })
  })

// ─── Pegawai-Mapel Assignment ─────────────────────────────────────────────────

export const assignMapelToPegawai = createServerFn({ method: 'POST' })
  .validator(z.object({ pegawaiId: z.string().uuid(), mataPelajaranId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const p = await db.query.pegawai.findFirst({ where: eq(pegawai.id, data.pegawaiId) })
    if (!p) throw new Error('Pegawai tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, p.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const [created] = await db.insert(pegawaiMapel).values(data).returning()
    return created
  })

export const unassignMapelFromPegawai = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.pegawaiMapel.findFirst({
      where: eq(pegawaiMapel.id, data.id),
      with: { pegawai: true },
    })
    if (!existing) throw new Error('Data tidak ditemukan')

    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.pegawai.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const [deleted] = await db.delete(pegawaiMapel).where(eq(pegawaiMapel.id, data.id)).returning()
    return deleted
  })

// ─── Penggajian ───────────────────────────────────────────────────────────────

export const getPenggajianList = createServerFn({ method: 'GET' })
  .validator(z.object({
    unitId: z.string(),
    periode: z.string().optional(),
    status: z.string().optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(50),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    let conditions: any[]
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await resolveYayasanUnitIds(session.user.id)
      conditions = [inArray(penggajian.unitId, unitIds)]
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      conditions = [eq(penggajian.unitId, data.unitId)]
    }

    const { periode, status, page, pageSize } = data
    const offset = (page - 1) * pageSize

    if (periode) conditions.push(eq(penggajian.periode, periode))
    if (status) conditions.push(eq(penggajian.status, status as any))

    const [rows, countResult] = await Promise.all([
      db.query.penggajian.findMany({
        where: and(...conditions),
        with: { details: true, pegawai: true },
        limit: pageSize,
        offset,
        orderBy: (g, { desc }) => [desc(g.createdAt)],
      }),
      db.select({ count: sql<number>`count(*)::int` }).from(penggajian).where(and(...conditions)),
    ])

    return { data: rows, total: countResult[0]?.count ?? 0, page, pageSize }
  })

export const getPeriodeList = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    let unitCondition
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await resolveYayasanUnitIds(session.user.id)
      unitCondition = inArray(penggajian.unitId, unitIds)
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      unitCondition = eq(penggajian.unitId, data.unitId)
    }

    const result = await db
      .select({ periode: penggajian.periode })
      .from(penggajian)
      .where(unitCondition)
      .groupBy(penggajian.periode)
      .orderBy(sql`max(${penggajian.createdAt}) desc`)

    return result.map((r) => r.periode)
  })

export const prosesPenggajian = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(),
    periode: z.string(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const komponenList = await db.query.penggajianKomponen.findMany({
      where: and(
        eq(penggajianKomponen.unitId, data.unitId),
        eq(penggajianKomponen.aktif, true),
      ),
      orderBy: (k, { asc }) => [asc(k.urutan)],
    })

    const pegawaiList = await db.query.pegawai.findMany({
      where: and(
        eq(pegawai.unitId, data.unitId),
        eq(pegawai.aktif, true),
      ),
    })

    let created = 0
    let skipped = 0

    for (const p of pegawaiList) {
      const gapok = p.gajiPokok || 0
      const bpjsKes = hitungBpjsKesehatan(gapok)
      const bpjsTK = hitungBpjsTK(gapok)
      const pph21 = hitungPph21(gapok, p.statusPajak || 'TK/0')

      const detailItems = komponenList.map((k) => {
        let jumlah = k.defaultJumlah

        if (k.hitungOtomatis) {
          if (k.kode === 'gaji_pokok') {
            jumlah = gapok
          } else if (k.kode === 'bpjs_kesehatan') {
            jumlah = bpjsKes.karyawan
          } else if (k.kode === 'bpjs_jht') {
            jumlah = bpjsTK.jhtKaryawan
          } else if (k.kode === 'bpjs_jp') {
            jumlah = bpjsTK.jpKaryawan
          } else if (k.kode === 'pph21') {
            jumlah = pph21
          }
        }

        return {
          komponenId: k.id,
          tipe: k.tipe as 'penerimaan' | 'potongan',
          kode: k.kode,
          nama: k.nama,
          jumlah,
          objekPajak: k.objekPajak,
          urutan: k.urutan,
        }
      })

      const totalPenerimaan = detailItems
        .filter((d) => d.tipe === 'penerimaan')
        .reduce((s, d) => s + d.jumlah, 0)
      const totalPotongan = detailItems
        .filter((d) => d.tipe === 'potongan')
        .reduce((s, d) => s + d.jumlah, 0)

      const bpjsKaryawanTotal = bpjsKes.karyawan + bpjsTK.jhtKaryawan + bpjsTK.jpKaryawan
      const bpjsPerusahaanTotal = bpjsKes.perusahaan + bpjsTK.jhtPerusahaan + bpjsTK.jpPerusahaan + bpjsTK.jkk + bpjsTK.jkm

      await db.transaction(async (tx) => {
        // BUG #12 FIX: Check for duplicates inside transaction to prevent race condition
        const existing = await tx.query.penggajian.findFirst({
          where: and(
            eq(penggajian.unitId, data.unitId),
            eq(penggajian.pegawaiId, p.id),
            eq(penggajian.periode, data.periode),
          ),
        })
        if (existing) { skipped++; return }

        const [payroll] = await tx.insert(penggajian).values({
          unitId: data.unitId,
          pegawaiId: p.id,
          periode: data.periode,
          gajiPokok: gapok,
          totalPenerimaan,
          totalPotongan,
          pph21,
          bpjsKaryawan: bpjsKaryawanTotal,
          bpjsPerusahaan: bpjsPerusahaanTotal,
          totalDiterima: totalPenerimaan - totalPotongan,
          status: 'draft',
        }).returning()

        await tx.insert(penggajianDetail).values(
          detailItems.map((d) => ({
            penggajianId: payroll.id,
            komponenId: d.komponenId,
            tipe: d.tipe,
            kode: d.kode,
            nama: d.nama,
            jumlah: d.jumlah,
            objekPajak: d.objekPajak,
            urutan: d.urutan,
          }))
        )
        created++
      })
    }

    return { created, skipped }
  })

export const getPenggajianKomponen = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
    return db.query.penggajianKomponen.findMany({
      where: eq(penggajianKomponen.unitId, data.unitId),
      orderBy: (k, { asc }) => [asc(k.urutan), asc(k.nama)],
    })
  })

export const createKomponen = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(),
    nama: z.string().min(2),
    tipe: z.enum(['penerimaan', 'potongan']),
    kode: z.string().min(1),
    defaultJumlah: z.number().int().optional().default(0),
    objekPajak: z.boolean().optional().default(true),
    hitungOtomatis: z.boolean().optional().default(false),
    urutan: z.number().int().optional().default(0),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    const [created] = await db.insert(penggajianKomponen).values(data).returning()
    return created
  })

export const updateKomponen = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string().uuid(),
    nama: z.string().min(2).optional(),
    defaultJumlah: z.number().int().optional(),
    objekPajak: z.boolean().optional(),
    aktif: z.boolean().optional(),
    urutan: z.number().int().optional(),
  }))
  .handler(async ({ data: { id, ...updates } }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.penggajianKomponen.findFirst({ where: eq(penggajianKomponen.id, id) })
    if (!existing) throw new Error('Komponen tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    const [updated] = await db.update(penggajianKomponen).set(updates).where(eq(penggajianKomponen.id, id)).returning()
    return updated
  })

export const deleteKomponen = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.penggajianKomponen.findFirst({ where: eq(penggajianKomponen.id, data.id) })
    if (!existing) throw new Error('Komponen tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)
    
    // Check for existing payroll detail references
    const existingDetail = await db.query.penggajianDetail.findFirst({ 
      where: eq(penggajianDetail.komponenId, data.id) 
    })
    if (existingDetail) throw new Error('Tidak dapat menghapus komponen yang masih digunakan dalam data penggajian')
    
    await db.delete(penggajianKomponen).where(eq(penggajianKomponen.id, data.id))
    return { deleted: true }
  })

export const updatePenggajian = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string().uuid(),
    detailItems: z.array(z.object({
      id: z.string().uuid().optional(),
      kode: z.string().min(1),
      nama: z.string().min(1),
      tipe: z.enum(['penerimaan', 'potongan']),
      jumlah: z.number().int(),
      objekPajak: z.boolean().optional().default(true),
    })).optional(),
    keterangan: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.penggajian.findFirst({
      where: eq(penggajian.id, data.id),
      with: { pegawai: true },
    })
    if (!existing) throw new Error('Data tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    if (data.detailItems && data.detailItems.length > 0) {
      await db.transaction(async (tx) => {
        await tx.delete(penggajianDetail).where(eq(penggajianDetail.penggajianId, data.id))

        const items = data.detailItems!.map((d, i) => ({
          penggajianId: data.id,
          tipe: d.tipe,
          kode: d.kode,
          nama: d.nama,
          jumlah: d.jumlah,
          objekPajak: d.objekPajak ?? true,
          urutan: i + 1,
        }))
        await tx.insert(penggajianDetail).values(items)

        const totalPenerimaan = items
          .filter((i) => i.tipe === 'penerimaan')
          .reduce((s, i) => s + i.jumlah, 0)
        const totalPotongan = items
          .filter((i) => i.tipe === 'potongan')
          .reduce((s, i) => s + i.jumlah, 0)

        const bruto = totalPenerimaan
        const pph21 = hitungPph21(bruto, existing.pegawai?.statusPajak || 'TK/0')
        const bpjsKes = hitungBpjsKesehatan(bruto)
        const bpjsTK = hitungBpjsTK(bruto)
        const bpjsKaryawan = bpjsKes.karyawan + bpjsTK.jhtKaryawan + bpjsTK.jpKaryawan
        const bpjsPerusahaan = bpjsKes.perusahaan + bpjsTK.jhtPerusahaan + bpjsTK.jpPerusahaan + bpjsTK.jkk + bpjsTK.jkm

        await tx.update(penggajian)
          .set({
            totalPenerimaan,
            totalPotongan,
            pph21,
            bpjsKaryawan,
            bpjsPerusahaan,
            totalDiterima: totalPenerimaan - totalPotongan,
            updatedAt: new Date(),
          })
          .where(eq(penggajian.id, data.id))
      })
    } else if (data.keterangan !== undefined) {
      await db.update(penggajian).set({ keterangan: data.keterangan, updatedAt: new Date() }).where(eq(penggajian.id, data.id))
    }

    const [result] = await db.select().from(penggajian).where(eq(penggajian.id, data.id))
    return result
  })

export const approvePenggajian = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.penggajian.findFirst({
      where: eq(penggajian.id, data.id),
    })
    if (!existing) throw new Error('Data tidak ditemukan')

    // BUG #12 FIX: Verify super admin from database, not session
    const isSuperAdmin = await verifySuperAdmin(session.user.id)

    if (!isSuperAdmin) {
      const userUnitRecord = await db.query.userUnit.findFirst({
        where: and(
          eq(userUnit.userId, session.user.id),
          eq(userUnit.unitId, existing.unitId),
          eq(userUnit.isBendahara, true),
        ),
      })
      if (!userUnitRecord) throw new Error('Hanya bendahara yang dapat menyetujui penggajian')
    }

    await db.update(penggajian)
      .set({
        status: 'disetujui',
        approvedBy: session.user.id,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date(),
      })
      .where(eq(penggajian.id, data.id))

    return { success: true }
  })

export const rejectPenggajian = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.penggajian.findFirst({
      where: eq(penggajian.id, data.id),
    })
    if (!existing) throw new Error('Data tidak ditemukan')

    // BUG #12 FIX: Verify super admin from database, not session
    const isSuperAdmin = await verifySuperAdmin(session.user.id)

    if (!isSuperAdmin) {
      const userUnitRecord = await db.query.userUnit.findFirst({
        where: and(
          eq(userUnit.userId, session.user.id),
          eq(userUnit.unitId, existing.unitId),
          eq(userUnit.isBendahara, true),
        ),
      })
      if (!userUnitRecord) throw new Error('Hanya bendahara yang dapat membatalkan persetujuan')
    }

    await db.update(penggajian)
      .set({
        status: 'dibatalkan',
        approvedBy: null,
        approvedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(penggajian.id, data.id))

    return { success: true }
  })

export const bayarPenggajian = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid(), tanggalBayar: z.string().optional(), bankAccountId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.penggajian.findFirst({
      where: eq(penggajian.id, data.id),
      with: { pegawai: true },
    })
    if (!existing) throw new Error('Data tidak ditemukan')
    if (existing.status !== 'disetujui') throw new Error('Penggajian harus disetujui terlebih dahulu')

    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const kategori = await ensureKategori('Gaji & Honorer', 'pengeluaran', '411121')
    const tgl = data.tanggalBayar || new Date().toISOString().slice(0, 10)

    let ktRow: typeof kasTransaksi.$inferSelect | undefined
    await db.transaction(async (tx) => {
      // BUG #9 FIX: Use FOR UPDATE to acquire row lock and prevent race condition
      const [locked] = await tx.select().from(penggajian)
        .where(eq(penggajian.id, data.id))
        .for('update')
      if (!locked || locked.status !== 'disetujui') throw new Error('Penggajian sudah diproses atau status berubah')

      // BUG #5 FIX: Reverse old bank balance before deleting old kasTransaksi
      const oldKtRows = await tx.query.kasTransaksi.findMany({ where: eq(kasTransaksi.referensi, `gaji/${data.id}`) })
      for (const oldKt of oldKtRows) {
        if (oldKt.bankAccountId) {
          await tx.update(bankAccount)
            .set({ saldo: sql`${bankAccount.saldo} + ${oldKt.jumlah}`, updatedAt: new Date() })
            .where(eq(bankAccount.id, oldKt.bankAccountId))
        }
      }

      await tx.delete(kasTransaksi).where(eq(kasTransaksi.referensi, `gaji/${data.id}`))

      // BUG #11 FIX: Check bank balance sufficiency with row lock
      if (data.bankAccountId) {
        const [bank] = await tx.select().from(bankAccount)
          .where(eq(bankAccount.id, data.bankAccountId))
          .for('update')
        if (bank && bank.saldo - locked.totalDiterima < 0) {
          throw new Error(`Saldo ${bank.namaBank} tidak mencukupi. Saldo: Rp${bank.saldo.toLocaleString('id-ID')}, dibutuhkan: Rp${locked.totalDiterima.toLocaleString('id-ID')}`)
        }
      }

      const [row] = await tx.insert(kasTransaksi).values({
        unitId: locked.unitId,
        kategoriId: kategori.id,
        bankAccountId: data.bankAccountId || null,
        tipe: 'pengeluaran', refType: 'gaji',
        refId: data.id,
        jumlah: locked.totalDiterima,
        keterangan: `Penggajian: ${existing.pegawai?.nama || '-'} — ${locked.periode}`,
        tanggal: tgl,
        referensi: `gaji/${data.id}`,
        createdBy: session.user.id,
      }).returning()
      ktRow = row

      if (data.bankAccountId) {
        await tx.update(bankAccount)
          .set({ saldo: sql`${bankAccount.saldo} - ${locked.totalDiterima}`, updatedAt: new Date() })
          .where(eq(bankAccount.id, data.bankAccountId))
      }

      await tx.update(penggajian)
        .set({ status: 'dibayar', tanggalBayar: tgl, updatedAt: new Date() })
        .where(eq(penggajian.id, data.id))
    })

    try {
      await generateJurnalKas(
        existing.unitId, 'pengeluaran', existing.totalDiterima,
        kategori.id, null, tgl,
        `gaji/${data.id}`,
        `Penggajian: ${existing.pegawai?.nama || '-'} — ${existing.periode}`,
        session.user.id, ktRow!.id,
      )
    } catch (e) { console.error('Journal generation failed for payroll:', e) }

    return { success: true }
  })

export const deletePenggajian = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const existing = await db.query.penggajian.findFirst({
      where: eq(penggajian.id, data.id),
      with: { pegawai: true },
    })
    if (!existing) throw new Error('Data tidak ditemukan')
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, existing.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    await db.transaction(async (tx) => {
      // BUG #6 FIX: Reverse bank balance before deleting kasTransaksi
      const ktRows = await tx.query.kasTransaksi.findMany({ where: eq(kasTransaksi.referensi, `gaji/${data.id}`) })
      for (const kt of ktRows) {
        if (kt.bankAccountId && kt.tipe === 'pengeluaran') {
          await tx.update(bankAccount)
            .set({ saldo: sql`${bankAccount.saldo} + ${kt.jumlah}`, updatedAt: new Date() })
            .where(eq(bankAccount.id, kt.bankAccountId))
        }
        const jhs = await tx.query.jurnalHeader.findMany({ where: eq(jurnalHeader.transaksiId, kt.id) })
        for (const jh of jhs) {
          await tx.delete(jurnalDetail).where(eq(jurnalDetail.jurnalId, jh.id))
          await tx.delete(jurnalHeader).where(eq(jurnalHeader.id, jh.id))
        }
      }
      await tx.delete(kasTransaksi).where(eq(kasTransaksi.referensi, `gaji/${data.id}`))
      await tx.delete(penggajianDetail).where(eq(penggajianDetail.penggajianId, data.id))
      await tx.delete(penggajian).where(eq(penggajian.id, data.id))
    })
    return { deleted: true }
  })

export const seedPenggajianKomponen = createServerFn({ method: 'POST' })
  .validator(z.object({ unitId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const defaults = [
      { unitId: data.unitId, nama: 'Gaji Pokok', tipe: 'penerimaan' as const, kode: 'gaji_pokok', objekPajak: true, hitungOtomatis: false, urutan: 1 },
      { unitId: data.unitId, nama: 'BPJS Kesehatan', tipe: 'potongan' as const, kode: 'bpjs_kesehatan', objekPajak: false, hitungOtomatis: true, urutan: 2 },
      { unitId: data.unitId, nama: 'BPJS JHT', tipe: 'potongan' as const, kode: 'bpjs_jht', objekPajak: false, hitungOtomatis: true, urutan: 3 },
      { unitId: data.unitId, nama: 'BPJS JP', tipe: 'potongan' as const, kode: 'bpjs_jp', objekPajak: false, hitungOtomatis: true, urutan: 4 },
      { unitId: data.unitId, nama: 'PPh 21', tipe: 'potongan' as const, kode: 'pph21', objekPajak: false, hitungOtomatis: true, urutan: 5 },
    ]

    await db.insert(penggajianKomponen).values(defaults).onConflictDoNothing({ target: [penggajianKomponen.kode, penggajianKomponen.unitId] })

    return { success: true }
  })

export const prosesThr = createServerFn({ method: 'POST' })
  .validator(z.object({
    unitId: z.string().uuid(),
    periode: z.string(),
    tanggalReferensi: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const pegawaiList = await db.query.pegawai.findMany({
      where: and(
        eq(pegawai.unitId, data.unitId),
        eq(pegawai.aktif, true),
      ),
    })

    let created = 0
    let skipped = 0

    for (const p of pegawaiList) {
      if (!p.tanggalMasuk) { skipped++; continue }

      const gapok = p.gajiPokok || 0
      const thr = hitungThr(gapok, p.tanggalMasuk, data.tanggalReferensi)
      const pph21 = hitungPph21(thr, p.statusPajak || 'TK/0')

      await db.transaction(async (tx) => {
        // BUG #12 FIX: Check for duplicates inside transaction to prevent race condition
        const existing = await tx.query.penggajian.findFirst({
          where: and(
            eq(penggajian.unitId, data.unitId),
            eq(penggajian.pegawaiId, p.id),
            eq(penggajian.periode, data.periode),
          ),
        })
        if (existing) { skipped++; return }

        const [payroll] = await tx.insert(penggajian).values({
          unitId: data.unitId,
          pegawaiId: p.id,
          periode: data.periode,
          gajiPokok: gapok,
          totalPenerimaan: thr,
          totalPotongan: pph21,
          pph21,
          bpjsKaryawan: 0,
          bpjsPerusahaan: 0,
          totalDiterima: thr - pph21,
          status: 'draft',
        }).returning()

        await tx.insert(penggajianDetail).values([
          {
            penggajianId: payroll.id,
            tipe: 'penerimaan',
            kode: 'thr',
            nama: 'THR',
            jumlah: thr,
            objekPajak: true,
            urutan: 1,
          },
          {
            penggajianId: payroll.id,
            tipe: 'potongan',
            kode: 'pph21',
            nama: 'PPh 21',
            jumlah: pph21,
            objekPajak: false,
            urutan: 2,
          },
        ])
        created++
      })
    }

    return { created, skipped }
  })

export const getLaporanPph21 = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string(), periode: z.string() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    let unitCondition
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await resolveYayasanUnitIds(session.user.id)
      unitCondition = inArray(penggajian.unitId, unitIds)
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      unitCondition = eq(penggajian.unitId, data.unitId)
    }

    const records = await db.query.penggajian.findMany({
      where: and(unitCondition, eq(penggajian.periode, data.periode), eq(penggajian.status, 'dibayar')),
      with: { pegawai: true },
      orderBy: (g, { asc }) => [asc(g.pegawaiId)],
    })

    const rows = records.map((r) => ({
      pegawaiNama: r.pegawai?.nama ?? '',
      nip: r.pegawai?.nip ?? '',
      statusPajak: r.pegawai?.statusPajak ?? '',
      gajiPokok: r.gajiPokok,
      pph21: r.pph21 ?? 0,
    }))

    const totalGaji = rows.reduce((s, r) => s + r.gajiPokok, 0)
    const totalPph21 = rows.reduce((s, r) => s + r.pph21, 0)

    return { rows, totalGaji, totalPph21 }
  })

export const getRekapPenggajian = createServerFn({ method: 'GET' })
  .validator(z.object({ unitId: z.string(), periode: z.string().optional() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    let unitCondition
    if (data.unitId === 'all' || data.unitId === 'semua') {
      const unitIds = await resolveYayasanUnitIds(session.user.id)
      unitCondition = inArray(penggajian.unitId, unitIds)
    } else {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      unitCondition = eq(penggajian.unitId, data.unitId)
    }

    const conditions: any[] = [unitCondition]
    if (data.periode) conditions.push(eq(penggajian.periode, data.periode))

    const rows = await db
      .select({
        periode: penggajian.periode,
        totalPegawai: sql<number>`count(*)::int`,
        totalPenerimaan: sql<number>`coalesce(sum(${penggajian.totalPenerimaan})::bigint, 0)`,
        totalPotongan: sql<number>`coalesce(sum(${penggajian.totalPotongan})::bigint, 0)`,
        totalPph21: sql<number>`coalesce(sum(${penggajian.pph21})::bigint, 0)`,
        totalBpjsKaryawan: sql<number>`coalesce(sum(${penggajian.bpjsKaryawan})::bigint, 0)`,
        totalBpjsPerusahaan: sql<number>`coalesce(sum(${penggajian.bpjsPerusahaan})::bigint, 0)`,
        totalDibayar: sql<number>`coalesce(sum(${penggajian.totalDiterima})::bigint, 0)`,
      })
      .from(penggajian)
      .where(and(...conditions))
      .groupBy(penggajian.periode)
      .orderBy(sql`max(${penggajian.createdAt}) desc`)

    const grandTotal = rows.length > 0
      ? {
          totalPenerimaan: rows.reduce((s, r) => s + Number(r.totalPenerimaan), 0),
          totalPph21: rows.reduce((s, r) => s + Number(r.totalPph21), 0),
          totalBpjsPerusahaan: rows.reduce((s, r) => s + Number(r.totalBpjsPerusahaan), 0),
          totalDibayar: rows.reduce((s, r) => s + Number(r.totalDibayar), 0),
        }
      : { totalPenerimaan: 0, totalPph21: 0, totalBpjsPerusahaan: 0, totalDibayar: 0 }

    return { rows, grandTotal }
  })

export const getPegawaiDetail = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const pegawaiData = await db.query.pegawai.findFirst({
      where: eq(pegawai.id, data.id),
      with: {
        unit: true,
        mapelAssignments: { with: { mataPelajaran: true } },
      },
    })
    if (!pegawaiData) return null

    const penggajianList = await db.query.penggajian.findMany({
      where: eq(penggajian.pegawaiId, data.id),
      with: { details: true },
      orderBy: (p, { desc }) => [desc(p.periode)],
    })

    return {
      ...pegawaiData,
      penggajian: penggajianList.map((p) => ({
        ...p,
        totalPenerimaan: p.totalPenerimaan,
        totalPotongan: p.totalPotongan,
        pph21: p.pph21,
        bpjsKaryawan: p.bpjsKaryawan,
        bpjsPerusahaan: p.bpjsPerusahaan,
        totalDiterima: p.totalDiterima,
      })),
    }
  })

export const getPenggajianByPegawai = createServerFn({ method: 'GET' })
  .validator(z.object({ pegawaiId: z.string().uuid(), unitId: z.string().optional() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const pegawaiData = await db.query.pegawai.findFirst({
      where: eq(pegawai.id, data.pegawaiId),
      with: { unit: true },
    })
    if (!pegawaiData) return { pegawai: null, unit: null, list: [] }

    const conditions: any[] = [eq(penggajian.pegawaiId, data.pegawaiId)]
    if (data.unitId && data.unitId !== 'all' && data.unitId !== 'semua') {
      const { requireUnitAccess } = await import('#/lib/unit-guard.server')
    await requireUnitAccess(session.user.id, data.unitId, (session.user as any).isSuperAdmin)
      conditions.push(eq(penggajian.unitId, data.unitId))
    }

    const list = await db.query.penggajian.findMany({
      where: and(...conditions),
      with: { details: true },
      orderBy: (p, { desc }) => [desc(p.periode)],
    })

    return {
      pegawai: pegawaiData,
      unit: pegawaiData.unit,
      list: list.map((p) => ({
        ...p,
        totalPenerimaan: p.totalPenerimaan,
        totalPotongan: p.totalPotongan,
        pph21: p.pph21,
        bpjsKaryawan: p.bpjsKaryawan,
        bpjsPerusahaan: p.bpjsPerusahaan,
        totalDiterima: p.totalDiterima,
      })),
    }
  })
