-- Migration 2: Schema fixes (FK createdBy, unique constraints, typo fix, enums)

-- Clean up empty string values before enum conversion
UPDATE pegawai SET jenis_kelamin = NULL WHERE jenis_kelamin = '';

-- Rename column (typo fix)
ALTER TABLE yayasan RENAME COLUMN sekertaris TO sekretaris;

-- Add FK constraints on createdBy columns
ALTER TABLE pembayaran ADD CONSTRAINT pembayaran_created_by_user_id_fk
  FOREIGN KEY (created_by) REFERENCES "user"(id) ON DELETE SET NULL;
ALTER TABLE kas_transaksi ADD CONSTRAINT kas_transaksi_created_by_user_id_fk
  FOREIGN KEY (created_by) REFERENCES "user"(id) ON DELETE SET NULL;
ALTER TABLE anggaran ADD CONSTRAINT anggaran_created_by_user_id_fk
  FOREIGN KEY (created_by) REFERENCES "user"(id) ON DELETE SET NULL;
ALTER TABLE jurnal_header ADD CONSTRAINT jurnal_header_created_by_user_id_fk
  FOREIGN KEY (created_by) REFERENCES "user"(id) ON DELETE SET NULL;

-- Add unique constraints
ALTER TABLE siswa ADD CONSTRAINT siswa_nis_unit_idx UNIQUE (unit_id, nis);
ALTER TABLE pegawai_mapel ADD CONSTRAINT pegawai_mapel_pegawai_mapel_idx UNIQUE (pegawai_id, mata_pelajaran_id);
ALTER TABLE tagihan_siswa ADD CONSTRAINT tagihan_siswa_tagihan_siswa_idx UNIQUE (tagihan_id, siswa_id);
ALTER TABLE spp_setting ADD CONSTRAINT spp_setting_unit_tingkat_ta_idx UNIQUE (unit_id, tingkat_id, tahun_ajaran_id);
ALTER TABLE siswa_beasiswa ADD CONSTRAINT siswa_beasiswa_siswa_bea_ta_idx UNIQUE (siswa_id, beasiswa_id, tahun_ajaran);
ALTER TABLE bos_periode ADD CONSTRAINT bos_periode_unit_tahun_idx UNIQUE (unit_id, tahun);
ALTER TABLE tingkat ADD CONSTRAINT tingkat_unit_nama_idx UNIQUE (unit_id, nama);
ALTER TABLE mata_pelajaran ADD CONSTRAINT mata_pelajaran_unit_kode_idx UNIQUE (unit_id, kode);

-- Add notNull on wali.is_primary
ALTER TABLE wali ALTER COLUMN is_primary SET NOT NULL;

-- Create jenis_kelamin enum and convert column
CREATE TYPE "public"."jenis_kelamin" AS ENUM('L', 'P');
ALTER TABLE pegawai ALTER COLUMN jenis_kelamin TYPE "public"."jenis_kelamin" USING jenis_kelamin::text::"public"."jenis_kelamin";
