-- 0020: BOS (Bantuan Operasional Sekolah) — RKAS & Realisasi

CREATE TYPE status_bos AS ENUM ('aktif', 'selesai');

CREATE TABLE bos_periode (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES unit(id) ON DELETE RESTRICT,
  tahun integer NOT NULL,
  nama text NOT NULL,
  jumlah_dana integer NOT NULL DEFAULT 0,
  rekening_khusus text,
  status status_bos NOT NULL DEFAULT 'aktif',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE bos_rkas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periode_id uuid NOT NULL REFERENCES bos_periode(id) ON DELETE CASCADE,
  kode_rekening text,
  komponen text NOT NULL,
  sub_komponen text,
  anggaran integer NOT NULL DEFAULT 0,
  keterangan text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE bos_realisasi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rkas_id uuid NOT NULL REFERENCES bos_rkas(id) ON DELETE CASCADE,
  tanggal text NOT NULL,
  uraian text NOT NULL,
  jumlah integer NOT NULL,
  bukti text,
  created_at timestamp NOT NULL DEFAULT now()
);
