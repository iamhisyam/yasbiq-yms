-- Chart of Accounts (COA) — ISAK 35 compliant structure
CREATE TABLE IF NOT EXISTS coa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES unit(id) ON DELETE CASCADE,
  kode TEXT NOT NULL,
  nama TEXT NOT NULL,
  tipe TEXT NOT NULL,
  sub_tipe TEXT,
  saldo_normal TEXT NOT NULL DEFAULT 'debit',
  parent_id UUID REFERENCES coa(id) ON DELETE SET NULL,
  level INTEGER NOT NULL DEFAULT 1,
  urutan INTEGER NOT NULL DEFAULT 0,
  aktif BOOLEAN NOT NULL DEFAULT true,
  keterangan TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(unit_id, kode)
);
