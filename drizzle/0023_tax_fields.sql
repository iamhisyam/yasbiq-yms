-- 0022: Add NPWP & tax compliance fields

-- vendor: add npwp
ALTER TABLE vendor ADD COLUMN IF NOT EXISTS npwp text;

-- pegawai: add npwp, status_pajak
ALTER TABLE pegawai ADD COLUMN IF NOT EXISTS npwp text;
ALTER TABLE pegawai ADD COLUMN IF NOT EXISTS status_pajak text;

-- penggajian: add pph21_dipotong
ALTER TABLE penggajian ADD COLUMN IF NOT EXISTS pph21_dipotong integer DEFAULT 0;
