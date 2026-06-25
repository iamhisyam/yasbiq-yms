import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '#/db/index.server'
import {
  unit, tahunAjaran, tingkat, kelas, siswa, pegawai, penggajian, penggajianDetail, penggajianKomponen,
  sppSetting, tagihan, tagihanItem, tagihanSiswa, pembayaran,
  kasKategori, kasTransaksi, bankAccount, vendor, hutangPiutang, anggaran,
  asetTetap, dana, bosPeriode, bosRkas, bosRealisasi,
  beasiswa, siswaBeasiswa, yayasan, userUnit, coa, jurnalHeader, jurnalDetail,
} from '#/db/schema/index'
import { auth } from '#/lib/auth'
import { getRequest } from '@tanstack/react-start/server'
import { seedCoaAndKategori } from './keuangan'
import { ensureKategori } from './keuangan-utils.server'
import { BULAN_NAMES } from '#/lib/format'

async function getSessionOrThrow() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request!.headers })
  if (!session?.user) throw new Error('Unauthenticated')
  return session
}

const TA = '2026/2027'
const TAHUN_SPP = 2026
const thn = (m: number) => TAHUN_SPP + Math.floor((m - 1) / 12)
const bln = (m: number) => ((m - 1) % 12) + 1
const tgl = (m: number, d: number) => {
  const y = thn(m); const b = bln(m)
  return `${y}-${String(b).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
const pad = (n: number, len = 3) => String(n).padStart(len, '0')

// ─── TK Pegawai Data (7 pegawai) ──────────────────────────────────────────────

const TK_PEGAWAI = [
  { nip: '19800101', nama: 'Siti Aisyah', jabatan: 'kepala_sekolah', statusPegawai: 'tetap', gajiPokok: 3500000, statusPajak: 'K/2' },
  { nip: '19900101', nama: 'Ahmad Rizki', jabatan: 'guru_kelas', statusPegawai: 'tetap', gajiPokok: 2500000, statusPajak: 'K/1' },
  { nip: '19950101', nama: 'Dewi Sartika', jabatan: 'guru_kelas', statusPegawai: 'honorer', gajiPokok: 1800000, statusPajak: 'TK/1' },
  { nip: '20000101', nama: 'Budi Hartono', jabatan: 'tata_usaha', statusPegawai: 'tetap', gajiPokok: 2200000, statusPajak: 'TK/0' },
  { nip: '19910901', nama: 'Dian Permata', jabatan: 'bendahara', statusPegawai: 'tetap', gajiPokok: 2000000, statusPajak: 'K/1' },
  { nip: '19850701', nama: 'Suharno', jabatan: 'staff', statusPegawai: 'tetap', gajiPokok: 1200000, statusPajak: 'K/2' },
  { nip: '19980801', nama: 'Maya Indah', jabatan: 'staff', statusPegawai: 'honorer', gajiPokok: 1500000, statusPajak: 'TK/0' },
]

// ─── SD Pegawai Data (13 pegawai) ─────────────────────────────────────────────

const SD_PEGAWAI = [
  { nip: '19800201', nama: 'Bambang Hermawan', jabatan: 'kepala_sekolah', statusPegawai: 'tetap', gajiPokok: 4000000, statusPajak: 'K/3' },
  { nip: '19900201', nama: 'Sri Wahyuni', jabatan: 'guru_kelas', statusPegawai: 'tetap', gajiPokok: 3000000, statusPajak: 'K/2' },
  { nip: '19950201', nama: 'Agus Susanto', jabatan: 'guru_kelas', statusPegawai: 'tetap', gajiPokok: 2800000, statusPajak: 'TK/1' },
  { nip: '20000201', nama: 'Nurhayati', jabatan: 'guru_kelas', statusPegawai: 'honorer', gajiPokok: 2000000, statusPajak: 'TK/0' },
  { nip: '19920202', nama: 'Ridwan Kamil', jabatan: 'guru_kelas', statusPegawai: 'tetap', gajiPokok: 2200000, statusPajak: 'K/1' },
  { nip: '19930302', nama: 'Indah Sari', jabatan: 'guru_kelas', statusPegawai: 'tetap', gajiPokok: 2500000, statusPajak: 'TK/1' },
  { nip: '19960402', nama: 'Kusnadi', jabatan: 'guru_kelas', statusPegawai: 'honorer', gajiPokok: 1700000, statusPajak: 'K/0' },
  { nip: '19850702', nama: 'Sari Dewi', jabatan: 'guru_mapel', statusPegawai: 'honorer', gajiPokok: 1500000, statusPajak: 'TK/0' },
  { nip: '19980802', nama: 'Slamet Riyadi', jabatan: 'guru_mapel', statusPegawai: 'tetap', gajiPokok: 1700000, statusPajak: 'TK/1' },
  { nip: '19910902', nama: 'Tri Handayani', jabatan: 'guru_mapel', statusPegawai: 'tetap', gajiPokok: 1800000, statusPajak: 'K/1' },
  { nip: '19820301', nama: 'Fitriani Nasution', jabatan: 'tata_usaha', statusPegawai: 'tetap', gajiPokok: 2200000, statusPajak: 'K/0' },
  { nip: '19900301', nama: 'Eko Prayitno', jabatan: 'bendahara', statusPegawai: 'tetap', gajiPokok: 2300000, statusPajak: 'K/1' },
  { nip: '19950301', nama: 'Sumarno', jabatan: 'staff', statusPegawai: 'tetap', gajiPokok: 1200000, statusPajak: 'K/2' },
]

// ─── Student Names ────────────────────────────────────────────────────────────

const TK_SISWA_NAMES = [
  'Alif Rahman', 'Bella Putri', 'Cahyo Nugroho', 'Dina Amelia', 'Evan Prasetya',
  'Fina Khairunnisa', 'Gilang Ramadan', 'Hana Safira', 'Iqbal Maulana', 'Jasmine Khairani',
  'Kiki Andriansyah', 'Lala Suryani', 'Maman Abdurrahman', 'Nina Zuliana', 'Omar Hidayat',
  'Putri Ayu Lestari', 'Qori Maulida', 'Rizky Aditya', 'Sinta Dewi', 'Tono Pratama',
  'Umi Kalsum', 'Vino Bastian', 'Wulan Sari', 'Xena Maharani', 'Yoga Pratama',
  'Zahra Ramadhani', 'Akmal Fauzi', 'Kayla Azzahra', 'Bima Sakti', 'Cinta Rahayu',
]

const SD_SISWA_NAMES = (() => {
  const first = [
    'Adi','Bunga','Candra','Dewi','Eko','Fitri','Galih','Hesti','Irfan','Joko',
    'Kartika','Lukman','Mega','Nugroho','Olivia','Pandu','Qonita','Rizky','Sari','Teguh',
    'Ulya','Vera','Wawan','Yanti','Zaki','Ayu','Bagus','Citra','Dian','Erna',
    'Fajar','Gita','Hendra','Indah','Jati','Kurnia','Linda','Mira','Novi','Oscar',
    'Putu','Ratna','Surya','Tri','Utami','Vindi','Winda','Yudha','Zahra','Arif',
    'Bela','Cici','Doni','Eka','Fani','Gunawan','Herman','Intan','Jaya','Kirana',
  ]
  const last = [
    'Pratama','Wijaya','Kusuma','Ningrum','Santoso','Hidayat','Rahayu','Maulana',
    'Pertiwi','Nugroho','Susanti','Hermawan','Saputra','Lestari','Purnama',
  ]
  const names: string[] = []
  for (let i = 0; i < 120; i++) {
    names.push(`${first[i % first.length]} ${last[Math.floor(i / first.length) % last.length]}`)
  }
  return names
})()

// ─── Vendors Global ───────────────────────────────────────────────────────────

const VENDORS = [
  { nama: 'CV Alat Pendidikan', tipe: 'vendor' as const, npwp: '02.456.789.0-123.000', telepon: '021-5551234', kontak: 'Rudi Hermawan', alamat: 'Jl. Merdeka No. 45, Jakarta', keterangan: 'Supplier alat peraga pendidikan' },
  { nama: 'Toko Buku Cerdas', tipe: 'vendor' as const, npwp: '03.789.012.3-456.000', telepon: '021-5557890', kontak: 'Ani Susanti', alamat: 'Jl. Pintu Air Raya No. 12, Jakarta', keterangan: 'Supplier buku dan ATK' },
  { nama: 'PT Katering Sehat', tipe: 'vendor' as const, npwp: '04.012.345.6-789.000', telepon: '021-5553456', kontak: 'Hendra Kusuma', alamat: 'Jl. Gatot Subroto No. 88, Jakarta', keterangan: 'Katering makan siang siswa' },
  { nama: 'CV Renovasi Bangunan', tipe: 'supplier' as const, npwp: '05.345.678.9-012.000', telepon: '021-5555678', kontak: 'Surya Adinata', alamat: 'Jl. Pemuda No. 55, Jakarta', keterangan: 'Jasa renovasi dan pemeliharaan gedung' },
  { nama: 'UD Seragam Sekolah', tipe: 'vendor' as const, npwp: '06.678.901.2-345.000', telepon: '021-5559012', kontak: 'Lina Marlina', alamat: 'Jl. Kebon Jeruk No. 33, Jakarta', keterangan: 'Konveksi seragam sekolah' },
  { nama: 'CV Teknologi Edukasi', tipe: 'vendor' as const, npwp: '07.901.234.5-678.000', telepon: '021-5552345', kontak: 'Andi Prasetyo', alamat: 'Jl. Cikini Raya No. 21, Jakarta', keterangan: 'Penyedia perangkat IT dan software pendidikan' },
  { nama: 'Bank Syariah Indonesia (BSI)', tipe: 'vendor' as const, npwp: '01.234.567.8-901.000', telepon: '021-5556789', kontak: 'Customer Service', alamat: 'Jl. Thamrin No. 1, Jakarta', keterangan: 'Bank penyalur pinjaman pembangunan tanah' },
]

// ─── Payroll Calculation ──────────────────────────────────────────────────────

function calcPayroll(gajiPokok: number) {
  const bruto = gajiPokok
  const brutoCapped = Math.min(bruto, 12000000)
  const pph21 = Math.round(bruto * 0.025)
  const bpjsKes = Math.round(Math.min(bruto, 12000000) * 0.01)
  const bpjsJht = Math.round(Math.min(bruto, 12000000) * 0.02)
  const bpjsJp = Math.round(Math.min(bruto, 10400000) * 0.01)
  const bpjsKaryawan = bpjsKes + bpjsJht + bpjsJp
  const bpjsPerusahaan = Math.round(brutoCapped * 0.04) + Math.round(brutoCapped * 0.037) + Math.round(brutoCapped * 0.02) + Math.round(brutoCapped * 0.0024) + Math.round(brutoCapped * 0.003)
  const totalPotongan = pph21 + bpjsKaryawan
  return { bruto, pph21, bpjsKes, bpjsJht, bpjsJp, bpjsKaryawan, bpjsPerusahaan, totalPotongan, totalDiterima: bruto - totalPotongan }
}

// ─── Penggajian Komponen Template ─────────────────────────────────────────────

const KOMPONEN_GAJI = [
  { nama: 'Gaji Pokok', tipe: 'penerimaan' as const, kode: 'gaji_pokok', objekPajak: true, hitungOtomatis: false, urutan: 1 },
  { nama: 'PPh 21', tipe: 'potongan' as const, kode: 'pph21', objekPajak: false, hitungOtomatis: true, urutan: 2 },
  { nama: 'BPJS Kesehatan', tipe: 'potongan' as const, kode: 'bpjs_kesehatan', objekPajak: false, hitungOtomatis: true, urutan: 3 },
  { nama: 'BPJS JHT', tipe: 'potongan' as const, kode: 'bpjs_jht', objekPajak: false, hitungOtomatis: true, urutan: 4 },
  { nama: 'BPJS JP', tipe: 'potongan' as const, kode: 'bpjs_jp', objekPajak: false, hitungOtomatis: true, urutan: 5 },
]

// ═══════════════════════════════════════════════════════════════════════════════
// Seed Unit Helper
// ═══════════════════════════════════════════════════════════════════════════════

interface SeedUnitConfig {
  unitId: string
  type: 'tk' | 'sd'
  nominalSpp: number
  tahunAjaranId: string
}

interface SeedUnitResult {
  pegawai: { id: string; nama: string; gajiPokok: number }[]
  kelas: { id: string; nama: string }[]
  siswa: string[]
  banks: { id: string }[]
  errors: string[]
}

async function seedUnit(cfg: SeedUnitConfig, session: { user: { id: string } }, vendorMap: Record<string, string>, kategoriMap: Record<string, string>): Promise<SeedUnitResult> {
  const { unitId, type, nominalSpp, tahunAjaranId } = cfg
  const pegawaiData = type === 'tk' ? TK_PEGAWAI : SD_PEGAWAI
  const siswaNames = type === 'tk' ? TK_SISWA_NAMES : SD_SISWA_NAMES
  const nisPrefix = type === 'tk' ? 'TK-26-' : 'SD-26-'
  const unitName = type === 'tk' ? 'TK Annahl' : 'SD Annahl'
  const tagihanLainNama = type === 'tk' ? 'Kegiatan Semester Ganjil' : 'Buku Paket Semester'
  const tagihanLainNominal = type === 'tk' ? 200000 : 350000
  const bosAmount = type === 'tk' ? 8000000 : 15000000
  const bosRekening = type === 'tk' ? 'BSI 009876543210' : 'BRI 001122334455'
  const bankConfigs = type === 'tk'
    ? [{ namaBank: 'BSI Rekening TK', jenis: 'bank', saldoAwal: 0 }, { namaBank: 'Kas Tunai TK', jenis: 'kas', saldoAwal: 0 }]
    : [{ namaBank: 'BRI Rekening SD', jenis: 'bank', saldoAwal: 0 }, { namaBank: 'Kas Tunai SD', jenis: 'kas', saldoAwal: 0 }]

  // Multi-tingkat config: TK=1 tingkat×2kelas, SD=6 tingkat×1kelas
  const tingkatDefs = type === 'tk'
    ? [{ nama: 'TK', kode: 'TK', urutan: 1, kelasNames: ['TKA', 'TKB'], siswaPerKelas: 15 }]
    : Array.from({ length: 6 }, (_, i) => ({ nama: `Kelas ${i + 1}`, kode: `SD${i + 1}`, urutan: i + 1, kelasNames: [`Kelas ${i + 1}A`], siswaPerKelas: 20 }))
  // ─── Pegawai ──────────────────────────────────────────────────────────────
  const pegawaiRows: { id: string; nama: string; gajiPokok: number }[] = []
  for (const p of pegawaiData) {
    const [row] = await db.insert(pegawai).values({
      unitId, nip: p.nip, nama: p.nama, jabatan: p.jabatan,
      statusPegawai: p.statusPegawai, gajiPokok: p.gajiPokok,
      statusPajak: p.statusPajak, aktif: true,
    } as any).returning()
    pegawaiRows.push({ id: row.id, nama: row.nama, gajiPokok: row.gajiPokok ?? 0 })
  }

  // ─── Tingkat + Kelas + Siswa (multi-tingkat) ─────────────────────────────
  const tingkatRows: { id: string }[] = []
  const allKelas: { id: string; nama: string }[] = []
  const siswaIds: string[] = []
  let studentIdx = 0

  for (const td of tingkatDefs) {
    const [tr] = await db.insert(tingkat).values({
      unitId, nama: td.nama, kode: td.kode, urutan: td.urutan,
    }).returning()
    tingkatRows.push(tr)

    // SPP setting per tingkat
    await db.insert(sppSetting).values({ unitId, tingkatId: tr.id, nominal: nominalSpp, tahunAjaran: TA, tahunAjaranId })

    for (const kn of td.kelasNames) {
      const [kr] = await db.insert(kelas).values({ unitId, nama: kn, tingkatId: tr.id }).returning()
      allKelas.push(kr)

      for (let si = 0; si < td.siswaPerKelas; si++) {
        const [s] = await db.insert(siswa).values({
          unitId, nis: nisPrefix + pad(studentIdx + 1), nama: siswaNames[studentIdx],
          kelasId: kr.id, jenisKelamin: studentIdx % 2 === 0 ? 'L' : 'P',
          tahunMasuk: 2026, status: 'aktif',
        }).returning()
        siswaIds.push(s.id)
        studentIdx++
      }
    }
  }

  // Assign wali kelas (pegawai[0]=kepala, pegawai[1..totalKelas]=wali)
  for (let ki = 0; ki < allKelas.length; ki++) {
    const waliIdx = 1 + ki
    if (pegawaiRows[waliIdx]) {
      await db.update(kelas).set({ waliKelasId: pegawaiRows[waliIdx].id }).where(eq(kelas.id, allKelas[ki].id))
    }
  }

  // ─── Bank Accounts ────────────────────────────────────────────────────────
  const bankRows: { id: string }[] = []
  for (const bc of bankConfigs) {
    const [b] = await db.insert(bankAccount).values({
      unitId, namaBank: bc.namaBank, atasNama: unitName,
      nomorRekening: type === 'tk' ? (bc.jenis === 'bank' ? '7234567890' : '-') : (bc.jenis === 'bank' ? '1234567890' : '-'),
      saldoAwal: bc.saldoAwal, saldo: bc.saldoAwal, jenis: bc.jenis, aktif: true,
    } as any).returning()
    bankRows.push({ id: b.id })
  }

  // ─── SPP Tagihan (12 months) ──────────────────────────────────────────────
  const katSpp = await ensureKategori('Penerimaan SPP', 'pemasukan', '411281', '4.1.01')

  // Collect payment operations for batch processing
  const paymentOps: Array<() => Promise<void>> = []

  for (let m = 1; m <= 12; m++) {
    const judul = `SPP ${BULAN_NAMES[bln(m)]} ${thn(m)}`
    const [tg] = await db.insert(tagihan).values({
      unitId, jenis: 'spp', judul, tahunAjaran: TA, tahunAjaranId,
      bulan: bln(m), tahun: thn(m),
      nominal: nominalSpp * siswaIds.length, status: 'terbit',
      tanggalTerbit: tgl(m, 1), dueDate: tgl(m, 10), siswaCount: siswaIds.length,
    }).returning()

    await db.insert(tagihanItem).values({
      tagihanId: tg.id, nama: `SPP ${BULAN_NAMES[bln(m)]} ${thn(m)}`,
      qty: 1, hargaSatuan: nominalSpp, subtotal: nominalSpp,
    })

    for (let si = 0; si < siswaIds.length; si++) {
      const sid = siswaIds[si]
      const isBeasiswa = si >= siswaIds.length - 2 // Last 2 students get beasiswa
      const discount = isBeasiswa ? (type === 'tk' ? nominalSpp : Math.round(nominalSpp * 0.5)) : 0
      const tsStatus = isBeasiswa ? (type === 'tk' ? 'dibebaskan' : 'terbit') : 'terbit'

      const [ts] = await db.insert(tagihanSiswa).values({
        tagihanId: tg.id, siswaId: sid, unitId,
        nominal: nominalSpp, diskon: discount,
        sudahDibayar: 0, status: tsStatus,
      }).returning()

      if (isBeasiswa) continue // No payments for beasiswa students

      // Deterministic payment pattern
      const seed = (si * 7 + m * 13) % 100
      if (seed < 60) {
        // Lunas: pay full
        const date = tgl(m, Math.min(5 + si, 28))
        const bankId = bankRows[si % 2].id
        paymentOps.push(async () => {
          await db.transaction(async (tx) => {
            await tx.insert(pembayaran).values({
              tagihanSiswaId: ts.id, jumlahBayar: nominalSpp,
              tanggalBayar: date, metode: 'transfer', createdBy: session.user.id,
            })
            await tx.update(tagihanSiswa).set({ sudahDibayar: nominalSpp, status: 'lunas', updatedAt: new Date() })
              .where(eq(tagihanSiswa.id, ts.id))
            await tx.insert(kasTransaksi).values({
              unitId, kategoriId: katSpp.id, tipe: 'pemasukan', refType: 'spp', refId: ts.id, jumlah: nominalSpp,
              keterangan: `Pembayaran SPP ${BULAN_NAMES[bln(m)]} ${thn(m)}`,
              tanggal: date, referensi: `spp/${ts.id}`, bankAccountId: bankId, createdBy: session.user.id,
            })
          })
        })
      } else if (seed < 85) {
        // Cicil: pay 50% then remainder
        const amount1 = Math.round(nominalSpp / 2)
        const amount2 = nominalSpp - amount1
        const date1 = tgl(m, 10)
        const date2 = tgl(m, 20)
        const bankId = bankRows[(si + 1) % 2].id
        paymentOps.push(async () => {
          await db.transaction(async (tx) => {
            await tx.insert(pembayaran).values({
              tagihanSiswaId: ts.id, jumlahBayar: amount1,
              tanggalBayar: date1, metode: 'transfer', createdBy: session.user.id,
            })
            await tx.insert(pembayaran).values({
              tagihanSiswaId: ts.id, jumlahBayar: amount2,
              tanggalBayar: date2, metode: 'transfer', createdBy: session.user.id,
            })
            await tx.update(tagihanSiswa).set({ sudahDibayar: nominalSpp, status: 'lunas', updatedAt: new Date() })
              .where(eq(tagihanSiswa.id, ts.id))
            await tx.insert(kasTransaksi).values({
              unitId, kategoriId: katSpp.id, tipe: 'pemasukan', refType: 'spp', refId: ts.id, jumlah: amount1,
              keterangan: `Cicilan 1 SPP ${BULAN_NAMES[bln(m)]} ${thn(m)}`,
              tanggal: date1, referensi: `spp/${ts.id}`, bankAccountId: bankId, createdBy: session.user.id,
            })
            await tx.insert(kasTransaksi).values({
              unitId, kategoriId: katSpp.id, tipe: 'pemasukan', refType: 'spp', refId: ts.id, jumlah: amount2,
              keterangan: `Cicilan 2 SPP ${BULAN_NAMES[bln(m)]} ${thn(m)}`,
              tanggal: date2, referensi: `spp/${ts.id}`, bankAccountId: bankId, createdBy: session.user.id,
            })
          })
        })
      }
    }
  }

  // Execute payments in parallel batches
  for (let i = 0; i < paymentOps.length; i += 15) {
    await Promise.all(paymentOps.slice(i, i + 15).map((fn) => fn()))
  }

  // ─── Tagihan Lainnya ──────────────────────────────────────────────────────
  const katTagLain = await ensureKategori('Pemasukan Lainnya', 'pemasukan', '411299', '4.1.04')
  const [tgLain] = await db.insert(tagihan).values({
    unitId, judul: tagihanLainNama, tahunAjaran: TA, tahunAjaranId,
    jenis: 'lainnya', nominal: tagihanLainNominal * siswaIds.length,
    status: 'terbit', tanggalTerbit: '2026-01-15', dueDate: '2026-02-15',
    siswaCount: siswaIds.length,
  }).returning()

  await db.insert(tagihanItem).values({
    tagihanId: tgLain.id, nama: tagihanLainNama, qty: 1,
    hargaSatuan: tagihanLainNominal, subtotal: tagihanLainNominal,
  })

  // Publish to both classes, ~50% paid
  const tagLainOps: Array<() => Promise<void>> = []
  for (let si = 0; si < siswaIds.length; si++) {
    const [ts] = await db.insert(tagihanSiswa).values({
      tagihanId: tgLain.id, siswaId: siswaIds[si], unitId,
      nominal: tagihanLainNominal, sudahDibayar: 0, status: 'terbit',
    }).returning()

    if (si < Math.ceil(siswaIds.length / 2) && si % 3 !== 0) {
      const isFull = si % 2 === 0
      const amount = isFull ? tagihanLainNominal : Math.round(tagihanLainNominal / 2)
      const bankId = bankRows[si % 2].id
      tagLainOps.push(async () => {
        await db.transaction(async (tx) => {
          await tx.insert(pembayaran).values({
            tagihanSiswaId: ts.id, jumlahBayar: amount,
            tanggalBayar: '2026-02-01', metode: 'tunai', createdBy: session.user.id,
          })
          await tx.update(tagihanSiswa).set({
            sudahDibayar: amount, status: isFull ? 'lunas' : 'cicil', updatedAt: new Date(),
          }).where(eq(tagihanSiswa.id, ts.id))
          await tx.insert(kasTransaksi).values({
            unitId, kategoriId: katTagLain.id, tipe: 'pemasukan', refType: 'kas', refId: ts.id, jumlah: amount,
            keterangan: `Pembayaran ${tagihanLainNama}`,
            tanggal: '2026-02-01', referensi: `tagihan/${ts.id}`,
            bankAccountId: bankId, createdBy: session.user.id,
          })
        })
      })
    }
  }
  for (let i = 0; i < tagLainOps.length; i += 15) {
    await Promise.all(tagLainOps.slice(i, i + 15).map((fn) => fn()))
  }

  // ─── Kas Transaksi Bulanan ────────────────────────────────────────────────
  const totGajiNet = pegawaiRows.reduce((s, p) => s + calcPayroll(p.gajiPokok).totalDiterima, 0)
  const katGajiId = kategoriMap['Gaji & Honorer']
  const katAtkId = kategoriMap['ATK & Perlengkapan']
  const katListrikId = kategoriMap['Listrik/Air/Telepon']
  const katOpId = kategoriMap['Operasional Sekolah']
  const katDonasiId = kategoriMap['Donasi/Sumbangan']
  const katPemelId = kategoriMap['Pemeliharaan Gedung']

  // Pengeluaran monthly (months 1-12)
  const kasOps: Array<() => Promise<void>> = []
  for (let m = 1; m <= 12; m++) {
    const mainBankId = bankRows[0].id
    // Gaji
    kasOps.push(async () => {
      await db.insert(kasTransaksi).values({
        unitId, kategoriId: katGajiId, tipe: 'pengeluaran', jumlah: totGajiNet,
        keterangan: `Gaji pegawai ${BULAN_NAMES[bln(m)]} ${thn(m)}`,
        tanggal: tgl(m, 28), bankAccountId: mainBankId, createdBy: session.user.id, referensi: `gaji/${m}`,
      })
    })
    // ATK (random 100rb - 1jt)
    const atkAmt = 100000 + ((m * 137 + 5) % 900) * 1000
    kasOps.push(async () => {
      await db.insert(kasTransaksi).values({
        unitId, kategoriId: katAtkId, tipe: 'pengeluaran', jumlah: atkAmt,
        keterangan: `ATK ${BULAN_NAMES[bln(m)]} ${thn(m)}`,
        tanggal: tgl(m, 5), bankAccountId: mainBankId, createdBy: session.user.id,
      })
    })
    // Listrik (300rb - 1.5jt)
    const listrikAmt = 300000 + ((m * 97 + 3) % 12) * 100000
    kasOps.push(async () => {
      await db.insert(kasTransaksi).values({
        unitId, kategoriId: katListrikId, tipe: 'pengeluaran', jumlah: listrikAmt,
        keterangan: `Listrik & Air ${BULAN_NAMES[bln(m)]} ${thn(m)}`,
        tanggal: tgl(m, 10), bankAccountId: mainBankId, createdBy: session.user.id,
      })
    })
    // Operasional (500rb - 3jt)
    const opAmt = 500000 + ((m * 73 + 7) % 25) * 100000
    kasOps.push(async () => {
      await db.insert(kasTransaksi).values({
        unitId, kategoriId: katOpId, tipe: 'pengeluaran', jumlah: opAmt,
        keterangan: `Operasional ${BULAN_NAMES[bln(m)]} ${thn(m)}`,
        tanggal: tgl(m, 15), bankAccountId: mainBankId, createdBy: session.user.id,
      })
    })
    // Pemeliharaan (only months 2, 4, 6)
    if (m % 2 === 0) {
      const pemelAmt = 200000 + ((m * 53 + 5) % 20) * 100000
      kasOps.push(async () => {
        await db.insert(kasTransaksi).values({
          unitId, kategoriId: katPemelId, tipe: 'pengeluaran', jumlah: pemelAmt,
          keterangan: `Pemeliharaan ${BULAN_NAMES[bln(m)]} ${thn(m)}`,
          tanggal: tgl(m, 20), bankAccountId: mainBankId, createdBy: session.user.id,
        })
      })
    }
  }

  // Pemasukan monthly (months 1-12): Donasi random
  for (let m = 1; m <= 12; m++) {
    const donAmt = 500000 + ((m * 191 + 11) % 45) * 100000
    kasOps.push(async () => {
      await db.insert(kasTransaksi).values({
        unitId, kategoriId: katDonasiId, tipe: 'pemasukan', jumlah: donAmt,
        keterangan: `Donasi ${BULAN_NAMES[bln(m)]} ${thn(m)}`,
        tanggal: tgl(m, 15), bankAccountId: bankRows[m % 2].id, createdBy: session.user.id,
      })
    })
  }

  // Additional large donations
  const largeDonations = type === 'tk'
    ? [{ date: '2026-03-15', amount: 5000000, ket: 'Donasi dari Yayasan Bina Sejahtera' },
       { date: '2026-07-20', amount: 2500000, ket: 'Donasi dari alumni TK angkatan 2020' }]
    : [{ date: '2026-03-20', amount: 7500000, ket: 'Donasi dari PT. Maju Bersama' },
       { date: '2026-08-10', amount: 3000000, ket: 'Donasi dari Komite Sekolah periode 2025' }]
  for (const ld of largeDonations) {
    kasOps.push(async () => {
      await db.insert(kasTransaksi).values({
        unitId, kategoriId: katDonasiId, tipe: 'pemasukan', jumlah: ld.amount,
        keterangan: ld.ket, tanggal: ld.date, bankAccountId: bankRows[0].id, createdBy: session.user.id,
      })
    })
  }

  // Execute kas transaksi in parallel batches
  for (let i = 0; i < kasOps.length; i += 20) {
    await Promise.all(kasOps.slice(i, i + 20).map((fn) => fn()))
  }

  // ─── Payroll (12 months + THR) ────────────────────────────────────────────
  const payrollOps: Array<() => Promise<void>> = []
  for (let m = 1; m <= 12; m++) {
    for (const peg of pegawaiRows) {
      const c = calcPayroll(peg.gajiPokok)
      payrollOps.push(async () => {
        const [pgj] = await db.insert(penggajian).values({
          unitId, pegawaiId: peg.id, periode: `${thn(m)}-${String(bln(m)).padStart(2, '0')}`,
          gajiPokok: peg.gajiPokok, totalPenerimaan: c.bruto,
          totalPotongan: c.totalPotongan, totalDiterima: c.totalDiterima,
          status: m === 12 ? 'draft' : 'dibayar', tanggalBayar: tgl(m, 28),
          pph21: c.pph21, bpjsKaryawan: c.bpjsKaryawan, bpjsPerusahaan: c.bpjsPerusahaan,
        }).returning()

        const details = [
          { tipe: 'penerimaan' as const, kode: 'gaji_pokok', nama: 'Gaji Pokok', jumlah: peg.gajiPokok, objekPajak: true, urutan: 1 },
          { tipe: 'potongan' as const, kode: 'pph21', nama: 'PPh 21', jumlah: c.pph21, objekPajak: false, urutan: 2 },
          { tipe: 'potongan' as const, kode: 'bpjs_kesehatan', nama: 'BPJS Kesehatan', jumlah: c.bpjsKes, objekPajak: false, urutan: 3 },
          { tipe: 'potongan' as const, kode: 'bpjs_jht', nama: 'BPJS JHT', jumlah: c.bpjsJht, objekPajak: false, urutan: 4 },
          { tipe: 'potongan' as const, kode: 'bpjs_jp', nama: 'BPJS JP', jumlah: c.bpjsJp, objekPajak: false, urutan: 5 },
        ]
        for (const d of details) {
          await db.insert(penggajianDetail).values({ penggajianId: pgj.id, ...d })
        }
      })
    }
  }

  // THR for each pegawai
  for (const peg of pegawaiRows) {
    const thr = peg.gajiPokok
    const thrPph21 = Math.round(thr * 0.025)
    payrollOps.push(async () => {
      const [pgj] = await db.insert(penggajian).values({
        unitId, pegawaiId: peg.id, periode: '2026-04',
        gajiPokok: peg.gajiPokok, totalPenerimaan: thr,
        totalPotongan: thrPph21, totalDiterima: thr - thrPph21,
        status: 'dibayar', tanggalBayar: '2026-04-14',
        pph21: thrPph21, bpjsKaryawan: 0, bpjsPerusahaan: 0,
        keterangan: 'THR-2026',
      }).returning()

      await db.insert(penggajianDetail).values({ penggajianId: pgj.id, tipe: 'penerimaan', kode: 'gaji_pokok', nama: 'Gaji Pokok (THR)', jumlah: thr, objekPajak: true, urutan: 1 })
      await db.insert(penggajianDetail).values({ penggajianId: pgj.id, tipe: 'potongan', kode: 'pph21', nama: 'PPh 21 (THR)', jumlah: thrPph21, objekPajak: false, urutan: 2 })
    })
  }

  for (let i = 0; i < payrollOps.length; i += 20) {
    await Promise.all(payrollOps.slice(i, i + 20).map((fn) => fn()))
  }

  // ─── Penggajian Komponen ──────────────────────────────────────────────────
  for (const k of KOMPONEN_GAJI) {
    await db.insert(penggajianKomponen).values({ unitId, ...k })
      .onConflictDoNothing({ target: [penggajianKomponen.unitId, penggajianKomponen.kode] })
  }

  // ─── BOS ──────────────────────────────────────────────────────────────────
  const [bosP] = await db.insert(bosPeriode).values({
    unitId, tahun: 2026, nama: 'BOS Reguler 2026 Tahap 1',
    jumlahDana: bosAmount, rekeningKhusus: bosRekening, status: 'aktif',
  }).returning()

  const bosItems = [
    { kode: '1', komponen: 'Pengembangan Perpustakaan', anggaran: Math.round(bosAmount * 0.1) },
    { kode: '2', komponen: 'Kegiatan Pembelajaran', anggaran: Math.round(bosAmount * 0.3) },
    { kode: '3', komponen: 'Langganan Daya & Jasa', anggaran: Math.round(bosAmount * 0.15) },
    { kode: '4', komponen: 'Pemeliharaan Sarana', anggaran: Math.round(bosAmount * 0.2) },
    { kode: '5', komponen: 'Pengembangan SDM', anggaran: Math.round(bosAmount * 0.25) },
  ]

  const katBos = await ensureKategori('Realisasi BOS', 'pengeluaran', '411211', '5.1.04')
  for (const bi of bosItems) {
    const [r] = await db.insert(bosRkas).values({
      periodeId: bosP.id, kodeRekening: bi.kode, komponen: bi.komponen,
      anggaran: bi.anggaran,
    }).returning()

    for (let j = 1; j <= 3; j++) {
      const val = Math.round(bi.anggaran / 3 / 1000) * 1000
      const [rl] = await db.insert(bosRealisasi).values({
        rkasId: r.id, tanggal: `2026-0${j + 3}-15`, uraian: `Realisasi ${bi.komponen} tahap ${j}`,
        jumlah: val,
      }).returning()
      await db.insert(kasTransaksi).values({
        unitId, kategoriId: katBos.id, tipe: 'pengeluaran', refType: 'kas', refId: rl.id,
        jumlah: val, keterangan: `BOS: ${bi.komponen} tahap ${j}`,
        tanggal: `2026-0${j + 3}-15`, referensi: `bos/${rl.id}`,
        bankAccountId: bankRows[0].id, createdBy: session.user.id,
      })
    }
  }

  // ─── Dana ─────────────────────────────────────────────────────────────────
  const danaConfigs = type === 'tk'
    ? [
      { kode: 'D-TK1', nama: 'Donasi Pembangunan TK', sumber: 'Donatur Umum', target: 50000000, realisasi: 30000000, jenisIkat: 'terikat_temporer' as const, tujuan: 'Pembangunan gedung baru TK' },
      { kode: 'D-TK2', nama: 'Investasi TK', sumber: 'Yayasan Annahl', target: 30000000, realisasi: 15000000, jenisIkat: 'terikat_temporer' as const, tujuan: 'Pengembangan kurikulum dan fasilitas' },
    ]
    : [
      { kode: 'D-SD1', nama: 'Donasi Pembangunan SD', sumber: 'Donatur Umum', target: 75000000, realisasi: 45000000, jenisIkat: 'terikat_temporer' as const, tujuan: 'Renovasi ruang kelas SD' },
      { kode: 'D-SD2', nama: 'Investasi SD', sumber: 'Yayasan Annahl', target: 45000000, realisasi: 25000000, jenisIkat: 'terikat_temporer' as const, tujuan: 'Pengadaan laboratorium komputer' },
    ]
  for (const dc of danaConfigs) {
    await db.insert(dana).values({
      unitId, kode: dc.kode, nama: dc.nama, tipe: 'investor',
      sumber: dc.sumber, jenisIkat: dc.jenisIkat,
      tujuan: dc.tujuan, targetNominal: dc.target, realisasi: dc.realisasi,
      tanggalMulai: '2026-01-01', tanggalSelesai: '2026-12-31',
      keterangan: dc.nama,
    })
  }

  // ─── Aset Tetap ───────────────────────────────────────────────────────────
  const asetConfigs = [
    { kodeAset: type === 'tk' ? 'TK-TN-001' : 'SD-TN-001', nama: `Tanah Bangunan ${unitName}`, kategori: 'tanah' as const, hargaPerolehan: 50000000, masaManfaat: null, tgl: '2020-01-01' },
    { kodeAset: type === 'tk' ? 'TK-GD-001' : 'SD-GD-001', nama: `Gedung Utama ${unitName}`, kategori: 'gedung' as const, hargaPerolehan: 100000000, masaManfaat: 20, tgl: '2020-06-01' },
    { kodeAset: type === 'tk' ? 'TK-KR-001' : 'SD-KR-001', nama: type === 'tk' ? 'Toyota Avanza 2021' : 'Mitsubishi Xpander 2021', kategori: 'kendaraan' as const, hargaPerolehan: 30000000, masaManfaat: 5, tgl: '2021-01-01' },
    { kodeAset: type === 'tk' ? 'TK-PR-001' : 'SD-PR-001', nama: 'Peralatan Sekolah', kategori: 'peralatan' as const, hargaPerolehan: 10000000, masaManfaat: 4, tgl: '2022-01-01' },
    { kodeAset: type === 'tk' ? 'TK-IN-001' : 'SD-IN-001', nama: 'Inventaris Kelas', kategori: 'inventaris' as const, hargaPerolehan: 5000000, masaManfaat: 5, tgl: '2023-01-01' },
  ]
  for (const ac of asetConfigs) {
    await db.insert(asetTetap).values({
      unitId, kodeAset: ac.kodeAset, nama: ac.nama, kategori: ac.kategori,
      tanggalPerolehan: ac.tgl, hargaPerolehan: ac.hargaPerolehan,
      masaManfaat: ac.masaManfaat, metodePenyusutan: 'garis_lurus',
      status: 'aktif',
    })
  }

  // ─── Hutang Piutang ───────────────────────────────────────────────────────
  const hpConfigs = type === 'tk'
    ? [
      { tipe: 'hutang' as const, jumlah: 15000000, sisa: 5000000, vendorKey: 'CV Alat Pendidikan', deskripsi: 'Pembelian alat peraga edukatif', tanggal: '2026-01-10', jatuhTempo: '2026-06-10', status: 'cicil' as const, kategori: 'pembelian' as const },
      { tipe: 'hutang' as const, jumlah: 8000000, sisa: 8000000, vendorKey: 'Toko Buku Cerdas', deskripsi: 'Pembelian buku paket semester 2', tanggal: '2026-05-20', jatuhTempo: '2026-07-20', status: 'belum_lunas' as const, kategori: 'pembelian' as const },
      { tipe: 'piutang' as const, jumlah: 3000000, sisa: 3000000, vendorKey: null, deskripsi: 'Pinjaman SPP wali murid', pihak: 'Orang Tua Siswa - Kolektif', tanggal: '2026-06-01', jatuhTempo: '2026-06-30', status: 'belum_lunas' as const, kategori: 'lainnya' as const },
    ]
    : [
      { tipe: 'hutang' as const, jumlah: 25000000, sisa: 15000000, vendorKey: 'CV Renovasi Bangunan', deskripsi: 'Renovasi ruang kelas lantai 2', tanggal: '2026-02-01', jatuhTempo: '2026-08-01', status: 'cicil' as const, kategori: 'pembelian' as const },
      { tipe: 'hutang' as const, jumlah: 12000000, sisa: 12000000, vendorKey: 'UD Seragam Sekolah', deskripsi: 'Pengadaan seragam baru siswa', tanggal: '2026-06-15', jatuhTempo: '2026-09-15', status: 'belum_lunas' as const, kategori: 'pembelian' as const },
      { tipe: 'piutang' as const, jumlah: 5000000, sisa: 5000000, vendorKey: null, deskripsi: 'Pinjaman dari donatur', pihak: 'Bapak H. Ahmad Donatur', tanggal: '2026-04-01', jatuhTempo: '2026-12-01', status: 'belum_lunas' as const, kategori: 'pinjaman' as const },
    ]
  for (const hp of hpConfigs) {
    await db.insert(hutangPiutang).values({
      unitId, tipe: hp.tipe, jumlah: hp.jumlah, sisa: hp.sisa,
      vendorId: hp.vendorKey ? vendorMap[hp.vendorKey] : null,
      deskripsi: hp.deskripsi, pihak: hp.pihak || null,
      tanggal: hp.tanggal, jatuhTempo: hp.jatuhTempo,
      status: hp.status, kategori: hp.kategori,
    })
  }

  // ─── Beasiswa ─────────────────────────────────────────────────────────────
  const beaCfg = type === 'tk'
    ? { nama: 'Beasiswa Prestasi TK', tipe: 'gratis' as const, jenisPotongan: 'persen' as const, besaranPotongan: 100, ket: 'Beasiswa penuh untuk siswa berprestasi' }
    : { nama: 'Beasiswa Yatim SD', tipe: 'potongan' as const, jenisPotongan: 'persen' as const, besaranPotongan: 50, ket: 'Beasiswa keringanan SPP untuk anak yatim' }
  const [bea] = await db.insert(beasiswa).values({
    unitId, nama: beaCfg.nama, tipe: beaCfg.tipe,
    jenisPotongan: beaCfg.jenisPotongan, besaranPotongan: beaCfg.besaranPotongan,
    keterangan: beaCfg.ket, aktif: true,
  }).returning()

  // Assign to last 2 students
  for (let si = siswaIds.length - 2; si < siswaIds.length; si++) {
    await db.insert(siswaBeasiswa).values({
      siswaId: siswaIds[si], beasiswaId: bea.id, unitId, tahunAjaran: TA,
      keterangan: beaCfg.nama,
    })
  }

  // Update dibebaskan students' tagihanSiswa
  if (type === 'tk') {
    for (let si = siswaIds.length - 2; si < siswaIds.length; si++) {
      await db.update(tagihanSiswa).set({ diskon: nominalSpp, status: 'dibebaskan', beasiswaId: bea.id })
        .where(eq(tagihanSiswa.siswaId, siswaIds[si]))
    }
  }

  return {
    pegawai: pegawaiRows,
    kelas: allKelas.map((k) => ({ id: k.id, nama: k.nama })),
    siswa: siswaIds,
    banks: bankRows,
    errors: [],
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Seed Function
// ═══════════════════════════════════════════════════════════════════════════════

export const seedDummyData = createServerFn({ method: 'POST' })
  .validator(z.object({ force: z.boolean().optional() }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    if (!data.force) throw new Error('force=true diperlukan untuk menjalankan seed (akan menghapus semua data)')

    // ─── Save existing user assignments before cleanup ──────────────────────
    const existingUserUnits = await db.query.userUnit.findMany({ with: { unit: true } })

    // ─── Clean all seeded data first (reverse dependency order) ─────────────
    await db.delete(jurnalDetail).execute().catch(() => {})
    await db.delete(jurnalHeader).execute().catch(() => {})
    await db.delete(bosRealisasi).execute().catch(() => {})
    await db.delete(bosRkas).execute().catch(() => {})
    await db.delete(bosPeriode).execute().catch(() => {})
    await db.delete(pembayaran).execute().catch(() => {})
    await db.delete(tagihanSiswa).execute().catch(() => {})
    await db.delete(tagihanItem).execute().catch(() => {})
    await db.delete(tagihan).execute().catch(() => {})
    await db.delete(sppSetting).execute().catch(() => {})
    await db.delete(kasTransaksi).execute().catch(() => {})
    await db.delete(kasKategori).execute().catch(() => {})
    await db.delete(bankAccount).execute().catch(() => {})
    await db.delete(vendor).execute().catch(() => {})
    await db.delete(hutangPiutang).execute().catch(() => {})
    await db.delete(anggaran).execute().catch(() => {})
    await db.delete(asetTetap).execute().catch(() => {})
    await db.delete(dana).execute().catch(() => {})
    await db.delete(siswaBeasiswa).execute().catch(() => {})
    await db.delete(beasiswa).execute().catch(() => {})
    await db.delete(penggajianDetail).execute().catch(() => {})
    await db.delete(penggajian).execute().catch(() => {})
    await db.delete(penggajianKomponen).execute().catch(() => {})
    await db.delete(siswa).execute().catch(() => {})
    await db.delete(kelas).execute().catch(() => {})
    await db.delete(tingkat).execute().catch(() => {})
    await db.delete(tahunAjaran).execute().catch(() => {})
    await db.delete(pegawai).execute().catch(() => {})
    await db.delete(coa).execute().catch(() => {})
    await db.delete(unit).execute().catch(() => {})

    // ─── Yayasan ────────────────────────────────────────────────────────────
    let yayasanId = await db.query.yayasan.findFirst()
    if (!yayasanId) {
      const [y] = await db.insert(yayasan).values({
        nama: 'Yayasan Annahl', alamat: 'Jl. Pendidikan No. 123, Jakarta',
      }).returning()
      yayasanId = y
    }

    // ─── Units ──────────────────────────────────────────────────────────────
    const [u1] = await db.insert(unit).values({
      yayasanId: yayasanId.id, nama: 'TK Annahl', jenjang: 'TK',
      alamat: 'Jl. Pendidikan No. 123, Jakarta',
      telepon: '021-1000001',
    }).returning()

    const [u2] = await db.insert(unit).values({
      yayasanId: yayasanId.id, nama: 'SD Annahl', jenjang: 'SD',
      alamat: 'Jl. Pendidikan No. 123, Jakarta',
      telepon: '021-1000002',
    }).returning()

    // Assign the seeding user as admin_yayasan for both units
    await db.insert(userUnit).values({ userId: session.user.id, unitId: u1.id, role: 'admin_yayasan', isBendahara: true })
    await db.insert(userUnit).values({ userId: session.user.id, unitId: u2.id, role: 'admin_yayasan' })

    // Restore existing user assignments (map old unit names to new unit IDs)
    for (const uu of existingUserUnits) {
      if (uu.userId === session.user.id) continue
      const oldName = uu.unit?.nama || ''
      let newUnitId = ''
      if (oldName === 'TK Annahl') newUnitId = u1.id
      else if (oldName === 'SD Annahl') newUnitId = u2.id
      else continue
      await db.insert(userUnit).values({
        userId: uu.userId, unitId: newUnitId, role: uu.role as any,
        isBendahara: uu.isBendahara || false,
      }).catch(() => {})
    }

    // ─── Seed COA & Kategori (global) ────────────────────────────────────────
    await seedCoaAndKategori()

    // Build kategoriMap from DB after seeding
    const allKategori = await db.query.kasKategori.findMany()
    const kategoriMap: Record<string, string> = {}
    for (const kat of allKategori) {
      kategoriMap[kat.nama] = kat.id
    }

    // ─── Tahun Ajaran (shared "2026/2027" but per unit) ─────────────────────
    const [ta1] = await db.insert(tahunAjaran).values({
      unitId: u1.id, nama: TA, tanggalMulai: '2026-07-01', tanggalSelesai: '2027-06-30', aktif: true,
    }).returning()
    const [ta2] = await db.insert(tahunAjaran).values({
      unitId: u2.id, nama: TA, tanggalMulai: '2026-07-01', tanggalSelesai: '2027-06-30', aktif: true,
    }).returning()

    // ─── Vendors (global) ───────────────────────────────────────────────────
    const vendorMap: Record<string, string> = {}
    for (const v of VENDORS) {
      const [row] = await db.insert(vendor).values(v).returning()
      vendorMap[v.nama] = row.id
    }

    // ─── Seed Unit 1 (TK) ───────────────────────────────────────────────────
    const tkData = await seedUnit({
      unitId: u1.id, type: 'tk', nominalSpp: 150000, tahunAjaranId: ta1.id,
    }, session, vendorMap, kategoriMap)

    // ─── Seed Unit 2 (SD) ───────────────────────────────────────────────────
    const sdData = await seedUnit({
      unitId: u2.id, type: 'sd', nominalSpp: 250000, tahunAjaranId: ta2.id,
    }, session, vendorMap, kategoriMap)

    // ─── Anggaran Pembangunan Kelas Baru (SD) ───────────────────────────────
    await db.insert(anggaran).values({
      unitId: u2.id, nama: 'Pembangunan Kelas Baru SD', total: 100_000_000,
      terpakai: 0, periode: '2026', tipe: 'pengeluaran', status: 'aktif',
      keterangan: 'Anggaran pembangunan 3 ruang kelas baru SD Annahl TA 2026/2027',
      createdBy: session.user.id,
    })

    // ─── Hutang Bank Tanah (SD) ──────────────────────────────────────────────
    // Pinjaman 10 tahun @ 13jt/bln, sudah berjalan 3 tahun, sisa 84 bulan
    await db.insert(hutangPiutang).values({
      unitId: u2.id, tipe: 'hutang', jumlah: 1_560_000_000, sisa: 1_092_000_000,
      vendorId: vendorMap['Bank Syariah Indonesia (BSI)'],
      deskripsi: 'Pinjaman pembelian tanah untuk pengembangan kampus (10 tahun)',
      pihak: 'Bank Syariah Indonesia (BSI)',
      tanggal: '2023-01-01', jatuhTempo: '2032-12-31',
      status: 'cicil', kategori: 'pinjaman',
    })

    // ─── Bank Balance Update for all accounts ───────────────────────────────
    const allBankIds = [...tkData.banks, ...sdData.banks].map((b) => b.id)
    for (const bankId of allBankIds) {
      const bankRow = await db.query.bankAccount.findFirst({ where: eq(bankAccount.id, bankId) })
      if (!bankRow) continue
      const saldoCalc = await db
        .select({ s: sql<number>`coalesce(sum(${kasTransaksi.jumlah} * CASE WHEN ${kasTransaksi.tipe} = 'pemasukan' THEN 1 ELSE -1 END)::bigint, 0)` })
        .from(kasTransaksi).where(eq(kasTransaksi.bankAccountId, bankId))
      const netSaldo = bankRow.saldoAwal + (saldoCalc[0]?.s ?? 0)
      await db.update(bankAccount).set({ saldo: netSaldo, updatedAt: new Date() }).where(eq(bankAccount.id, bankId))
    }

    // ─── Stats ──────────────────────────────────────────────────────────────
    const [pembCount, kasCount] = await Promise.all([
      db.select({ c: sql<number>`count(*)::int` }).from(pembayaran).then((r) => r[0]?.c ?? 0),
      db.select({ c: sql<number>`count(*)::int` }).from(kasTransaksi).then((r) => r[0]?.c ?? 0),
    ])

    // ─── Generate Journal Entries from KasTransaksi ──────────────────────────
    const allKas = await db.query.kasTransaksi.findMany({
      where: inArray(kasTransaksi.unitId, [u1.id, u2.id]),
      with: { kategori: true },
      orderBy: (k, { asc }) => [asc(k.tanggal)],
    })

    const coaList = await db.query.coa.findMany()

    function findCoa(kode: string) {
      return coaList.find((c) => c.kode === kode)
    }

    let journalCount = 0
    // Group transactions by date+bank to handle compound entries
    const kasByDate: Record<string, typeof allKas> = {}
    for (const k of allKas) {
      const key = `${k.unitId}|${k.tanggal}`
      if (!kasByDate[key]) kasByDate[key] = []
      kasByDate[key].push(k)
    }

    for (const [key, entries] of Object.entries(kasByDate)) {
      const unitId = key.split('|')[0]
      const coaKas = findCoa('1.1.01')
      if (!coaKas) continue

      for (const k of entries) {
        const katKode = k.kategori?.coaKode || (k.tipe === 'pemasukan' ? '4.1.04' : '5.1.08')
        const coaCounter = findCoa(katKode)
        if (!coaCounter) continue

        await db.update(kasTransaksi).set({ refType: k.referensi?.startsWith('gaji/') ? 'gaji' : k.referensi?.startsWith('spp/') ? 'spp' : 'kas' }).where(eq(kasTransaksi.id, k.id))
        const [jh] = await db.insert(jurnalHeader).values({
          unitId, nomor: `JU-${k.tanggal.slice(0, 4)}-${String(++journalCount).padStart(4, '0')}`,
          tanggal: k.tanggal,
          tipe: k.referensi?.startsWith('gaji/') ? 'gaji' : k.referensi?.startsWith('spp/') ? 'spp' : 'kas',
          referensi: `transaksi/${k.id}`,
          keterangan: k.keterangan || `${k.tipe} — ${k.kategori?.nama || '-'}`,
          transaksiId: k.id,
          createdBy: session.user.id,
        }).returning()

        if (k.tipe === 'pemasukan') {
          await db.insert(jurnalDetail).values({ jurnalId: jh.id, coaId: coaKas.id, debit: k.jumlah, kredit: 0, keterangan: k.keterangan })
          await db.insert(jurnalDetail).values({ jurnalId: jh.id, coaId: coaCounter.id, debit: 0, kredit: k.jumlah, keterangan: k.kategori?.nama })
        } else {
          await db.insert(jurnalDetail).values({ jurnalId: jh.id, coaId: coaCounter.id, debit: k.jumlah, kredit: 0, keterangan: k.kategori?.nama })
          await db.insert(jurnalDetail).values({ jurnalId: jh.id, coaId: coaKas.id, debit: 0, kredit: k.jumlah, keterangan: k.keterangan })
        }
      }
    }

    // ─── Jurnal Penyusutan ─────────────────────────────────────────────────────
    const coa507 = coaList.find((c: any) => c.kode === '5.1.07')
    const coa126 = coaList.find((c: any) => c.kode === '1.2.06')
    for (const uid of [u1.id, u2.id]) {
      const asetRows = await db.query.asetTetap.findMany({
        where: and(eq(asetTetap.unitId, uid), eq(asetTetap.status, 'aktif')),
      })
      let bebanPenyusutan = 0
      for (const a of asetRows) {
        if (!a.masaManfaat || a.masaManfaat <= 0) continue
        if (a.metodePenyusutan === 'saldo_menurun') {
          bebanPenyusutan += Math.round((a.hargaPerolehan - a.akumulasiPenyusutan) * (2 / a.masaManfaat))
        } else {
          bebanPenyusutan += Math.round((a.hargaPerolehan - (a.nilaiResidu || 0)) / a.masaManfaat)
        }
      }
      if (coa507 && coa126 && bebanPenyusutan > 0) {
        const [kt] = await db.insert(kasTransaksi).values({
          unitId: uid, tipe: 'pengeluaran', refType: 'penyusutan',
          jumlah: bebanPenyusutan, keterangan: 'Beban penyusutan tahun 2026',
          tanggal: '2026-12-31', refId: uid, createdBy: session.user.id,
        }).returning()
        const [jhDep] = await db.insert(jurnalHeader).values({
          unitId: uid, nomor: `JU-2026-DEPR-${uid.slice(0, 8)}`,
          tanggal: '2026-12-31', tipe: 'penyusutan',
          referensi: `transaksi/${kt.id}`, transaksiId: kt.id,
          keterangan: 'Beban penyusutan tahun 2026',
          createdBy: session.user.id,
        }).returning()
        await db.insert(jurnalDetail).values({ jurnalId: jhDep.id, coaId: coa507.id, debit: bebanPenyusutan, kredit: 0, keterangan: 'Penyusutan aset tetap' })
        await db.insert(jurnalDetail).values({ jurnalId: jhDep.id, coaId: coa126.id, debit: 0, kredit: bebanPenyusutan, keterangan: 'Akumulasi penyusutan' })
        
        // Update akumulasi penyusutan di aset_tetap
        for (const a of asetRows) {
          if (!a.masaManfaat || a.masaManfaat <= 0) continue
          let bebanPerAset = 0
          if (a.metodePenyusutan === 'saldo_menurun') {
            bebanPerAset = Math.round((a.hargaPerolehan - a.akumulasiPenyusutan) * (2 / a.masaManfaat))
          } else {
            bebanPerAset = Math.round((a.hargaPerolehan - (a.nilaiResidu || 0)) / a.masaManfaat)
          }
          if (bebanPerAset > 0) {
            await db.update(asetTetap)
              .set({ akumulasiPenyusutan: a.akumulasiPenyusutan + bebanPerAset, updatedAt: new Date() })
              .where(eq(asetTetap.id, a.id))
          }
        }
      }
    }

    // ─── Dana reklasifikasi (unrestricted → restricted) ─────────────────────
    const coa310 = coaList.find((c: any) => c.kode === '3.1.00')
    const coa320 = coaList.find((c: any) => c.kode === '3.2.00')
    const coa330 = coaList.find((c: any) => c.kode === '3.3.00')
    for (const uid of [u1.id, u2.id]) {
      const danaRows = await db.query.dana.findMany({ where: eq(dana.unitId, uid) })
      let danaTemporer = 0, danaPermanen = 0
      for (const d of danaRows) {
        const sisa = (d.targetNominal || 0) - (d.realisasi || 0)
        if (d.jenisIkat === 'terikat_temporer') danaTemporer += sisa
        else if (d.jenisIkat === 'terikat_permanen') danaPermanen += sisa
      }
      const danaTotal = danaTemporer + danaPermanen
      const [ktDana] = await db.insert(kasTransaksi).values({
        unitId: uid, tipe: 'pengeluaran', refType: 'penyesuaian',
        jumlah: danaTotal, keterangan: 'Reklasifikasi dana terikat',
        tanggal: '2026-12-31', refId: uid, createdBy: session.user.id,
      }).returning()
      const [jhDana] = await db.insert(jurnalHeader).values({
        unitId: uid, nomor: `JU-2026-DANA-${uid.slice(0, 8)}`,
        tanggal: '2026-12-31', tipe: 'penyesuaian',
        referensi: `transaksi/${ktDana.id}`, transaksiId: ktDana.id,
        keterangan: 'Reklasifikasi dana terikat',
        createdBy: session.user.id,
      }).returning()
      if (coa310 && coa320 && danaTemporer > 0) {
        await db.insert(jurnalDetail).values({ jurnalId: jhDana.id, coaId: coa310.id, debit: danaTemporer, kredit: 0, keterangan: 'Reklas ke terikat temporer' })
        await db.insert(jurnalDetail).values({ jurnalId: jhDana.id, coaId: coa320.id, debit: 0, kredit: danaTemporer, keterangan: 'Dana terikat temporer' })
      }
      if (coa310 && coa330 && danaPermanen > 0) {
        await db.insert(jurnalDetail).values({ jurnalId: jhDana.id, coaId: coa310.id, debit: danaPermanen, kredit: 0, keterangan: 'Reklas ke terikat permanen' })
        await db.insert(jurnalDetail).values({ jurnalId: jhDana.id, coaId: coa330.id, debit: 0, kredit: danaPermanen, keterangan: 'Dana terikat permanen' })
      }
    }

    // ─── Jurnal Penutup (closing entries) ─────────────────────────────────────
    const unitIdsInUnit = [u1.id, u2.id]
    for (const uid of unitIdsInUnit) {
      const pendapatanRows = await db.select({
        coaKode: coa.kode,
        saldo: sql<number>`coalesce(sum(${jurnalDetail.kredit} - ${jurnalDetail.debit})::bigint, 0)`,
      }).from(jurnalDetail)
        .innerJoin(jurnalHeader, eq(jurnalDetail.jurnalId, jurnalHeader.id))
        .innerJoin(coa, eq(jurnalDetail.coaId, coa.id))
        .where(and(eq(jurnalHeader.unitId, uid), eq(coa.tipe, 'pendapatan')))
        .groupBy(coa.kode)

      const bebanRows = await db.select({
        coaKode: coa.kode,
        saldo: sql<number>`coalesce(sum(${jurnalDetail.debit} - ${jurnalDetail.kredit})::bigint, 0)`,
      }).from(jurnalDetail)
        .innerJoin(jurnalHeader, eq(jurnalDetail.jurnalId, jurnalHeader.id))
        .innerJoin(coa, eq(jurnalDetail.coaId, coa.id))
        .where(and(eq(jurnalHeader.unitId, uid), eq(coa.tipe, 'beban')))
        .groupBy(coa.kode)

      const totalPendapatan = pendapatanRows.reduce((s, r) => s + r.saldo, 0)
      const totalBeban = bebanRows.reduce((s, r) => s + r.saldo, 0)
      const surplus = totalPendapatan - totalBeban
      if (totalPendapatan === 0 && totalBeban === 0) continue

      const [ktClose] = await db.insert(kasTransaksi).values({
        unitId: uid, tipe: surplus >= 0 ? 'pemasukan' : 'pengeluaran', refType: 'penutup',
        jumlah: surplus >= 0 ? surplus : Math.abs(surplus),
        keterangan: 'Jurnal penutup tahun buku 2026',
        tanggal: '2026-12-31', refId: uid, createdBy: session.user.id,
      }).returning()
      const [jh] = await db.insert(jurnalHeader).values({
        unitId: uid, nomor: `JU-2026-CLOSE-${uid.slice(0, 8)}`,
        tanggal: '2026-12-31', tipe: 'penutup',
        referensi: `transaksi/${ktClose.id}`, transaksiId: ktClose.id,
        keterangan: 'Jurnal penutup tahun buku 2026',
        createdBy: session.user.id,
      }).returning()

      for (const r of pendapatanRows) {
        if (r.saldo <= 0) continue
        const coaRec = coaList.find((c: any) => c.kode === r.coaKode)
        if (!coaRec) continue
        await db.insert(jurnalDetail).values({ jurnalId: jh.id, coaId: coaRec.id, debit: r.saldo, kredit: 0, keterangan: `Penutupan pendapatan: ${r.coaKode}` })
      }
      for (const r of bebanRows) {
        if (r.saldo <= 0) continue
        const coaRec = coaList.find((c: any) => c.kode === r.coaKode)
        if (!coaRec) continue
        await db.insert(jurnalDetail).values({ jurnalId: jh.id, coaId: coaRec.id, debit: 0, kredit: r.saldo, keterangan: `Penutupan beban: ${r.coaKode}` })
      }

      const coa3 = await db.query.coa.findFirst({ where: eq(coa.kode, '3.1.00') })
      if (coa3 && surplus !== 0) {
        if (surplus > 0) {
          await db.insert(jurnalDetail).values({ jurnalId: jh.id, coaId: coa3.id, debit: 0, kredit: surplus, keterangan: `Surplus tahun 2026` })
        } else {
          await db.insert(jurnalDetail).values({ jurnalId: jh.id, coaId: coa3.id, debit: Math.abs(surplus), kredit: 0, keterangan: `Defisit tahun 2026` })
        }
      }

      // Dana-based restricted net assets are tracked in dana table and classified
      // in neraca analysis. No separate journal entries needed.
    }

    // ─── Opening Balance Catch-up (so PAN total = Neraca total) ───────────
    const coa101 = coaList.find((c: any) => c.kode === '1.1.01')
    const coa102 = coaList.find((c: any) => c.kode === '1.1.02')
    const coa103 = coaList.find((c: any) => c.kode === '1.1.03')
    const coa201 = coaList.find((c: any) => c.kode === '2.1.01')
    const coa202 = coaList.find((c: any) => c.kode === '2.1.02')
    const coa203 = coaList.find((c: any) => c.kode === '2.1.03')
    const coa204 = coaList.find((c: any) => c.kode === '2.1.04')
    const coa205 = coaList.find((c: any) => c.kode === '2.1.05')
    for (const uid of [u1.id, u2.id]) {
      const coaBalRows = await db.select({
        coaKode: coa.kode,
        bal: sql<number>`coalesce(sum(case when ${coa.saldoNormal} = 'debit' then ${jurnalDetail.debit} - ${jurnalDetail.kredit} else ${jurnalDetail.kredit} - ${jurnalDetail.debit} end)::bigint, 0)`,
      }).from(jurnalDetail)
        .innerJoin(jurnalHeader, eq(jurnalDetail.jurnalId, jurnalHeader.id))
        .innerJoin(coa, eq(jurnalDetail.coaId, coa.id))
        .where(eq(jurnalHeader.unitId, uid))
        .groupBy(coa.kode, coa.saldoNormal)
      const cb: Record<string, number> = {}
      for (const r of coaBalRows) cb[r.coaKode] = r.bal

      // Target values from live tables (same as neraca logic)
      const [br] = await db.select({ s: sql<number>`coalesce(sum(saldo)::bigint,0)` }).from(bankAccount).where(eq(bankAccount.unitId, uid))
      const target101 = br?.s ?? 0
      const sppRows = await db.query.tagihanSiswa.findMany({ where: and(eq(tagihanSiswa.unitId, uid), inArray(tagihanSiswa.status, ['terbit', 'cicil'])) })
      const target102 = sppRows.reduce((s, r) => s + r.nominal - (r.diskon || 0) - r.sudahDibayar, 0)
      const hpRows = await db.query.hutangPiutang.findMany({ where: and(eq(hutangPiutang.unitId, uid), inArray(hutangPiutang.status, ['belum_lunas', 'cicil'])) })
      const target103 = hpRows.filter((r: any) => r.tipe === 'piutang').reduce((s: number, r: any) => s + r.sisa, 0)
      const asetRows = await db.query.asetTetap.findMany({ where: and(eq(asetTetap.unitId, uid), eq(asetTetap.status, 'aktif')) })
      const asetNBV = asetRows.reduce((s, a) => s + a.hargaPerolehan - a.akumulasiPenyusutan, 0)
      const target201 = hpRows.filter((r: any) => r.tipe === 'hutang' && r.kategori !== 'pinjaman').reduce((s: number, r: any) => s + r.sisa, 0)
      const gajiRows = await db.query.penggajian.findMany({ where: and(eq(penggajian.unitId, uid), inArray(penggajian.status, ['draft', 'disetujui'])) })
      const target202 = gajiRows.reduce((s, r) => s + r.totalDiterima, 0)
      const target203 = gajiRows.reduce((s, r) => s + (r.pph21 || 0), 0)
      const target204 = gajiRows.reduce((s, r) => s + (r.bpjsKaryawan || 0) + (r.bpjsPerusahaan || 0), 0)
      const target205 = hpRows.filter((r: any) => r.tipe === 'hutang' && r.kategori === 'pinjaman').reduce((s: number, r: any) => s + r.sisa, 0)

      // Compute target 3.x.00 = Total Aset - Total Liabilitas
      const danaRows = await db.query.dana.findMany({ where: eq(dana.unitId, uid) })
      let danaTemporer = 0, danaPermanen = 0
      for (const d of danaRows) {
        const sisa = (d.targetNominal || 0) - (d.realisasi || 0)
        if (d.jenisIkat === 'terikat_temporer') danaTemporer += sisa
        else if (d.jenisIkat === 'terikat_permanen') danaPermanen += sisa
      }
      const totalAsetT = target101 + target102 + target103 + asetNBV
      const totalLiabT = target201 + target202 + target203 + target204 + target205
      const targetAN = totalAsetT - totalLiabT

      // Already journaled: danaTemporer → 3.2.00, danaPermanen → 3.3.00
      // Remaining goes to 3.1.00
      const target310 = targetAN - danaTemporer - danaPermanen
      const current310 = cb['3.1.00'] || 0
      const delta310 = target310 - current310
      if (Math.abs(delta310) < 1) continue

      const [ktOB] = await db.insert(kasTransaksi).values({
        unitId: uid, tipe: delta310 >= 0 ? 'pemasukan' : 'pengeluaran', refType: 'penyesuaian',
        jumlah: delta310 >= 0 ? delta310 : Math.abs(delta310),
        keterangan: 'Penyesuaian saldo awal neraca',
        tanggal: '2025-12-31', refId: uid, createdBy: session.user.id,
      }).returning()
      const [jhOB] = await db.insert(jurnalHeader).values({
        unitId: uid, nomor: `JU-SALDOAWAL-${uid.slice(0, 8)}`,
        tanggal: '2025-12-31', tipe: 'penyesuaian',
        referensi: `transaksi/${ktOB.id}`, transaksiId: ktOB.id,
        keterangan: 'Penyesuaian saldo awal neraca',
        createdBy: session.user.id,
      }).returning()

      // Offset to Kas & Bank COA (will make getNeracaDariJurnal kas match live table)
      const deltaKas = target101 - (cb['1.1.01'] || 0)
      const deltaSPP = target102 - (cb['1.1.02'] || 0)
      const deltaPiutang = target103 - (cb['1.1.03'] || 0)
      const deltaHutang = target201 - (cb['2.1.01'] || 0)
      const deltaGaji = target202 - (cb['2.1.02'] || 0)
      const deltaPajak = target203 - (cb['2.1.03'] || 0)
      const deltaBpjs = target204 - (cb['2.1.04'] || 0)
      const deltaPinjaman = target205 - (cb['2.1.05'] || 0)

      const obEntries: { coaId: string; debit: number; kredit: number; ket: string }[] = []
      if (deltaKas) obEntries.push({ coaId: coa101!.id, debit: deltaKas > 0 ? deltaKas : 0, kredit: deltaKas < 0 ? -deltaKas : 0, ket: 'Penyesuaian Kas' })
      if (deltaSPP) obEntries.push({ coaId: coa102!.id, debit: deltaSPP > 0 ? deltaSPP : 0, kredit: deltaSPP < 0 ? -deltaSPP : 0, ket: 'Penyesuaian Piutang SPP' })
      if (deltaPiutang) obEntries.push({ coaId: coa103!.id, debit: deltaPiutang > 0 ? deltaPiutang : 0, kredit: deltaPiutang < 0 ? -deltaPiutang : 0, ket: 'Penyesuaian Piutang Lain' })
      if (deltaHutang) obEntries.push({ coaId: coa201!.id, debit: deltaHutang < 0 ? -deltaHutang : 0, kredit: deltaHutang > 0 ? deltaHutang : 0, ket: 'Penyesuaian Utang' })
      if (deltaGaji) obEntries.push({ coaId: coa202!.id, debit: deltaGaji < 0 ? -deltaGaji : 0, kredit: deltaGaji > 0 ? deltaGaji : 0, ket: 'Penyesuaian Utang Gaji' })
      if (deltaPajak) obEntries.push({ coaId: coa203!.id, debit: deltaPajak < 0 ? -deltaPajak : 0, kredit: deltaPajak > 0 ? deltaPajak : 0, ket: 'Penyesuaian Utang Pajak' })
      if (deltaBpjs) obEntries.push({ coaId: coa204!.id, debit: deltaBpjs < 0 ? -deltaBpjs : 0, kredit: deltaBpjs > 0 ? deltaBpjs : 0, ket: 'Penyesuaian Utang BPJS' })
      if (deltaPinjaman) obEntries.push({ coaId: coa205!.id, debit: deltaPinjaman < 0 ? -deltaPinjaman : 0, kredit: deltaPinjaman > 0 ? deltaPinjaman : 0, ket: 'Penyesuaian Pinjaman' })
      if (delta310) obEntries.push({ coaId: coa310!.id, debit: delta310 < 0 ? -delta310 : 0, kredit: delta310 > 0 ? delta310 : 0, ket: 'Penyesuaian Aset Neto' })
      for (const e of obEntries) {
        await db.insert(jurnalDetail).values({ jurnalId: jhOB.id, coaId: e.coaId, debit: e.debit, kredit: e.kredit, keterangan: e.ket })
      }
    }

    return {
      message: `Seed berhasil! 2 unit (TK Annahl & SD Annahl), ${tkData.siswa.length + sdData.siswa.length} siswa (TK ${tkData.siswa.length}, SD ${sdData.siswa.length}), ${tkData.pegawai.length + sdData.pegawai.length} pegawai, SPP 12 bln full 2026, payroll 12 bulan, BOS, aset, dana, beasiswa, anggaran pembangunan 100jt, hutang bank tanah 13jt/bln.`,
      stats: {
        unit: 2,
        tingkat: tkData.kelas.length === 2 ? 1 : 6,
        kelas: tkData.kelas.length + sdData.kelas.length,
        siswa: tkData.siswa.length + sdData.siswa.length,
        pegawai: tkData.pegawai.length + sdData.pegawai.length,
        sppBulan: 12,
        pembayaran: pembCount,
        kasTransaksi: kasCount,
        aset: 10,
        dana: 4,
        vendor: 7,
        hutangPiutang: 7,
        beasiswa: 2,
        anggaran: 1,
      },
    }
  })

// ─── Reset Data ─────────────────────────────────────────────────────────────

const TABLES_TO_DELETE = [
  jurnalDetail, jurnalHeader,
  bosRealisasi, bosRkas, bosPeriode,
  pembayaran, tagihanSiswa, tagihanItem, tagihan, sppSetting,
  kasTransaksi, kasKategori, bankAccount, vendor, hutangPiutang,
  asetTetap, dana, anggaran,
  siswaBeasiswa, beasiswa,
  penggajianDetail, penggajian, penggajianKomponen,
  siswa, kelas, tingkat, tahunAjaran,
  pegawai, coa,
  userUnit, unit,
]

export const resetAllData = createServerFn({ method: 'POST' })
  .validator(z.object({ force: z.boolean() }))
  .handler(async ({ data }) => {
    if (!data.force) throw new Error('force=true diperlukan')

    await getSessionOrThrow()

    // Delete in reverse dependency order
    for (const t of TABLES_TO_DELETE) {
      await db.delete(t).execute().catch(() => {})
    }

    return {
      message: 'Semua data berhasil direset. Yayasan, akun pengguna, dan sesi tetap dipertahankan.',
      preserved: { yayasan: true, authUser: true, session: true },
    }
  })
