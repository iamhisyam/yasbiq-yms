-- Add 'biaya' to tipe_komponen enum for THP payroll model
ALTER TYPE tipe_komponen ADD VALUE IF NOT EXISTS 'biaya';

-- Migrate existing BPJS & PPh21 komponen from 'potongan' to 'biaya'
UPDATE penggajian_komponen
SET tipe = 'biaya'
WHERE kode IN ('bpjs_kesehatan', 'bpjs_jht', 'bpjs_jp', 'pph21')
  AND tipe = 'potongan';

-- Migrate existing detail items for BPJS & PPh21 from 'potongan' to 'biaya'
UPDATE penggajian_detail
SET tipe = 'biaya'
WHERE kode IN ('bpjs_kesehatan', 'bpjs_jht', 'bpjs_jp', 'pph21')
  AND tipe = 'potongan';
