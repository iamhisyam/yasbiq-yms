import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { siswa, kelas } from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'
import * as XLSX from 'xlsx'

const ImportRowSchema = z.object({
  nis: z.string().min(1, 'NIS wajib diisi'),
  nama: z.string().min(2, 'Nama minimal 2 karakter'),
  kelas: z.string().min(1, 'Kelas wajib diisi'),
  jenisKelamin: z.enum(['L', 'P']).optional(),
  tanggalLahir: z.string().optional(),
  alamat: z.string().optional(),
  tahunMasuk: z.number().int().min(2000).max(2099),
})

type ImportRow = z.infer<typeof ImportRowSchema>

interface ImportResult {
  success: number
  skipped: number
  errors: { row: number; message: string }[]
}

async function getSessionOrThrow() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request!.headers })
  if (!session?.user) throw new Error('Unauthenticated')
  return session
}

function normalizeHeader(h: string): string {
  const map: Record<string, string> = {
    nis: 'nis',
    'nomor induk': 'nis',
    'no induk': 'nis',
    nama: 'nama',
    'nama lengkap': 'nama',
    kelas: 'kelas',
    'jenis kelamin': 'jenisKelamin',
    'kelamin': 'jenisKelamin',
    jk: 'jenisKelamin',
    'tanggal lahir': 'tanggalLahir',
    'tgl lahir': 'tanggalLahir',
    tgl_lahir: 'tanggalLahir',
    alamat: 'alamat',
    'tahun masuk': 'tahunMasuk',
    'thn masuk': 'tahunMasuk',
  }
  return map[h.toLowerCase().trim()] || h
}

function parseTanggalLahir(val: any): string {
  if (!val) return ''
  if (typeof val === 'string') {
    const d = new Date(val)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    return val
  }
  if (val instanceof Date) return val.toISOString().split('T')[0]
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }
  return String(val)
}

export const importSiswa = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      unitId: z.string().uuid(),
      fileBase64: z.string(),
      fileName: z.string(),
    }),
  )
  .handler(async ({ data }): Promise<ImportResult> => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, data.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const decodedSize = Math.ceil((data.fileBase64.length * 3) / 4)
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
    if (decodedSize > MAX_FILE_SIZE) {
      return { success: 0, skipped: 0, errors: [{ row: 0, message: 'Ukuran file terlalu besar. Maksimal 5 MB.' }] }
    }

    const allowedExtensions = ['.xlsx', '.xls', '.csv']
    const ext = '.' + (data.fileName.split('.').pop() || '').toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      return { success: 0, skipped: 0, errors: [{ row: 0, message: 'Tipe file tidak didukung. Gunakan file .xlsx, .xls, atau .csv.' }] }
    }

    const buf = Buffer.from(data.fileBase64, 'base64')
    const workbook = XLSX.read(buf, { type: 'buffer', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (rawRows.length === 0) {
      return { success: 0, skipped: 0, errors: [{ row: 0, message: 'File kosong atau tidak memiliki data' }] }
    }

    const headers = Object.keys(rawRows[0])
    const fieldKeys = headers.map((h) => normalizeHeader(h))

    const rows: ImportRow[] = rawRows.map((r) => {
      const row: any = {}
      headers.forEach((h, i) => {
        const key = fieldKeys[i]
        const val = r[h]
        if (key === 'tahunMasuk') row[key] = typeof val === 'number' ? val : parseInt(String(val), 10) || new Date().getFullYear()
        else if (key === 'tanggalLahir') row[key] = parseTanggalLahir(val)
        else if (key === 'jenisKelamin') {
          const v = String(val).trim().toUpperCase()
          row[key] = v === 'L' || v === 'LAKI-LAKI' || v === 'LAKI' ? 'L' : v === 'P' || v === 'PEREMPUAN' ? 'P' : ''
        } else row[key] = String(val).trim()
      })
      return row
    })

    const result: ImportResult = { success: 0, skipped: 0, errors: [] }
    const existingNisList = await db
      .select({ nis: siswa.nis })
      .from(siswa)
      .where(eq(siswa.unitId, data.unitId))
    const existingNisSet = new Set(existingNisList.map((s) => s.nis))

    // Pre-fetch all kelas for this unit
    const allKelas = await db
      .select({ id: kelas.id, nama: kelas.nama })
      .from(kelas)
      .where(eq(kelas.unitId, data.unitId))
    const kelasMap = new Map(allKelas.map((k) => [k.nama.toLowerCase().trim(), k.id]))

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2
      const parsed = ImportRowSchema.safeParse(rows[i])

      if (!parsed.success) {
        const msgs = parsed.error.issues.map((iss) => `${iss.path.join('.')}: ${iss.message}`).join('; ')
        result.errors.push({ row: rowNum, message: msgs })
        continue
      }

      if (existingNisSet.has(parsed.data.nis)) {
        result.errors.push({ row: rowNum, message: `NIS "${parsed.data.nis}" sudah terdaftar` })
        continue
      }

      const { kelas: kelasName, ...rest } = parsed.data
      const kelasId = kelasMap.get(kelasName.toLowerCase().trim())
      if (!kelasId) {
        result.errors.push({ row: rowNum, message: `Kelas "${kelasName}" tidak ditemukan di unit ini` })
        continue
      }

      try {
        await db.insert(siswa).values({
          unitId: data.unitId,
          ...rest,
          kelasId,
          status: 'aktif',
        })
        existingNisSet.add(parsed.data.nis)
        result.success++
      } catch (err: any) {
        result.errors.push({ row: rowNum, message: err.message || 'Gagal menyimpan' })
      }
    }

    return result
  })

export const downloadTemplate = createServerFn({ method: 'GET' })
  .handler(async () => {
    const wb = XLSX.utils.book_new()
    const headerRow = ['NIS', 'Nama Lengkap', 'Kelas', 'Jenis Kelamin', 'Tanggal Lahir', 'Alamat', 'Tahun Masuk']
    const exampleRow = ['2024001', 'Ahmad Fauzi', '7A', 'L', '2012-05-15', 'Jl. Merdeka No. 1', 2024]

    const ws = XLSX.utils.aoa_to_sheet([headerRow, exampleRow])
    XLSX.utils.book_append_sheet(wb, ws, 'Template')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const base64 = buf.toString('base64')

    return { base64, fileName: 'Template_Import_Siswa.xlsx' }
  })
