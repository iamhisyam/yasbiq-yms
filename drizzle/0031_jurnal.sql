-- Double-entry journal for ISAK 35 compliance

CREATE TABLE IF NOT EXISTS jurnal_header (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES unit(id) ON DELETE CASCADE,
  nomor TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  tipe TEXT NOT NULL,
  referensi TEXT,
  keterangan TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jurnal_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurnal_id UUID NOT NULL REFERENCES jurnal_header(id) ON DELETE CASCADE,
  coa_id UUID NOT NULL REFERENCES coa(id) ON DELETE RESTRICT,
  debit INTEGER NOT NULL DEFAULT 0,
  kredit INTEGER NOT NULL DEFAULT 0,
  keterangan TEXT,
  CHECK (debit >= 0 AND kredit >= 0),
  CHECK (debit + kredit > 0)
);

CREATE INDEX IF NOT EXISTS jurnal_detail_jurnal_id_idx ON jurnal_detail(jurnal_id);
CREATE INDEX IF NOT EXISTS jurnal_detail_coa_id_idx ON jurnal_detail(coa_id);
CREATE INDEX IF NOT EXISTS jurnal_header_unit_tgl_idx ON jurnal_header(unit_id, tanggal);
