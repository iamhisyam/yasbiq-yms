-- 0019: Dana (Funds) — Donasi, Investasi, Endowment

CREATE TYPE tipe_dana AS ENUM ('donor', 'investor', 'endowment', 'internal');
CREATE TYPE jenis_ikat AS ENUM ('tidak_terikat', 'terikat_temporer', 'terikat_permanen');
CREATE TYPE status_dana AS ENUM ('aktif', 'selesai', 'dibatalkan');

CREATE TABLE dana (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES unit(id) ON DELETE RESTRICT,
  kode text,
  nama text NOT NULL,
  tipe tipe_dana NOT NULL DEFAULT 'donor',
  sumber text,
  npwp text,
  jenis_ikat jenis_ikat NOT NULL DEFAULT 'tidak_terikat',
  tujuan text,
  target_nominal integer NOT NULL DEFAULT 0,
  realisasi integer NOT NULL DEFAULT 0,
  tanggal_mulai text,
  tanggal_selesai text,
  status status_dana NOT NULL DEFAULT 'aktif',
  keterangan text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
