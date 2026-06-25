-- 0021: Schema fixes — boolean types, cascade, unique constraint

-- Fix wali.isPrimary: text → boolean
ALTER TABLE wali ALTER COLUMN is_primary DROP DEFAULT;
ALTER TABLE wali ALTER COLUMN is_primary TYPE boolean USING (is_primary = 'true');
ALTER TABLE wali ALTER COLUMN is_primary SET DEFAULT false;

-- Fix beasiswa.aktif: integer → boolean
ALTER TABLE beasiswa ALTER COLUMN aktif DROP DEFAULT;
ALTER TABLE beasiswa ALTER COLUMN aktif TYPE boolean USING (aktif::int = 1);
ALTER TABLE beasiswa ALTER COLUMN aktif SET DEFAULT true;
ALTER TABLE beasiswa ALTER COLUMN aktif SET NOT NULL;

-- Fix pembayaran cascade: restrict → cascade
ALTER TABLE pembayaran DROP CONSTRAINT IF EXISTS pembayaran_tagihan_siswa_id_fkey;
ALTER TABLE pembayaran ADD CONSTRAINT pembayaran_tagihan_siswa_id_fkey
  FOREIGN KEY (tagihan_siswa_id) REFERENCES tagihan_siswa(id) ON DELETE CASCADE;

-- Add unique constraint on pengaturan (unit_id, key)
DROP INDEX IF EXISTS pengaturan_unit_key_idx;
CREATE UNIQUE INDEX pengaturan_unit_key_idx ON pengaturan(unit_id, key);
