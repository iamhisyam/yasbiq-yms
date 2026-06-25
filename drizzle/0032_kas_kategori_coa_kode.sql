-- Add coa_kode to kas_kategori for COA mapping per category
ALTER TABLE kas_kategori ADD COLUMN IF NOT EXISTS coa_kode TEXT;
