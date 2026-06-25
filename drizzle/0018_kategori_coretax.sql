-- 0017: Add kode_coretax to kas_kategori

ALTER TABLE kas_kategori ADD COLUMN IF NOT EXISTS kode_coretax text;
