-- Penggajian enhancement: detail line items, komponen template, approval flow, BPJS, isBendahara

-- Add new columns to penggajian (summary)
ALTER TABLE penggajian ADD COLUMN IF NOT EXISTS total_penerimaan INTEGER NOT NULL DEFAULT 0;
ALTER TABLE penggajian ADD COLUMN IF NOT EXISTS total_potongan INTEGER NOT NULL DEFAULT 0;
ALTER TABLE penggajian ADD COLUMN IF NOT EXISTS bpjs_karyawan INTEGER NOT NULL DEFAULT 0;
ALTER TABLE penggajian ADD COLUMN IF NOT EXISTS bpjs_perusahaan INTEGER NOT NULL DEFAULT 0;
ALTER TABLE penggajian ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE penggajian ADD COLUMN IF NOT EXISTS approved_at TEXT;
ALTER TABLE penggajian ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Penggajian Komponen (template per unit)
CREATE TABLE IF NOT EXISTS penggajian_komponen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES unit(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  tipe TEXT NOT NULL,
  kode TEXT NOT NULL,
  default_jumlah INTEGER NOT NULL DEFAULT 0,
  objek_pajak BOOLEAN NOT NULL DEFAULT TRUE,
  hitung_otomatis BOOLEAN NOT NULL DEFAULT FALSE,
  aktif BOOLEAN NOT NULL DEFAULT TRUE,
  urutan INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Penggajian Detail (line items per payslip)
CREATE TABLE IF NOT EXISTS penggajian_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  penggajian_id UUID NOT NULL REFERENCES penggajian(id) ON DELETE CASCADE,
  komponen_id UUID REFERENCES penggajian_komponen(id) ON DELETE SET NULL,
  tipe TEXT NOT NULL,
  kode TEXT NOT NULL,
  nama TEXT NOT NULL,
  jumlah INTEGER NOT NULL DEFAULT 0,
  objek_pajak BOOLEAN NOT NULL DEFAULT TRUE,
  urutan INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- isBendahara flag on user_unit
ALTER TABLE user_unit ADD COLUMN IF NOT EXISTS is_bendahara BOOLEAN NOT NULL DEFAULT FALSE;
