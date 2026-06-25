-- 0015: Tingkat master table + FK in kelas and spp_setting

BEGIN;

-- ─── 1. Create tingkat table ────────────────────────────────────────────────

CREATE TABLE tingkat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES unit(id) ON DELETE CASCADE,
  nama text NOT NULL,
  kode text,
  urutan integer NOT NULL DEFAULT 0,
  keterangan text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- ─── 2. Backfill existing tingkat values ────────────────────────────────────

INSERT INTO tingkat (id, unit_id, nama, urutan)
SELECT gen_random_uuid(), k.unit_id, k.tingkat, row_number() OVER (ORDER BY k.tingkat)
FROM (SELECT DISTINCT unit_id, tingkat FROM kelas WHERE tingkat IS NOT NULL AND tingkat != '') k;

INSERT INTO tingkat (id, unit_id, nama, urutan)
SELECT gen_random_uuid(), s.unit_id, s.tingkat, (SELECT COALESCE(MAX(urutan), 0) + 1 FROM tingkat)
FROM (SELECT DISTINCT unit_id, tingkat FROM spp_setting WHERE tingkat NOT IN (SELECT nama FROM tingkat WHERE unit_id = spp_setting.unit_id)) s;

-- ─── 3. Add tingkat_id column to kelas ──────────────────────────────────────

ALTER TABLE kelas ADD COLUMN tingkat_id uuid REFERENCES tingkat(id) ON DELETE SET NULL;

UPDATE kelas SET tingkat_id = t.id
FROM tingkat t
WHERE t.nama = kelas.tingkat AND t.unit_id = kelas.unit_id;

-- ─── 4. Drop old kelas.tingkat ──────────────────────────────────────────────

ALTER TABLE kelas DROP COLUMN tingkat;

-- ─── 5. Add tingkat_id column to spp_setting ────────────────────────────────

ALTER TABLE spp_setting ADD COLUMN tingkat_id uuid;

UPDATE spp_setting SET tingkat_id = t.id
FROM tingkat t
WHERE t.nama = spp_setting.tingkat AND t.unit_id = spp_setting.unit_id;

ALTER TABLE spp_setting ALTER COLUMN tingkat_id SET NOT NULL;
ALTER TABLE spp_setting ADD CONSTRAINT spp_setting_tingkat_id_fkey FOREIGN KEY (tingkat_id) REFERENCES tingkat(id) ON DELETE RESTRICT;
ALTER TABLE spp_setting DROP COLUMN tingkat;

COMMIT;
