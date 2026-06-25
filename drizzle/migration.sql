-- Migration: Schema improvements (enums, FKs, removed redundant kelas)
-- Applied via psql directly to avoid drizzle-kit TTY prompt

-- Clean up data that doesn't match new enum values before altering types
UPDATE bank_account SET jenis = 'kas' WHERE jenis = 'cash';
UPDATE pegawai SET status_pegawai = 'tetap' WHERE status_pegawai = 'tetap_yayasan';
UPDATE pegawai SET jabatan = 'staff' WHERE jabatan IN ('penjaga_sekolah', 'guru_pendamping');

-- Create new enum types
CREATE TYPE "public"."jenis_bank" AS ENUM('bank', 'kas', 'ems');
CREATE TYPE "public"."saldo_normal" AS ENUM('debit', 'kredit');
CREATE TYPE "public"."tipe_coa" AS ENUM('aset_lancar', 'aset_tetap', 'liabilitas', 'aset_neto', 'pendapatan', 'beban');
CREATE TYPE "public"."tipe_jurnal" AS ENUM('umum', 'spp', 'gaji', 'penyusutan', 'penyesuaian', 'penutup');
CREATE TYPE "public"."status_riwayat" AS ENUM('aktif', 'nonaktif', 'lulus', 'pindah', 'dikeluarkan');
CREATE TYPE "public"."jabatan" AS ENUM('guru_mapel', 'guru_kelas', 'kepala_sekolah', 'tata_usaha', 'bendahara', 'staff');
CREATE TYPE "public"."status_pegawai" AS ENUM('honorer', 'tetap', 'kontrak', 'pns');
CREATE TYPE "public"."status_penggajian" AS ENUM('draft', 'disetujui', 'dibayar', 'dibatalkan');
CREATE TYPE "public"."tipe_komponen" AS ENUM('penerimaan', 'potongan');
CREATE TYPE "public"."jenis_tagihan" AS ENUM('spp', 'bangunan', 'daftar_ulang', 'kegiatan', 'lainnya');

-- Extend existing enum
ALTER TYPE "public"."metode_pembayaran" ADD VALUE IF NOT EXISTS 'va';
ALTER TYPE "public"."metode_pembayaran" ADD VALUE IF NOT EXISTS 'debit';
ALTER TYPE "public"."metode_pembayaran" ADD VALUE IF NOT EXISTS 'kartu_kredit';
ALTER TYPE "public"."metode_pembayaran" ADD VALUE IF NOT EXISTS 'gerai';

-- Alter columns to use new enum types
-- For each: drop existing default, alter type, set new default
ALTER TABLE "bank_account" ALTER COLUMN "jenis" DROP DEFAULT;
ALTER TABLE "bank_account" ALTER COLUMN "jenis" SET DATA TYPE "public"."jenis_bank" USING "jenis"::"public"."jenis_bank";
ALTER TABLE "bank_account" ALTER COLUMN "jenis" SET DEFAULT 'bank'::"public"."jenis_bank";

ALTER TABLE "coa" ALTER COLUMN "saldo_normal" DROP DEFAULT;
ALTER TABLE "coa" ALTER COLUMN "saldo_normal" SET DATA TYPE "public"."saldo_normal" USING "saldo_normal"::"public"."saldo_normal";
ALTER TABLE "coa" ALTER COLUMN "saldo_normal" SET DEFAULT 'debit'::"public"."saldo_normal";

ALTER TABLE "coa" ALTER COLUMN "tipe" SET DATA TYPE "public"."tipe_coa" USING "tipe"::"public"."tipe_coa";

ALTER TABLE "siswa_riwayat" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "siswa_riwayat" ALTER COLUMN "status" SET DATA TYPE "public"."status_riwayat" USING "status"::"public"."status_riwayat";
ALTER TABLE "siswa_riwayat" ALTER COLUMN "status" SET DEFAULT 'aktif'::"public"."status_riwayat";

ALTER TABLE "jurnal_header" ALTER COLUMN "tipe" SET DATA TYPE "public"."tipe_jurnal" USING "tipe"::"public"."tipe_jurnal";

ALTER TABLE "penggajian_detail" ALTER COLUMN "tipe" SET DATA TYPE "public"."tipe_komponen" USING "tipe"::"public"."tipe_komponen";
ALTER TABLE "penggajian_komponen" ALTER COLUMN "tipe" SET DATA TYPE "public"."tipe_komponen" USING "tipe"::"public"."tipe_komponen";

ALTER TABLE "pegawai" ALTER COLUMN "status_pegawai" DROP DEFAULT;
ALTER TABLE "pegawai" ALTER COLUMN "status_pegawai" SET DATA TYPE "public"."status_pegawai" USING "status_pegawai"::"public"."status_pegawai";
ALTER TABLE "pegawai" ALTER COLUMN "status_pegawai" SET DEFAULT 'honorer'::"public"."status_pegawai";

ALTER TABLE "pegawai" ALTER COLUMN "jabatan" DROP DEFAULT;
ALTER TABLE "pegawai" ALTER COLUMN "jabatan" SET DATA TYPE "public"."jabatan" USING "jabatan"::"public"."jabatan";
ALTER TABLE "pegawai" ALTER COLUMN "jabatan" SET DEFAULT 'guru_mapel'::"public"."jabatan";

ALTER TABLE "penggajian" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "penggajian" ALTER COLUMN "status" SET DATA TYPE "public"."status_penggajian" USING "status"::"public"."status_penggajian";
ALTER TABLE "penggajian" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."status_penggajian";

ALTER TABLE "penggajian" ALTER COLUMN "approved_by" SET DATA TYPE text;

ALTER TABLE "tagihan" ALTER COLUMN "jenis" DROP DEFAULT;
ALTER TABLE "tagihan" ALTER COLUMN "jenis" SET DATA TYPE "public"."jenis_tagihan" USING "jenis"::"public"."jenis_tagihan";
ALTER TABLE "tagihan" ALTER COLUMN "jenis" SET DEFAULT 'lainnya'::"public"."jenis_tagihan";

-- Add FK constraints
ALTER TABLE "penggajian" ADD CONSTRAINT "penggajian_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE SET NULL;
ALTER TABLE "spp_setting" ADD COLUMN "tahun_ajaran_id" uuid REFERENCES "public"."tahun_ajaran"("id") ON DELETE RESTRICT;

-- Remove redundant column (data loss)
ALTER TABLE "siswa" DROP COLUMN IF EXISTS "kelas";
