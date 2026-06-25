/**
 * Pajak & BPJS calculation helpers — PP 58/2023 (TER Method)
 */

// ─── Constants ─────────────────────────────────────────────────────────────────

export const BPJS_CAP = 12_000_000 // Cap for BPJS Kesehatan & JHT per month
export const JP_CAP = 10_416_000   // Cap for JP (Jaminan Pensiun) per month — PMK 19/2023

// ─── PTKP per year ─────────────────────────────────────────────────────────────

export const PTKP: Record<string, number> = {
  'TK/0': 54_000_000,
  'TK/1': 58_500_000,
  'K/0': 58_500_000,
  'TK/2': 63_000_000,
  'K/1': 63_000_000,
  'TK/3': 67_500_000,
  'K/2': 67_500_000,
  'K/3': 72_000_000,
}

// ─── TER Category mapping ──────────────────────────────────────────────────────

export const TER_CATEGORY: Record<string, 'A' | 'B' | 'C'> = {
  'TK/0': 'A',
  'TK/1': 'A',
  'K/0': 'A',
  'TK/2': 'B',
  'TK/3': 'B',
  'K/1': 'B',
  'K/2': 'B',
  'K/3': 'C',
}

// ─── TER Rate Table (PP 58/2023, PMK 168/2023) ────────────────────────────────

type TerBracket = { max: number; rate: number }

const TER_A: TerBracket[] = [
  { max: 5_400_000, rate: 0 },
  { max: 5_650_000, rate: 0.0025 },
  { max: 5_950_000, rate: 0.005 },
  { max: 6_300_000, rate: 0.0075 },
  { max: 6_750_000, rate: 0.01 },
  { max: 7_500_000, rate: 0.0125 },
  { max: 8_550_000, rate: 0.015 },
  { max: 9_650_000, rate: 0.0175 },
  { max: 10_050_000, rate: 0.02 },
  { max: 10_350_000, rate: 0.0225 },
  { max: 10_700_000, rate: 0.025 },
  { max: 11_050_000, rate: 0.03 },
  { max: 11_600_000, rate: 0.035 },
  { max: 12_500_000, rate: 0.04 },
  { max: 13_750_000, rate: 0.05 },
  { max: 15_100_000, rate: 0.06 },
  { max: 16_950_000, rate: 0.07 },
  { max: 19_750_000, rate: 0.08 },
  { max: 24_150_000, rate: 0.09 },
  { max: 26_450_000, rate: 0.10 },
  { max: 28_000_000, rate: 0.11 },
  { max: 30_050_000, rate: 0.12 },
  { max: 32_400_000, rate: 0.13 },
  { max: 35_400_000, rate: 0.14 },
  { max: 39_100_000, rate: 0.15 },
  { max: 43_850_000, rate: 0.16 },
  { max: 47_800_000, rate: 0.17 },
  { max: 51_400_000, rate: 0.18 },
  { max: 56_300_000, rate: 0.19 },
  { max: 62_200_000, rate: 0.20 },
  { max: 68_600_000, rate: 0.21 },
  { max: 77_500_000, rate: 0.22 },
  { max: 89_000_000, rate: 0.23 },
  { max: 103_000_000, rate: 0.24 },
  { max: 125_000_000, rate: 0.25 },
  { max: 157_000_000, rate: 0.26 },
  { max: 206_000_000, rate: 0.27 },
  { max: 337_000_000, rate: 0.28 },
  { max: 454_000_000, rate: 0.29 },
  { max: 550_000_000, rate: 0.30 },
  { max: 695_000_000, rate: 0.31 },
  { max: 910_000_000, rate: 0.32 },
  { max: 1_400_000_000, rate: 0.33 },
  { max: Infinity, rate: 0.34 },
]

const TER_B: TerBracket[] = [
  { max: 6_200_000, rate: 0 },
  { max: 6_500_000, rate: 0.0025 },
  { max: 6_850_000, rate: 0.005 },
  { max: 7_300_000, rate: 0.0075 },
  { max: 9_200_000, rate: 0.01 },
  { max: 10_750_000, rate: 0.015 },
  { max: 11_250_000, rate: 0.02 },
  { max: 11_600_000, rate: 0.025 },
  { max: 12_600_000, rate: 0.03 },
  { max: 13_600_000, rate: 0.04 },
  { max: 14_950_000, rate: 0.05 },
  { max: 16_400_000, rate: 0.06 },
  { max: 18_450_000, rate: 0.07 },
  { max: 21_850_000, rate: 0.08 },
  { max: 26_000_000, rate: 0.09 },
  { max: 27_700_000, rate: 0.10 },
  { max: 29_350_000, rate: 0.11 },
  { max: 31_450_000, rate: 0.12 },
  { max: 33_950_000, rate: 0.13 },
  { max: 37_100_000, rate: 0.14 },
  { max: 41_100_000, rate: 0.15 },
  { max: 45_800_000, rate: 0.16 },
  { max: 49_500_000, rate: 0.17 },
  { max: 53_800_000, rate: 0.18 },
  { max: 58_500_000, rate: 0.19 },
  { max: 64_000_000, rate: 0.20 },
  { max: 71_000_000, rate: 0.21 },
  { max: 80_000_000, rate: 0.22 },
  { max: 93_000_000, rate: 0.23 },
  { max: 109_000_000, rate: 0.24 },
  { max: 129_000_000, rate: 0.25 },
  { max: 163_000_000, rate: 0.26 },
  { max: 211_000_000, rate: 0.27 },
  { max: 374_000_000, rate: 0.28 },
  { max: 459_000_000, rate: 0.29 },
  { max: 555_000_000, rate: 0.30 },
  { max: 704_000_000, rate: 0.31 },
  { max: 957_000_000, rate: 0.32 },
  { max: 1_405_000_000, rate: 0.33 },
  { max: Infinity, rate: 0.34 },
]

const TER_C: TerBracket[] = [
  { max: 6_600_000, rate: 0 },
  { max: 6_950_000, rate: 0.0025 },
  { max: 7_350_000, rate: 0.005 },
  { max: 7_800_000, rate: 0.0075 },
  { max: 8_850_000, rate: 0.01 },
  { max: 9_800_000, rate: 0.015 },
  { max: 10_550_000, rate: 0.02 },
  { max: 11_250_000, rate: 0.025 },
  { max: 11_600_000, rate: 0.03 },
  { max: 12_600_000, rate: 0.04 },
  { max: 13_900_000, rate: 0.05 },
  { max: 15_350_000, rate: 0.06 },
  { max: 17_050_000, rate: 0.07 },
  { max: 19_500_000, rate: 0.08 },
  { max: 22_700_000, rate: 0.09 },
  { max: 26_600_000, rate: 0.10 },
  { max: 28_100_000, rate: 0.11 },
  { max: 30_100_000, rate: 0.12 },
  { max: 32_600_000, rate: 0.13 },
  { max: 35_400_000, rate: 0.14 },
  { max: 38_900_000, rate: 0.15 },
  { max: 43_000_000, rate: 0.16 },
  { max: 47_400_000, rate: 0.17 },
  { max: 51_200_000, rate: 0.18 },
  { max: 55_800_000, rate: 0.19 },
  { max: 60_400_000, rate: 0.20 },
  { max: 66_700_000, rate: 0.21 },
  { max: 74_500_000, rate: 0.22 },
  { max: 83_200_000, rate: 0.23 },
  { max: 95_600_000, rate: 0.24 },
  { max: 110_000_000, rate: 0.25 },
  { max: 134_000_000, rate: 0.26 },
  { max: 174_000_000, rate: 0.27 },
  { max: 269_000_000, rate: 0.28 },
  { max: 367_000_000, rate: 0.29 },
  { max: 474_000_000, rate: 0.30 },
  { max: 596_000_000, rate: 0.31 },
  { max: 816_000_000, rate: 0.32 },
  { max: 1_440_000_000, rate: 0.33 },
  { max: Infinity, rate: 0.34 },
]

const TER_TABLES: Record<string, TerBracket[]> = { A: TER_A, B: TER_B, C: TER_C }

// ─── Calculation functions ────────────────────────────────────────────────────

/** Lookup TER rate based on category and gross monthly income */
export function getTerRate(statusPajak: string, brutoSebulan: number): number {
  const category = TER_CATEGORY[statusPajak]
  if (!category) return 0 // Default to 0 if statusPajak not recognized
  const brackets = TER_TABLES[category]
  for (const b of brackets) {
    if (brutoSebulan <= b.max) return b.rate
  }
  return 0.34 // fallback max rate
}

/** Calculate PPh 21 per month using TER method */
export function hitungPph21(brutoSebulan: number, statusPajak: string): number {
  const rate = getTerRate(statusPajak, brutoSebulan)
  return Math.round(brutoSebulan * rate)
}

/** Calculate BPJS Kesehatan — employee and employer portions */
export function hitungBpjsKesehatan(brutoSebulan: number): { karyawan: number; perusahaan: number } {
  const cap = Math.min(brutoSebulan, BPJS_CAP)
  const karyawan = Math.round(cap * 0.01)  // 1%
  const perusahaan = Math.round(cap * 0.04) // 4%
  return { karyawan, perusahaan }
}

/** Calculate BPJS Ketenagakerjaan */
export function hitungBpjsTK(brutoSebulan: number): {
  jhtKaryawan: number; jhtPerusahaan: number
  jpKaryawan: number; jpPerusahaan: number
  jkk: number; jkm: number
} {
  const cap = Math.min(brutoSebulan, BPJS_CAP)
  const capJp = Math.min(brutoSebulan, JP_CAP)
  const jhtKaryawan = Math.round(cap * 0.02)   // 2%
  const jhtPerusahaan = Math.round(cap * 0.037) // 3.7%
  const jpKaryawan = Math.round(capJp * 0.01)  // 1% (JP cap lebih rendah)
  const jpPerusahaan = Math.round(capJp * 0.02) // 2% (JP cap lebih rendah)
  const jkk = Math.round(cap * 0.0024)          // 0.24% (lowest risk)
  const jkm = Math.round(cap * 0.003)           // 0.3%
  return { jhtKaryawan, jhtPerusahaan, jpKaryawan, jpPerusahaan, jkk, jkm }
}

/** Calculate THR: 1 month salary proportionally for < 12 months */
export function hitungThr(gajiPokok: number, tanggalMasuk: string, tanggalReferensi?: string): number {
  const ref = tanggalReferensi ? new Date(tanggalReferensi) : new Date()
  const masuk = new Date(tanggalMasuk)
  const masaBulan = (ref.getFullYear() - masuk.getFullYear()) * 12 + (ref.getMonth() - masuk.getMonth())
  if (masaBulan >= 12) return gajiPokok
  if (masaBulan <= 0) return 0
  return Math.round((masaBulan / 12) * gajiPokok)
}
