-- 0014: Unify tagihan system

BEGIN;

-- ─── 1. Drop FK from tagihan_item → jenis_tagihan first ─────────────────────

ALTER TABLE tagihan_item DROP CONSTRAINT tagihan_item_jenis_tagihan_id_jenis_tagihan_id_fk;

-- ─── 2. Drop old tables ──────────────────────────────────────────────────────

DROP TABLE IF EXISTS spp_pembayaran;
DROP TABLE IF EXISTS spp_tagihan;
DROP TABLE IF EXISTS tagihan_pembayaran;
DROP TABLE IF EXISTS jenis_tagihan;

-- ─── 3. Drop old SPP enum ────────────────────────────────────────────────────

DROP TYPE IF EXISTS status_tagihan;

-- ─── 4. Rename status_tagihan2 → status_tagihan ──────────────────────────────

ALTER TYPE status_tagihan2 RENAME TO status_tagihan;

-- ─── 5. Add columns to tagihan table ─────────────────────────────────────────

ALTER TABLE tagihan ADD COLUMN IF NOT EXISTS jenis text NOT NULL DEFAULT 'lainnya';
ALTER TABLE tagihan ADD COLUMN IF NOT EXISTS tahun_ajaran_id uuid;
ALTER TABLE tagihan ADD COLUMN IF NOT EXISTS bulan integer;
ALTER TABLE tagihan ADD COLUMN IF NOT EXISTS tahun integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tagihan_tahun_ajaran_id_fkey'
  ) THEN
    ALTER TABLE tagihan ADD CONSTRAINT tagihan_tahun_ajaran_id_fkey
      FOREIGN KEY (tahun_ajaran_id) REFERENCES tahun_ajaran(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── 6. Rename tagihan.total_nominal → tagihan.nominal ──────────────────────

ALTER TABLE tagihan RENAME COLUMN total_nominal TO nominal;

-- ─── 7. Drop tagihan.total_diskon ────────────────────────────────────────────

ALTER TABLE tagihan DROP COLUMN IF EXISTS total_diskon;

-- ─── 8. Drop tagihan_item.jenis_tagihan_id ───────────────────────────────────

ALTER TABLE tagihan_item DROP COLUMN IF EXISTS jenis_tagihan_id;

-- ─── 9. Rename tagihan_siswa.total_nominal → tagihan_siswa.nominal ───────────

ALTER TABLE tagihan_siswa RENAME COLUMN total_nominal TO nominal;

-- ─── 10. Drop tagihan_siswa.total_diskon ─────────────────────────────────────

ALTER TABLE tagihan_siswa DROP COLUMN IF EXISTS total_diskon;

-- ─── 11. Create unified pembayaran table ─────────────────────────────────────

CREATE TABLE pembayaran (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tagihan_siswa_id uuid NOT NULL REFERENCES tagihan_siswa(id) ON DELETE RESTRICT,
  jumlah_bayar integer NOT NULL,
  tanggal_bayar text NOT NULL,
  metode metode_pembayaran NOT NULL DEFAULT 'tunai',
  bukti_url text,
  catatan text,
  created_by text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

COMMIT;
