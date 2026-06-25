import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { pegawai } from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'
import * as XLSX from 'xlsx'

const ImportRowSchema = z.object({
  nip: z.string().optional(),
  nama: z.string().min(2, 'Nama minimal 2 karakter'),
  jenisKelamin: z.enum(['L', 'P']).optional(),
  tempatLahir: z.string().optional(),
  tanggalLahir: z.string().optional(),
  alamat: z.string().optional(),
  telepon: z.string().optional(),
  email: z.string().optional(),
  statusPegawai: z.string().optional(),
  jabatan: z.string().optional(),
  tanggalMasuk: z.string().optional(),
  pendidikanTerakhir: z.string().optional(),
  jurusan: z.string().optional(),
  bank: z.string().optional(),
  nomorRekening: z.string().optional(),
  gajiPokok: z.number().int().optional().default(0),
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
    nip: 'nip',
    nik: 'nip',
    'nomor induk pegawai': 'nip',
    nama: 'nama',
    'nama lengkap': 'nama',
    'jenis kelamin': 'jenisKelamin',
    kelamin: 'jenisKelamin',
    jk: 'jenisKelamin',
    'tempat lahir': 'tempatLahir',
    'tgl lahir': 'tanggalLahir',
    'tanggal lahir': 'tanggalLahir',
    tgl_lahir: 'tanggalLahir',
    alamat: 'alamat',
    telepon: 'telepon',
    telp: 'telepon',
    'no telp': 'telepon',
    hp: 'telepon',
    email: 'email',
    'status pegawai': 'statusPegawai',
    status: 'statusPegawai',
    jabatan: 'jabatan',
    'tanggal masuk': 'tanggalMasuk',
    'tgl masuk': 'tanggalMasuk',
    'pendidikan terakhir': 'pendidikanTerakhir',
    'pendidikan': 'pendidikanTerakhir',
    jurusan: 'jurusan',
    bank: 'bank',
    'no rekening': 'nomorRekening',
    'nomor rekening': 'nomorRekening',
    'norek': 'nomorRekening',
    'gaji pokok': 'gajiPokok',
    gaji: 'gajiPokok',
  }
  return map[h.toLowerCase().trim()] || h
}

function parseTanggal(val: any): string {
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

export const importPegawai = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      unitId: z.string().uuid(),
      fileBase64: z.string(),
      fileName: z.string(),
    }),
  )
  .handler(async ({ data: input }): Promise<ImportResult> => {
    const session = await getSessionOrThrow()
    const { requireMinimumRole } = await import('#/lib/unit-guard.server')
    await requireMinimumRole(session.user.id, input.unitId, 'admin_yayasan', (session.user as any).isSuperAdmin)

    const buf = Buffer.from(input.fileBase64, 'base64')
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
        if (key === 'gajiPokok') row[key] = typeof val === 'number' ? val : parseInt(String(val).replace(/[^0-9]/g, ''), 10) || 0
        else if (key === 'tanggalLahir' || key === 'tanggalMasuk') row[key] = parseTanggal(val)
        else if (key === 'jenisKelamin') {
          const v = String(val).trim().toUpperCase()
          row[key] = v === 'L' || v === 'LAKI-LAKI' || v === 'LAKI' ? 'L' : v === 'P' || v === 'PEREMPUAN' ? 'P' : ''
        } else row[key] = String(val).trim()
      })
      return row
    })

    const result: ImportResult = { success: 0, skipped: 0, errors: [] }

    const existingPegawaiList = await db
      .select({ nip: pegawai.nip, nama: pegawai.nama })
      .from(pegawai)
      .where(eq(pegawai.unitId, input.unitId))
    const existingNipSet = new Set(existingPegawaiList.map((p) => p.nip).filter(Boolean))
    const existingNamaSet = new Set(existingPegawaiList.map((p) => p.nama))

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2
      const parsed = ImportRowSchema.safeParse(rows[i])

      if (!parsed.success) {
        const msgs = parsed.error.issues.map((iss) => `${iss.path.join('.')}: ${iss.message}`).join('; ')
        result.errors.push({ row: rowNum, message: msgs })
        continue
      }

      const rowData = parsed.data

      if (rowData.nip && existingNipSet.has(rowData.nip)) {
        result.errors.push({ row: rowNum, message: `NIP "${rowData.nip}" sudah terdaftar` })
        continue
      }

      if (!rowData.nip && existingNamaSet.has(rowData.nama)) {
        result.errors.push({ row: rowNum, message: `Nama "${rowData.nama}" sudah terdaftar (tanpa NIP)` })
        continue
      }

      try {
        await db.insert(pegawai).values({
          unitId: input.unitId,
          nip: rowData.nip || null,
          nama: rowData.nama,
          jenisKelamin: rowData.jenisKelamin || null,
          tempatLahir: rowData.tempatLahir || null,
          tanggalLahir: rowData.tanggalLahir || null,
          alamat: rowData.alamat || null,
          telepon: rowData.telepon || null,
          email: rowData.email || null,
          statusPegawai: rowData.statusPegawai || 'honorer',
          jabatan: rowData.jabatan || 'guru_mapel',
          tanggalMasuk: rowData.tanggalMasuk || null,
          pendidikanTerakhir: rowData.pendidikanTerakhir || null,
          jurusan: rowData.jurusan || null,
          bank: rowData.bank || null,
          nomorRekening: rowData.nomorRekening || null,
          gajiPokok: rowData.gajiPokok ?? 0,
          aktif: true,
        } as any)
        if (rowData.nip) existingNipSet.add(rowData.nip)
        existingNamaSet.add(rowData.nama)
        result.success++
      } catch (err: any) {
        result.errors.push({ row: rowNum, message: err.message || 'Gagal menyimpan' })
      }
    }

    return result
  })

export const downloadTemplatePegawai = createServerFn({ method: 'GET' })
  .handler(async () => {
    const wb = XLSX.utils.book_new()
    const headerRow = [
      'NIP', 'Nama Lengkap', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir',
      'Alamat', 'Telepon', 'Email', 'Status Pegawai', 'Jabatan',
      'Tanggal Masuk', 'Pendidikan Terakhir', 'Jurusan', 'Bank', 'No. Rekening',
      'Gaji Pokok',
    ]
    const exampleRow = [
      '1987654321', 'Siti Rahmawati, S.Pd.', 'P', 'Jakarta', '1990-03-15',
      'Jl. Mawar No. 10', '08123456789', 'siti@email.com', 'pns', 'guru_mapel',
      '2015-07-01', 'S1', 'Pendidikan Matematika', 'BSI', '1234567890',
      3500000,
    ]

    const ws = XLSX.utils.aoa_to_sheet([headerRow, exampleRow])
    ws['!cols'] = headerRow.map(() => ({ wch: 18 }))
    XLSX.utils.book_append_sheet(wb, ws, 'Template')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const base64 = buf.toString('base64')

    return { base64, fileName: 'Template_Import_Pegawai.xlsx' }
  })
