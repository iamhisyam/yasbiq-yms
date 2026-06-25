-- Migration 3: Add ref_type/ref_id to kas_transaksi, transaksi_id to jurnal_header

-- 1. Create ref_type enum
DO $$ BEGIN
  CREATE TYPE ref_type AS ENUM ('kas', 'spp', 'gaji', 'penyusutan', 'penyesuaian', 'penutup', 'dana');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add ref_type column to kas_transaksi
ALTER TABLE kas_transaksi ADD COLUMN IF NOT EXISTS ref_type ref_type NOT NULL DEFAULT 'kas';

-- 3. Add ref_id column to kas_transaksi
ALTER TABLE kas_transaksi ADD COLUMN IF NOT EXISTS ref_id text;

-- 4. Add transaksi_id column to jurnal_header
ALTER TABLE jurnal_header ADD COLUMN IF NOT EXISTS transaksi_id uuid;

-- 5. Add FK constraint for transaksi_id -> kas_transaksi.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jurnal_header_transaksi_id_kas_transaksi_id_fk'
  ) THEN
    ALTER TABLE jurnal_header ADD CONSTRAINT jurnal_header_transaksi_id_kas_transaksi_id_fk
      FOREIGN KEY (transaksi_id) REFERENCES kas_transaksi(id) ON DELETE SET NULL;
  END IF;
END $$;
