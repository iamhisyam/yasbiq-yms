-- Remove unit_id from vendor and kas_kategori (global data, accessible by all units)
DROP INDEX IF EXISTS kas_kategori_unit_nama_idx;
ALTER TABLE kas_kategori DROP CONSTRAINT IF EXISTS kas_kategori_unit_id_unit_id_fk;
ALTER TABLE kas_kategori DROP COLUMN IF EXISTS unit_id;
-- Deduplicate categories: keep the first created, delete rest, then add unique
-- Run this before creating the unique index
-- DELETE FROM kas_kategori WHERE id IN (
--   SELECT id FROM (
--     SELECT id, ROW_NUMBER() OVER (PARTITION BY nama ORDER BY created_at) as rn FROM kas_kategori
--   ) t WHERE rn > 1
-- );
CREATE UNIQUE INDEX IF NOT EXISTS kas_kategori_nama_idx ON kas_kategori(nama);
ALTER TABLE vendor DROP CONSTRAINT IF EXISTS vendor_unit_id_unit_id_fk;
ALTER TABLE vendor DROP COLUMN IF EXISTS unit_id;
