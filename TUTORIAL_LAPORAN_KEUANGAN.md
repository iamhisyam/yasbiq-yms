# Tutorial: Alur Laporan Keuangan ISAK 35

**Yayasan Annahl Foundation Management System**

---

## Daftar Isi

1. [Persiapan: Seed Data Dummy](#1-persiapan-seed-data-dummy)
2. [Chart of Accounts (COA)](#2-chart-of-accounts-coa)
3. [Input Transaksi Kas (Kas Masuk / Kas Keluar)](#3-input-transaksi-kas)
4. [Double-Entry Journal (Otomatis)](#4-double-entry-journal)
5. [Trial Balance (Neraca Saldo)](#5-trial-balance)
6. [Buku Besar (General Ledger)](#6-buku-besar)
7. [Laporan Posisi Keuangan (Neraca)](#7-laporan-posisi-keuangan)
8. [Laporan Penghasilan Komprehensif (Laba Rugi)](#8-laporan-penghasilan-komprehensif)
9. [Jurnal Penyusutan & Penutupan Buku](#9-jurnal-penyusutan--penutupan-buku)
10. [Laporan Arus Kas](#10-laporan-arus-kas)
11. [Laporan Perubahan Aset Neto](#11-laporan-perubahan-aset-neto)
12. [Rangkuman: Dari Input Kas ke 6 Laporan ISAK 35](#12-rangkuman)

---

## 1. Persiapan: Seed Data Dummy

Akses halaman **System → Aplikasi** lalu scroll ke bagian **Data Development**.

Klik **Seed Data Dummy** → konfirmasi → data akan digenerate:

| Data | Jumlah |
|---|---|
| Unit Sekolah | 2 (TK Annahl + SD Annahl) |
| Pegawai | 20 orang |
| Siswa | 50 orang |
| SPP 12 bulan | 600 tagihan |
| Bank & Kas | 4 rekening |
| Vendor | 6 |
| COA ISAK 35 | 56 akun (28 × 2 unit) |
| Jurnal | dari KasTransaksi |

> ⚠️ **Seed akan menghapus SEMUA data** yang ada. Gunakan hanya untuk development/testing.

💡 **Setelah seed selesai, halaman akan auto-reload** untuk menyegarkan data.

---

## 2. Chart of Accounts (COA)

Buka sidebar **System → Chart of Accounts**.

![COA Structure](https://via.placeholder.com/800x200?text=COA+ISAK+35+Structure)

**Struktur COA mengikuti standar ISAK 35:**

| Kode | Tipe Akun | Saldo Normal | Contoh |
|---|---|---|---|
| `1.1.xx` | Aset Lancar | **Debit** | Kas & Bank, Piutang SPP |
| `1.2.xx` | Aset Tetap | **Debit** | Tanah, Gedung, Akumulasi Penyusutan |
| `2.1.xx` | Liabilitas | **Kredit** | Utang Usaha, Utang Gaji, Utang BPJS |
| `3.x.00` | Aset Neto | **Kredit** | Tanpa Pembatasan, Terikat Temporer |
| `4.1.xx` | Pendapatan | **Kredit** | SPP, Donasi, Bantuan Pemerintah |
| `5.1.xx` | Beban | **Debit** | Gaji, ATK, Listrik, Penyusutan |

> 💡 **Aturan dasar**: Aset & Beban bertambah di **Debit**. Liabilitas, Aset Neto & Pendapatan bertambah di **Kredit**.

---

## 3. Input Transaksi Kas

### Cara Manual

Buka sidebar **Yayasan → Kas** (`/keuangan`).

1. Pilih tipe: **Pemasukan** atau **Pengeluaran**
2. Isi jumlah (Rp)
3. Pilih **Kategori** (e.g., "Penerimaan SPP", "ATK & Perlengkapan")
4. Pilih **Bank Account** (optional — bisa kosong untuk kas tunai)
5. Isi **Keterangan** (wajib)
6. Isi **Tanggal**
7. Klik **Simpan**

### Cara Otomatis

Transaksi juga dibuat otomatis saat:
- Pembayaran **SPP** siswa → tipe `pemasukan`
- Pembayaran **Tagihan Lainnya** → tipe `pemasukan`
- **Penggajian** dibayar → tipe `pengeluaran`
- **BOS** realisasi → tipe `pengeluaran`

---

## 4. Double-Entry Journal (Otomatis)

Setiap `KasTransaksi` yang dibuat akan **otomatis generate jurnal double-entry**.

### Contoh 1: Penerimaan SPP Rp 350.000

```
┌──────────────────────────────────────────────────────┐
│  Jurnal: JU-2026-0001                                │
│  Tanggal: 2026-01-05                                 │
│  Tipe: spp                                           │
├──────────────────────────────────────────────────────┤
│  Debit:  Kas & Bank (1.1.01)              Rp 350.000 │
│  Kredit: Pendapatan SPP (4.1.01)          Rp 350.000 │
├──────────────────────────────────────────────────────┤
│  TOTAL:  Debit = Kredit  ✅                          │
└──────────────────────────────────────────────────────┘
```

### Contoh 2: Pembayaran Gaji Rp 8.500.000

```
┌──────────────────────────────────────────────────────┐
│  Jurnal: JU-2026-0010                                │
│  Tanggal: 2026-01-28                                 │
│  Tipe: gaji                                          │
├──────────────────────────────────────────────────────┤
│  Debit:  Beban Gaji & Honorer (5.1.01)    Rp 8.500.000│
│  Kredit: Kas & Bank (1.1.01)              Rp 8.500.000│
├──────────────────────────────────────────────────────┤
│  TOTAL:  Debit = Kredit  ✅                          │
└──────────────────────────────────────────────────────┘
```

### Mapping Kategori → COA

| Kategori Kas | Kode COA | Akun |
|---|---|---|
| Penerimaan SPP | `4.1.01` | Pendapatan SPP |
| Penerimaan Donasi | `4.1.02` | Pendapatan Donasi |
| Penerimaan Lainnya | `4.1.04` | Pendapatan Lainnya |
| Gaji & Honorer | `5.1.01` | Beban Gaji |
| ATK & Perlengkapan | `5.1.02` | Beban ATK |
| Listrik/Air/Telepon | `5.1.03` | Beban Listrik |
| Operasional Sekolah | `5.1.04` | Beban Operasional |
| Pemeliharaan | `5.1.05` | Beban Pemeliharaan |
| Transportasi | `5.1.06` | Beban Transportasi |
| Pengeluaran Lainnya | `5.1.08` | Beban Lainnya |

---

## 5. Trial Balance (Neraca Saldo)

Buka **Laporan Keuangan → Tab "Trial Balance"**.

Menampilkan **semua akun COA** dengan:
- Total Debit dan Kredit per akun
- Saldo Debit/Kredit sesuai **saldo normal**
- **Balance check**: Total Debit = Total Kredit → **SEIMBANG**

![Trial Balance](https://via.placeholder.com/800x300?text=Trial+Balance+Table)

💡 **Gunakan filter tanggal** (Mulai – Akhir) untuk melihat periode tertentu.

---

## 6. Buku Besar (General Ledger)

Buka **Laporan Keuangan → Tab "Buku Besar"**.

Menampilkan **mutasi per akun**:
- Setiap akun COA dengan header (kode, nama, tipe, saldo)
- Detail jurnal per akun (tanggal, keterangan, debit, kredit)
- Total Debit, Total Kredit, Saldo Akhir

💡 Bisa difilter per **tanggal** (Mulai – Akhir) untuk melihat periode tertentu.

---

## 7. Laporan Posisi Keuangan (Neraca)

Buka **Laporan Keuangan → Tab "Neraca"**.

Format 2-kolom standar ISAK 35:

```
┌──────────────────────────┐  ┌──────────────────────────┐
│  ASET                    │  │  LIABILITAS              │
│  ├ Kas & Bank            │  │  ├ Utang Usaha           │
│  ├ Piutang SPP           │  │  ├ Utang Gaji            │
│  ├ Piutang Lainnya       │  │  ├ Utang Pajak (PPh 21)  │
│  └ Aset Tetap            │  │  └ Utang BPJS            │
│                          │  │                          │
│  TOTAL ASET    Rp xxx    │  │  TOTAL LIABILITAS  Rp xx │
│                          │  ├──────────────────────────┤
│                          │  │  ASET NETO               │
│                          │  │  ├ Tanpa Pembatasan      │
│                          │  │  └ Dengan Pembatasan     │
│                          │  │     └ Terikat Temporer   │
│                          │  │  TOTAL ASET NETO  Rp xx  │
└──────────────────────────┘  └──────────────────────────┘

✅ Total Aset = Total Liabilitas + Aset Neto → SEIMBANG
```

Setiap baris punya **Accordion** yang bisa di-klik untuk melihat detail:
- Kas & Bank → breakdown per rekening
- Piutang SPP → per siswa
- Utang Gaji → per pegawai per periode

---

## 8. Laporan Penghasilan Komprehensif (Laba Rugi / Surplus Defisit)

Buka **Laporan Keuangan → Tab "Laba Rugi / Surplus Defisit"**.

Menampilkan **pendapatan** dan **beban** dari jurnal:

```
┌─────────────────────────────────────────────┐
│  PENDAPATAN                                 │
│  ├ Pendapatan SPP              Rp xxx       │
│  ├ Pendapatan Donasi           Rp xxx       │
│  └ Pendapatan Lainnya          Rp xxx       │
│  TOTAL PENDAPATAN              Rp xxx       │
├─────────────────────────────────────────────┤
│  BEBAN                                      │
│  ├ Beban Gaji & Honorer        Rp xxx       │
│  ├ Beban ATK & Perlengkapan    Rp xxx       │
│  ├ Beban Listrik/Air/Telepon   Rp xxx       │
│  ├ Beban Operasional           Rp xxx       │
│  ├ Beban Pemeliharaan          Rp xxx       │
│  ├ Beban Transportasi          Rp xxx       │
│  ├ Beban Penyusutan            Rp xxx       │
│  └ Beban Lainnya               Rp xxx       │
│  TOTAL BEBAN                   Rp xxx       │
├─────────────────────────────────────────────┤
│  SURPLUS / DEFISIT             Rp xxx       │
└─────────────────────────────────────────────┘
```

💡 **Gunakan filter tanggal** (Mulai – Akhir) untuk melihat periode.

💡 **Beban Penyusutan**:
- Jika **Jurnal Penyusutan** sudah dibuat → diambil dari jurnal (akun `5.1.07`)
- Jika belum → dihitung otomatis dari **Aset Tetap** yang aktif

---

## 9. Jurnal Penyusutan & Penutupan Buku

### Jurnal Penyusutan (Bulanan/Tahunan)

Buka **Laporan Keuangan → Tab "Laba Rugi"** → tombol **"Jurnal Penyusutan"** di pojok kanan.

1. Masukkan periode (YYYY-MM), e.g., `2026-06`
2. Klik OK

Sistem akan:
1. Menghitung beban penyusutan untuk **semua aset tetap aktif**
2. Membuat jurnal: **Debit Beban Penyusutan / Kredit Akumulasi Penyusutan**
3. Mengupdate `akumulasiPenyusutan` pada setiap aset

```
Debit:  Beban Penyusutan (5.1.07)       Rp xxx
Kredit: Akumulasi Penyusutan (1.2.06)    Rp xxx
```

### Tutup Buku (Tahunan)

Buka **Laporan Keuangan → Tab "Laba Rugi"** → tombol **"Tutup Buku"** di pojok kanan.

1. Masukkan tahun buku, e.g., `2026`
2. Klik OK

Sistem akan:
1. **Menutup Pendapatan** → Debit Pendapatan / Kredit Aset Neto
2. **Menutup Beban** → Debit Aset Neto / Kredit Beban
3. Surplus/Defisit → ke **Aset Neto Tanpa Pembatasan**

```
Debit:  Pendapatan SPP (4.1.01)           Rp xxx
Debit:  Pendapatan Donasi (4.1.02)        Rp xxx
Kredit: Aset Neto Tanpa Pembatasan (3.1.00) Rp xxx
───
Debit:  Aset Neto Tanpa Pembatasan (3.1.00) Rp xxx
Kredit: Beban Gaji (5.1.01)              Rp xxx
Kredit: Beban ATK (5.1.02)               Rp xxx
...
```

> ⚠️ **Tutup Buku hanya bisa dilakukan 1× per tahun.** Jika sudah ada, sistem akan menolak.

---

## 10. Laporan Arus Kas

Buka **Laporan Keuangan → Tab "Arus Kas"**.

Menampilkan cash flow tahunan diklasifikasi per **aktivitas ISAK 35**:

```
┌─────────────────────────────────────────────┐
│  A. AKTIVITAS OPERASI                       │
│     Masuk (SPP, Donasi)        Rp xxx       │
│     Keluar (Gaji, ATK, Listrik) Rp xxx      │
│     Netto Operasi              Rp xxx       │
├─────────────────────────────────────────────┤
│  B. AKTIVITAS INVESTASI                     │
│     Masuk                       Rp 0        │
│     Keluar (Pembelian Aset)    Rp xxx       │
│     Netto Investasi             Rp xxx       │
├─────────────────────────────────────────────┤
│  C. AKTIVITAS PENDANAAN                     │
│     Masuk (Donasi Terikat)     Rp xxx       │
│     Keluar                      Rp 0        │
│     Netto Pendanaan             Rp xxx       │
├─────────────────────────────────────────────┤
│  SALDO AWAL                    Rp xxx       │
│  SALDO AKHIR                   Rp xxx       │
└─────────────────────────────────────────────┘
```

💡 Gunakan input **Tahun** untuk melihat data historis (2025, 2026).

---

## 11. Laporan Perubahan Aset Neto

Buka **Laporan Keuangan → Tab "Aset Neto"**.

Menampilkan mutasi Aset Neto per tahun:

```
┌─────────────────────────────────────────────┐
│  Keterangan                   Perubahan     │
│  Aset Neto Tanpa Pembatasan  +Rp xxx        │
│  Aset Neto Terikat Temporer  +Rp xxx        │
│  Aset Neto Terikat Permanen     Rp 0        │
│  TOTAL PERUBAHAN ASET NETO   +Rp xxx        │
└─────────────────────────────────────────────┘
```

Perubahan berasal dari:
- **Surplus/Defisit** tahun berjalan (dari jurnal penutup)
- **Donasi terikat** yang diterima (dari jurnal pendapatan)
- **Pelepasan pembatasan** (release restrictions)

---

## 12. Rangkuman: Dari Input Kas ke 6 Laporan ISAK 35

```
┌────────────┐     ┌─────────────┐     ┌──────────────┐
│  Input Kas │────→│  Jurnal     │────→│  Buku Besar  │
│ (Pemasukan │     │  Double     │     │  (GL)        │
│ /Keluar)   │     │  Entry      │     │              │
└────────────┘     └──────┬──────┘     └──────┬───────┘
                          │                   │
                          ▼                   ▼
                    ┌─────────────┐     ┌──────────────┐
                    │  Trial      │     │  6 Laporan   │
                    │  Balance    │     │  ISAK 35     │
                    │             │     │              │
                    └─────────────┘     ├──────────────┤
                                        │ 1. Neraca    │
        ┌───────────────────────────────┤ 2. Laba Rugi │
        │                               │ 3. Arus Kas  │
        ▼                               │ 4. Aset Neto │
  ┌─────────────┐                       │ 5. Trial Bal │
  │  Jurnal     │                       │ 6. Buku Besar│
  │  Penyesuaian│                       └──────────────┘
  │  (Penyusutan│
  │  + Penutup) │
  └─────────────┘
```

### Checklist Bulanan

- [ ] Input **Kas Masuk** (SPP, Donasi, dll)
- [ ] Input **Kas Keluar** (ATK, Listrik, dll)
- [ ] Proses **Penggajian** bulan ini
- [ ] Bayar **Penggajian yang sudah disetujui**
- [ ] Lihat **Trial Balance** — pastikan seimbang

### Checklist Akhir Tahun

- [ ] Jalankan **Jurnal Penyusutan** untuk 12 bulan
- [ ] Verifikasi **Neraca** — semua aset & liabilitas tercatat
- [ ] Verifikasi **Laba Rugi** — semua pendapatan & beban tercatat
- [ ] Jalankan **Tutup Buku** untuk tahun berjalan
- [ ] Lihat **Arus Kas** tahunan
- [ ] Lihat **Perubahan Aset Neto**

### Rumus Dasar ISAK 35

```
ASET = LIABILITAS + ASET NETO

dimana:
  ASET = Kas + Piutang + Aset Tetap (net)
  LIABILITAS = Utang Usaha + Utang Gaji + Utang Pajak + Utang BPJS
  ASET NETO = Tanpa Pembatasan + Dengan Pembatasan

PENDAPATAN − BEBAN = SURPLUS / DEFISIT

SURPLUS / DEFISIT → ditutup ke ASET NETO TANPA PEMBATASAN
```

---

*Dokumen ini menjelaskan alur pelaporan keuangan sesuai standar **ISAK 35** — Interpretasi Standar Akuntansi Keuangan untuk Entitas Non-Laba.*
