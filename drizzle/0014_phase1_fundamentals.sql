-- Phase 1: Schema fundamentals fix
-- 1. Add tingkat column to kelas
ALTER TABLE kelas ADD COLUMN IF NOT EXISTS tingkat text;

-- 2. Replace waliKelas text with waliKelasId FK to pegawai
ALTER TABLE kelas ADD COLUMN IF NOT EXISTS wali_kelas_id uuid REFERENCES pegawai(id) ON DELETE SET NULL;
-- Migrate existing text data: try to match wali_kelas text to pegawai nama (best effort)
UPDATE kelas k SET wali_kelas_id = p.id FROM pegawai p WHERE k.wali_kelas = p.nama AND k.wali_kelas IS NOT NULL AND k.unit_id = p.unit_id;
ALTER TABLE kelas DROP COLUMN IF EXISTS wali_kelas;

-- 3. Add tahunAjaranId FK to spp_tagihan
ALTER TABLE spp_tagihan ADD COLUMN IF NOT EXISTS tahun_ajaran_id uuid REFERENCES tahun_ajaran(id) ON DELETE SET NULL;
-- Backfill: try to match existing tagihan to active tahun ajaran
UPDATE spp_tagihan st SET tahun_ajaran_id = ta.id FROM tahun_ajaran ta WHERE ta.unit_id = st.unit_id AND ta.aktif = true AND st.tahun_ajaran_id IS NULL;

-- 4. Rename spp_setting.kelas to spp_setting.tingkat
ALTER TABLE spp_setting RENAME COLUMN kelas TO tingkat;
