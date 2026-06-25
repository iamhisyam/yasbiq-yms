import { eq } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { kasKategori, unit, userUnit, authUser, coa, jurnalHeader, jurnalDetail } from '#/db/schema/index'

// ─── Shared COA Definition (ISAK 35) ─────────────────────────────────────────
export const DEFAULT_COA = [
  { kode: '1.1.01', nama: 'Kas & Bank',                   tipe: 'aset_lancar' as const, subTipe: 'kas' as const,       saldoNormal: 'debit' as const,  level: 1, urutan: 1 },
  { kode: '1.1.02', nama: 'Piutang SPP',                  tipe: 'aset_lancar' as const, subTipe: 'piutang' as const,    saldoNormal: 'debit' as const,  level: 1, urutan: 2 },
  { kode: '1.1.03', nama: 'Piutang Lainnya',              tipe: 'aset_lancar' as const, subTipe: 'piutang' as const,    saldoNormal: 'debit' as const,  level: 1, urutan: 3 },
  { kode: '1.1.04', nama: 'Aset Lancar Lainnya',          tipe: 'aset_lancar' as const, subTipe: undefined,             saldoNormal: 'debit' as const,  level: 1, urutan: 4 },
  { kode: '1.2.01', nama: 'Aset Tetap — Tanah',           tipe: 'aset_tetap' as const,  subTipe: undefined,             saldoNormal: 'debit' as const,  level: 1, urutan: 5 },
  { kode: '1.2.02', nama: 'Aset Tetap — Gedung',          tipe: 'aset_tetap' as const,  subTipe: undefined,             saldoNormal: 'debit' as const,  level: 1, urutan: 6 },
  { kode: '1.2.03', nama: 'Aset Tetap — Kendaraan',       tipe: 'aset_tetap' as const,  subTipe: undefined,             saldoNormal: 'debit' as const,  level: 1, urutan: 7 },
  { kode: '1.2.04', nama: 'Aset Tetap — Peralatan',       tipe: 'aset_tetap' as const,  subTipe: undefined,             saldoNormal: 'debit' as const,  level: 1, urutan: 8 },
  { kode: '1.2.05', nama: 'Aset Tetap — Inventaris',      tipe: 'aset_tetap' as const,  subTipe: undefined,             saldoNormal: 'debit' as const,  level: 1, urutan: 9 },
  { kode: '1.2.06', nama: 'Akumulasi Penyusutan',         tipe: 'aset_tetap' as const,  subTipe: 'penyusutan' as const, saldoNormal: 'kredit' as const, level: 1, urutan: 10 },
  { kode: '2.1.01', nama: 'Utang Usaha',                  tipe: 'liabilitas' as const,  subTipe: 'utang' as const,      saldoNormal: 'kredit' as const, level: 1, urutan: 11 },
  { kode: '2.1.02', nama: 'Utang Gaji',                   tipe: 'liabilitas' as const,  subTipe: 'utang' as const,      saldoNormal: 'kredit' as const, level: 1, urutan: 12 },
  { kode: '2.1.03', nama: 'Utang Pajak (PPh 21)',          tipe: 'liabilitas' as const,  subTipe: 'utang' as const,      saldoNormal: 'kredit' as const, level: 1, urutan: 13 },
  { kode: '2.1.04', nama: 'Utang BPJS',                   tipe: 'liabilitas' as const,  subTipe: 'utang' as const,      saldoNormal: 'kredit' as const, level: 1, urutan: 14 },
  { kode: '2.1.05', nama: 'Utang Jangka Panjang',          tipe: 'liabilitas' as const,  subTipe: 'utang' as const,      saldoNormal: 'kredit' as const, level: 1, urutan: 15 },
  { kode: '3.1.00', nama: 'Aset Neto Tanpa Pembatasan',    tipe: 'aset_neto' as const,    subTipe: undefined,             saldoNormal: 'kredit' as const, level: 1, urutan: 16 },
  { kode: '3.2.00', nama: 'Aset Neto Terikat Temporer',    tipe: 'aset_neto' as const,    subTipe: undefined,             saldoNormal: 'kredit' as const, level: 1, urutan: 17 },
  { kode: '3.3.00', nama: 'Aset Neto Terikat Permanen',    tipe: 'aset_neto' as const,    subTipe: undefined,             saldoNormal: 'kredit' as const, level: 1, urutan: 18 },
  { kode: '4.1.01', nama: 'Pendapatan SPP',               tipe: 'pendapatan' as const,  subTipe: undefined,             saldoNormal: 'kredit' as const, level: 1, urutan: 19 },
  { kode: '4.1.02', nama: 'Pendapatan Donasi',            tipe: 'pendapatan' as const,  subTipe: undefined,             saldoNormal: 'kredit' as const, level: 1, urutan: 20 },
  { kode: '4.1.03', nama: 'Pendapatan Bantuan Pemerintah', tipe: 'pendapatan' as const,  subTipe: undefined,             saldoNormal: 'kredit' as const, level: 1, urutan: 21 },
  { kode: '4.1.04', nama: 'Pendapatan Lainnya',           tipe: 'pendapatan' as const,  subTipe: undefined,             saldoNormal: 'kredit' as const, level: 1, urutan: 22 },
  { kode: '5.1.01', nama: 'Beban Gaji & Honorer',         tipe: 'beban' as const,       subTipe: undefined,             saldoNormal: 'debit' as const,  level: 1, urutan: 23 },
  { kode: '5.1.02', nama: 'Beban ATK & Perlengkapan',     tipe: 'beban' as const,       subTipe: undefined,             saldoNormal: 'debit' as const,  level: 1, urutan: 24 },
  { kode: '5.1.03', nama: 'Beban Listrik/Air/Telepon',    tipe: 'beban' as const,       subTipe: undefined,             saldoNormal: 'debit' as const,  level: 1, urutan: 25 },
  { kode: '5.1.04', nama: 'Beban Operasional',            tipe: 'beban' as const,       subTipe: undefined,             saldoNormal: 'debit' as const,  level: 1, urutan: 26 },
  { kode: '5.1.05', nama: 'Beban Pemeliharaan',           tipe: 'beban' as const,       subTipe: undefined,             saldoNormal: 'debit' as const,  level: 1, urutan: 27 },
  { kode: '5.1.06', nama: 'Beban Transportasi',           tipe: 'beban' as const,       subTipe: undefined,             saldoNormal: 'debit' as const,  level: 1, urutan: 28 },
  { kode: '5.1.07', nama: 'Beban Penyusutan',             tipe: 'beban' as const,       subTipe: undefined,             saldoNormal: 'debit' as const,  level: 1, urutan: 29 },
  { kode: '5.1.08', nama: 'Beban Lainnya',                tipe: 'beban' as const,       subTipe: undefined,             saldoNormal: 'debit' as const,  level: 1, urutan: 30 },
]

// ─── Shared Kategori Definition (with COA mapping) ─────────────────────────
export const DEFAULT_KATEGORI: Array<{ nama: string; tipe: 'pemasukan' | 'pengeluaran'; warna: string; kodeCoretax: string; coaKode: string; keterangan: string }> = [
  { nama: 'Penerimaan SPP',             tipe: 'pemasukan',    warna: '#059669', kodeCoretax: '411281', coaKode: '4.1.01', keterangan: 'PPh Final Jasa Pendidikan — Pembayaran SPP siswa' },
  { nama: 'Penerimaan Tagihan',         tipe: 'pemasukan',    warna: '#059669', kodeCoretax: '411281', coaKode: '4.1.01', keterangan: 'PPh Final Jasa Pendidikan — Tagihan lainnya' },
  { nama: 'Uang Pangkal/Pendaftaran',   tipe: 'pemasukan',    warna: '#0284c7', kodeCoretax: '411281', coaKode: '4.1.01', keterangan: 'PPh Final Jasa Pendidikan — Pendaftaran siswa baru' },
  { nama: 'Bimbingan Belajar',          tipe: 'pemasukan',    warna: '#0ea5e9', kodeCoretax: '411281', coaKode: '4.1.04', keterangan: 'PPh Final Jasa Pendidikan — Kursus dan bimbingan' },
  { nama: 'Hasil Sewa Aset',            tipe: 'pemasukan',    warna: '#f59e0b', kodeCoretax: '411281', coaKode: '4.1.04', keterangan: 'PPh Final — Sewa tanah/bangunan milik yayasan' },
  { nama: 'Bunga Deposito/Jasa Giro',   tipe: 'pemasukan',    warna: '#10b981', kodeCoretax: '411128', coaKode: '4.1.04', keterangan: 'PPh Final — Bunga tabungan dan deposito' },
  { nama: 'Donasi/Sumbangan',           tipe: 'pemasukan',    warna: '#7c3aed', kodeCoretax: '',        coaKode: '4.1.02', keterangan: 'Bukan Objek Pajak — Donasi tidak mengikat untuk yayasan pendidikan' },
  { nama: 'Bantuan Pemerintah',         tipe: 'pemasukan',    warna: '#0d9488', kodeCoretax: '',        coaKode: '4.1.03', keterangan: 'Bukan Objek Pajak — BOS, BOP, dan bantuan pemerintah lainnya' },
  { nama: 'Pemasukan Lainnya',          tipe: 'pemasukan',    warna: '#6366f1', kodeCoretax: '411299', coaKode: '4.1.04', keterangan: 'PPh Final Lainnya' },
  { nama: 'Gaji & Honorer',             tipe: 'pengeluaran',  warna: '#dc2626', kodeCoretax: '411121', coaKode: '5.1.01', keterangan: 'PPh Pasal 21 — Gaji pegawai tetap dan honorer' },
  { nama: 'Honor Guru Tidak Tetap',     tipe: 'pengeluaran',  warna: '#e11d48', kodeCoretax: '411121', coaKode: '5.1.01', keterangan: 'PPh Pasal 21 — Honor guru tidak tetap/GTY' },
  { nama: 'Jasa Konstruksi',            tipe: 'pengeluaran',  warna: '#b91c1c', kodeCoretax: '411224', coaKode: '5.1.05', keterangan: 'PPh Final Pasal 4(2) — Pembangunan/renovasi gedung, jalan, dll' },
  { nama: 'Jasa Profesional',           tipe: 'pengeluaran',  warna: '#8b5cf6', kodeCoretax: '411211', coaKode: '5.1.08', keterangan: 'PPh Pasal 23 — Konsultan, notaris, pengawas, dll' },
  { nama: 'Sewa Kendaraan',             tipe: 'pengeluaran',  warna: '#0891b2', kodeCoretax: '411211', coaKode: '5.1.08', keterangan: 'PPh Pasal 23 — Sewa kendaraan/alat berat' },
  { nama: 'Operasional Sekolah',        tipe: 'pengeluaran',  warna: '#ea580c', kodeCoretax: '411211', coaKode: '5.1.04', keterangan: 'PPh Pasal 23 — Kebutuhan operasional harian' },
  { nama: 'ATK & Perlengkapan',         tipe: 'pengeluaran',  warna: '#ca8a04', kodeCoretax: '411211', coaKode: '5.1.02', keterangan: 'PPh Pasal 23 — Alat tulis kantor dan perlengkapan' },
  { nama: 'Listrik/Air/Telepon',        tipe: 'pengeluaran',  warna: '#d97706', kodeCoretax: '411211', coaKode: '5.1.03', keterangan: 'PPh Pasal 23 — Utilitas bulanan' },
  { nama: 'Pemeliharaan Gedung',        tipe: 'pengeluaran',  warna: '#b91c1c', kodeCoretax: '411211', coaKode: '5.1.05', keterangan: 'PPh Pasal 23 — Perbaikan dan pemeliharaan fasilitas' },
  { nama: 'Transportasi',               tipe: 'pengeluaran',  warna: '#0891b2', kodeCoretax: '411211', coaKode: '5.1.06', keterangan: 'PPh Pasal 23 — Transportasi dan akomodasi' },
  { nama: 'Kegiatan Siswa',             tipe: 'pengeluaran',  warna: '#4f46e5', kodeCoretax: '411211', coaKode: '5.1.08', keterangan: 'PPh Pasal 23 — Ekstrakurikuler, karya wisata, dll' },
  { nama: 'Realisasi BOS',              tipe: 'pengeluaran',  warna: '#0d9488', kodeCoretax: '411211', coaKode: '5.1.04', keterangan: 'PPh Pasal 23 — Realisasi BOS untuk operasional sekolah' },
  { nama: 'Pengeluaran Lainnya',        tipe: 'pengeluaran',  warna: '#6b7280', kodeCoretax: '411299', coaKode: '5.1.08', keterangan: 'PPh Lainnya' },
]

export async function ensureKategori(
  nama: string,
  tipe: 'pemasukan' | 'pengeluaran',
  kodeCoretax?: string,
  keterangan?: string,
  coaKode?: string,
) {
  let kategori = await db.query.kasKategori.findFirst({
    where: eq(kasKategori.nama, nama),
  })
  if (kategori) return kategori

  const [k] = await db.insert(kasKategori).values({
    nama, tipe,
    kodeCoretax: kodeCoretax || null,
    keterangan: keterangan || null,
    coaKode: coaKode || null,
  }).returning()
  return k
}

export async function resolveScope(userId: string, currentUnitId: string): Promise<{
  unitIds: string[]
  yayasanNama: string | null
  role: string
}> {
  const access = await db.query.userUnit.findFirst({
    where: eq(userUnit.userId, userId),
    with: { unit: { with: { yayasan: true } } },
  })

  const role = (access?.role as string) ?? 'operator'
  const u = await db.query.unit.findFirst({
    where: eq(unit.id, currentUnitId),
    with: { yayasan: true },
  })

  if (!u) return { unitIds: [currentUnitId], yayasanNama: null, role }

  const yayasanNama = u.yayasan?.nama || null

  if (role === 'operator' || role === 'guru') {
    return { unitIds: [currentUnitId], yayasanNama, role }
  }

  const allUnits = await db.query.unit.findMany({
    where: eq(unit.yayasanId, u.yayasanId),
  })
  return {
    unitIds: allUnits.map((u) => u.id),
    yayasanNama,
    role,
  }
}

export async function resolveYayasanUnitIds(userId: string): Promise<string[]> {
  const user = await db.query.authUser.findFirst({
    where: eq(authUser.id, userId),
    columns: { isSuperAdmin: true },
  })
  if (user?.isSuperAdmin) {
    const units = await db.query.unit.findMany({ where: eq(unit.aktif, true), columns: { id: true } })
    return units.map((u) => u.id)
  }
  const access = await db.query.userUnit.findMany({
    where: eq(userUnit.userId, userId),
    with: { unit: true },
  })
  return access.map((a) => a.unit?.id).filter(Boolean)
}

export async function generateJurnalKas(
  unitId: string,
  tipe: 'pemasukan' | 'pengeluaran',
  jumlah: number,
  kategoriId: string | null,
  kategoriNama: string | null,
  tanggal: string,
  referensi: string | null,
  keterangan: string | null,
  createdBy: string,
  transaksiId?: string,
) {
  let coaKode = ''
  let resolvedNama = kategoriNama
  if (kategoriId) {
    const kat = await db.query.kasKategori.findFirst({ where: eq(kasKategori.id, kategoriId) })
    if (kat) {
      coaKode = kat.coaKode || ''
      if (!resolvedNama) resolvedNama = kat.nama
    }
  }
  if (!coaKode) {
    coaKode = tipe === 'pemasukan' ? '4.1.04' : '5.1.08'
  }

  const coaKas = await db.query.coa.findFirst({ where: eq(coa.kode, '1.1.01') })
  const coaCounter = await db.query.coa.findFirst({ where: eq(coa.kode, coaKode) })

  if (!coaKas || !coaCounter) return null

  return db.transaction(async (tx) => {
    const [jh] = await tx.insert(jurnalHeader).values({
      unitId,
      nomor: `JU-${tanggal.slice(0, 4)}-${Date.now().toString(36).toUpperCase()}`,
      tanggal,
      tipe: referensi?.startsWith('gaji/') ? 'gaji' : referensi?.startsWith('spp/') ? 'spp' : 'kas',
      referensi: transaksiId ? `transaksi/${transaksiId}` : (referensi || null),
      transaksiId: transaksiId || null,
      keterangan: keterangan || `${tipe} — ${resolvedNama || '-'}`,
      createdBy,
    }).returning()

    if (tipe === 'pemasukan') {
      await tx.insert(jurnalDetail).values({ jurnalId: jh.id, coaId: coaKas.id, debit: jumlah, kredit: 0, keterangan: resolvedNama })
      await tx.insert(jurnalDetail).values({ jurnalId: jh.id, coaId: coaCounter.id, debit: 0, kredit: jumlah, keterangan: resolvedNama })
    } else {
      await tx.insert(jurnalDetail).values({ jurnalId: jh.id, coaId: coaCounter.id, debit: jumlah, kredit: 0, keterangan: resolvedNama })
      await tx.insert(jurnalDetail).values({ jurnalId: jh.id, coaId: coaKas.id, debit: 0, kredit: jumlah, keterangan: resolvedNama })
    }

    return jh.id
  })
}
