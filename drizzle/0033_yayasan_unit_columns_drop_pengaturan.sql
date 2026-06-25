-- Add columns to yayasan for yayasan-level settings
ALTER TABLE yayasan ADD COLUMN IF NOT EXISTS npwp TEXT;
ALTER TABLE yayasan ADD COLUMN IF NOT EXISTS status_pkp TEXT;
ALTER TABLE yayasan ADD COLUMN IF NOT EXISTS ketua TEXT;
ALTER TABLE yayasan ADD COLUMN IF NOT EXISTS bendahara TEXT;
ALTER TABLE yayasan ADD COLUMN IF NOT EXISTS sekertaris TEXT;
ALTER TABLE yayasan ADD COLUMN IF NOT EXISTS header_dokumen TEXT;
ALTER TABLE yayasan ADD COLUMN IF NOT EXISTS footer_dokumen TEXT;
ALTER TABLE yayasan ADD COLUMN IF NOT EXISTS logo_dokumen TEXT;

-- Add columns to unit for unit-level settings
ALTER TABLE unit ADD COLUMN IF NOT EXISTS nomor_unit TEXT;
ALTER TABLE unit ADD COLUMN IF NOT EXISTS email TEXT;

-- Migrate data from pengaturan to yayasan (take first non-empty value from any unit)
UPDATE yayasan SET
  npwp = (SELECT value FROM pengaturan WHERE key = 'npwpYayasan' AND value IS NOT NULL AND value != '' ORDER BY unit_id LIMIT 1),
  status_pkp = (SELECT value FROM pengaturan WHERE key = 'statusPKP' AND value IS NOT NULL AND value != '' ORDER BY unit_id LIMIT 1),
  ketua = (SELECT value FROM pengaturan WHERE key = 'namaKetuaYayasan' AND value IS NOT NULL AND value != '' ORDER BY unit_id LIMIT 1),
  header_dokumen = (SELECT value FROM pengaturan WHERE key = 'headerDokumen' AND value IS NOT NULL AND value != '' ORDER BY unit_id LIMIT 1),
  footer_dokumen = (SELECT value FROM pengaturan WHERE key = 'footerDokumen' AND value IS NOT NULL AND value != '' ORDER BY unit_id LIMIT 1),
  logo_dokumen = (SELECT value FROM pengaturan WHERE key = 'logoDokumen' AND value IS NOT NULL AND value != '' ORDER BY unit_id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM pengaturan LIMIT 1);

-- Migrate data from pengaturan to unit
UPDATE unit SET
  email = (SELECT value FROM pengaturan WHERE pengaturan.unit_id = unit.id AND key = 'email' AND value IS NOT NULL AND value != '' LIMIT 1);

-- Drop pengaturan table and its index
DROP INDEX IF EXISTS pengaturan_unit_key_idx;
DROP TABLE IF EXISTS pengaturan;
