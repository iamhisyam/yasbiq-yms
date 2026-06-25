-- 0018: Aset Tetap (Fixed Assets) + Coretax compliance

CREATE TYPE kategori_aset AS ENUM ('tanah', 'gedung', 'kendaraan', 'peralatan', 'inventaris', 'lainnya');
CREATE TYPE metode_penyusutan AS ENUM ('garis_lurus', 'saldo_menurun');
CREATE TYPE status_aset AS ENUM ('aktif', 'dijual', 'dihapuskan');

CREATE TABLE aset_tetap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES unit(id) ON DELETE RESTRICT,
  kode_aset text,
  nama text NOT NULL,
  kategori kategori_aset NOT NULL DEFAULT 'lainnya',
  tanggal_perolehan text NOT NULL,
  harga_perolehan integer NOT NULL,
  masa_manfaat integer,
  metode_penyusutan metode_penyusutan DEFAULT 'garis_lurus',
  nilai_residu integer NOT NULL DEFAULT 0,
  akumulasi_penyusutan integer NOT NULL DEFAULT 0,
  lokasi text,
  keterangan text,
  status status_aset NOT NULL DEFAULT 'aktif',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
