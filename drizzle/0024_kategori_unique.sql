-- 0023: Add unique constraint for kategori, fix ensureKategori race

-- Add unique constraint on (unit_id, nama) for kas_kategori
-- This enables ON CONFLICT DO NOTHING in ensureKategori
DELETE FROM kas_kategori WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY unit_id, nama ORDER BY created_at) AS rn
    FROM kas_kategori
  ) t WHERE t.rn > 1
);
CREATE UNIQUE INDEX IF NOT EXISTS kas_kategori_unit_nama_idx ON kas_kategori(unit_id, nama);
