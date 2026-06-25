CREATE TYPE "public"."jenis_bank" AS ENUM('bank', 'kas', 'ems');--> statement-breakpoint
CREATE TYPE "public"."ref_type" AS ENUM('kas', 'spp', 'gaji', 'penyusutan', 'penyesuaian', 'penutup', 'dana');--> statement-breakpoint
CREATE TYPE "public"."saldo_normal" AS ENUM('debit', 'kredit');--> statement-breakpoint
CREATE TYPE "public"."tipe_coa" AS ENUM('aset_lancar', 'aset_tetap', 'liabilitas', 'aset_neto', 'pendapatan', 'beban');--> statement-breakpoint
CREATE TYPE "public"."tipe_jurnal" AS ENUM('kas', 'spp', 'gaji', 'penyusutan', 'penyesuaian', 'penutup');--> statement-breakpoint
CREATE TYPE "public"."status_riwayat" AS ENUM('aktif', 'nonaktif', 'lulus', 'pindah', 'dikeluarkan');--> statement-breakpoint
CREATE TYPE "public"."jabatan" AS ENUM('guru_mapel', 'guru_kelas', 'kepala_sekolah', 'tata_usaha', 'bendahara', 'staff');--> statement-breakpoint
CREATE TYPE "public"."jenis_kelamin" AS ENUM('L', 'P');--> statement-breakpoint
CREATE TYPE "public"."status_pegawai" AS ENUM('honorer', 'tetap', 'kontrak', 'pns');--> statement-breakpoint
CREATE TYPE "public"."status_penggajian" AS ENUM('draft', 'disetujui', 'dibayar', 'dibatalkan');--> statement-breakpoint
CREATE TYPE "public"."tipe_komponen" AS ENUM('penerimaan', 'potongan');--> statement-breakpoint
CREATE TYPE "public"."kategori_aset" AS ENUM('tanah', 'gedung', 'kendaraan', 'peralatan', 'inventaris', 'lainnya');--> statement-breakpoint
CREATE TYPE "public"."metode_penyusutan" AS ENUM('garis_lurus', 'saldo_menurun');--> statement-breakpoint
CREATE TYPE "public"."status_aset" AS ENUM('aktif', 'dijual', 'dihapuskan');--> statement-breakpoint
CREATE TYPE "public"."jenis_ikat" AS ENUM('tidak_terikat', 'terikat_temporer', 'terikat_permanen');--> statement-breakpoint
CREATE TYPE "public"."status_dana" AS ENUM('aktif', 'selesai', 'dibatalkan');--> statement-breakpoint
CREATE TYPE "public"."tipe_dana" AS ENUM('donor', 'investor', 'endowment', 'internal');--> statement-breakpoint
CREATE TYPE "public"."status_bos" AS ENUM('aktif', 'selesai');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'guru';--> statement-breakpoint
ALTER TYPE "public"."metode_pembayaran" ADD VALUE 'va' BEFORE 'lainnya';--> statement-breakpoint
ALTER TYPE "public"."metode_pembayaran" ADD VALUE 'debit' BEFORE 'lainnya';--> statement-breakpoint
ALTER TYPE "public"."metode_pembayaran" ADD VALUE 'kartu_kredit' BEFORE 'lainnya';--> statement-breakpoint
ALTER TYPE "public"."metode_pembayaran" ADD VALUE 'gerai' BEFORE 'lainnya';--> statement-breakpoint
CREATE TABLE "coa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kode" text NOT NULL,
	"nama" text NOT NULL,
	"tipe" "tipe_coa" NOT NULL,
	"sub_tipe" text,
	"saldo_normal" "saldo_normal" DEFAULT 'debit' NOT NULL,
	"parent_id" uuid,
	"level" integer DEFAULT 1 NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coa_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
CREATE TABLE "jurnal_detail" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jurnal_id" uuid NOT NULL,
	"coa_id" uuid NOT NULL,
	"debit" bigint DEFAULT 0 NOT NULL,
	"kredit" bigint DEFAULT 0 NOT NULL,
	"keterangan" text
);
--> statement-breakpoint
CREATE TABLE "jurnal_header" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"nomor" text NOT NULL,
	"tanggal" text NOT NULL,
	"tipe" "tipe_jurnal" NOT NULL,
	"referensi" text,
	"transaksi_id" uuid,
	"keterangan" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "jurnal_header_unit_nomor_idx" UNIQUE("unit_id","nomor")
);
--> statement-breakpoint
CREATE TABLE "penggajian_detail" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"penggajian_id" uuid NOT NULL,
	"komponen_id" uuid,
	"tipe" "tipe_komponen" NOT NULL,
	"kode" text NOT NULL,
	"nama" text NOT NULL,
	"jumlah" bigint DEFAULT 0 NOT NULL,
	"objek_pajak" boolean DEFAULT true NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "penggajian_komponen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"tipe" "tipe_komponen" NOT NULL,
	"kode" text NOT NULL,
	"default_jumlah" bigint DEFAULT 0 NOT NULL,
	"objek_pajak" boolean DEFAULT true NOT NULL,
	"hitung_otomatis" boolean DEFAULT false NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "penggajian_komponen_unit_id_kode_unique" UNIQUE("unit_id","kode")
);
--> statement-breakpoint
CREATE TABLE "pembayaran" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tagihan_siswa_id" uuid NOT NULL,
	"jumlah_bayar" bigint NOT NULL,
	"tanggal_bayar" text NOT NULL,
	"metode" "metode_pembayaran" DEFAULT 'tunai' NOT NULL,
	"bukti_url" text,
	"catatan" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tagihan_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tagihan_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"harga_satuan" bigint NOT NULL,
	"diskon" bigint DEFAULT 0 NOT NULL,
	"subtotal" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tagihan_siswa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tagihan_id" uuid NOT NULL,
	"siswa_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"nominal" bigint DEFAULT 0 NOT NULL,
	"sudah_dibayar" bigint DEFAULT 0 NOT NULL,
	"status" "status_tagihan" DEFAULT 'terbit' NOT NULL,
	"beasiswa_id" uuid,
	"diskon" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tagihan_siswa_tagihan_siswa_idx" UNIQUE("tagihan_id","siswa_id")
);
--> statement-breakpoint
CREATE TABLE "tingkat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"kode" text,
	"urutan" integer DEFAULT 0 NOT NULL,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tingkat_unit_nama_idx" UNIQUE("unit_id","nama")
);
--> statement-breakpoint
CREATE TABLE "aset_tetap" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"kode_aset" text,
	"nama" text NOT NULL,
	"kategori" "kategori_aset" DEFAULT 'lainnya' NOT NULL,
	"tanggal_perolehan" text NOT NULL,
	"harga_perolehan" bigint NOT NULL,
	"masa_manfaat" integer,
	"metode_penyusutan" "metode_penyusutan" DEFAULT 'garis_lurus',
	"nilai_residu" bigint DEFAULT 0 NOT NULL,
	"akumulasi_penyusutan" bigint DEFAULT 0 NOT NULL,
	"lokasi" text,
	"keterangan" text,
	"status" "status_aset" DEFAULT 'aktif' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dana" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"kode" text,
	"nama" text NOT NULL,
	"tipe" "tipe_dana" DEFAULT 'donor' NOT NULL,
	"sumber" text,
	"npwp" text,
	"jenis_ikat" "jenis_ikat" DEFAULT 'tidak_terikat' NOT NULL,
	"tujuan" text,
	"target_nominal" bigint DEFAULT 0 NOT NULL,
	"realisasi" bigint DEFAULT 0 NOT NULL,
	"tanggal_mulai" text,
	"tanggal_selesai" text,
	"status" "status_dana" DEFAULT 'aktif' NOT NULL,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bos_periode" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"tahun" integer NOT NULL,
	"nama" text NOT NULL,
	"jumlah_dana" bigint DEFAULT 0 NOT NULL,
	"rekening_khusus" text,
	"status" "status_bos" DEFAULT 'aktif' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bos_periode_unit_tahun_idx" UNIQUE("unit_id","tahun")
);
--> statement-breakpoint
CREATE TABLE "bos_realisasi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rkas_id" uuid NOT NULL,
	"tanggal" text NOT NULL,
	"uraian" text NOT NULL,
	"jumlah" bigint NOT NULL,
	"bukti" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bos_rkas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"periode_id" uuid NOT NULL,
	"kode_rekening" text,
	"komponen" text NOT NULL,
	"sub_komponen" text,
	"anggaran" bigint DEFAULT 0 NOT NULL,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pengaturan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "spp_pembayaran" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "spp_tagihan" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tagihan_pembayaran" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "spp_pembayaran" CASCADE;--> statement-breakpoint
DROP TABLE "spp_tagihan" CASCADE;--> statement-breakpoint
DROP TABLE "tagihan_pembayaran" CASCADE;--> statement-breakpoint
ALTER TABLE "kas_kategori" DROP CONSTRAINT "kas_kategori_unit_id_unit_id_fk";
--> statement-breakpoint
ALTER TABLE "vendor" DROP CONSTRAINT "vendor_unit_id_unit_id_fk";
--> statement-breakpoint
ALTER TABLE "tagihan" DROP CONSTRAINT "tagihan_siswa_id_siswa_id_fk";
--> statement-breakpoint
ALTER TABLE "tagihan" DROP CONSTRAINT "tagihan_beasiswa_id_beasiswa_id_fk";
--> statement-breakpoint
ALTER TABLE "tagihan" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tagihan" ALTER COLUMN "status" SET DEFAULT 'draft'::text;--> statement-breakpoint
ALTER TABLE "tagihan_siswa" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tagihan_siswa" ALTER COLUMN "status" SET DEFAULT 'terbit'::text;--> statement-breakpoint
DROP TYPE "public"."status_tagihan";--> statement-breakpoint
CREATE TYPE "public"."status_tagihan" AS ENUM('draft', 'terbit', 'cicil', 'lunas', 'dibebaskan');--> statement-breakpoint
ALTER TABLE "tagihan" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."status_tagihan";--> statement-breakpoint
ALTER TABLE "tagihan" ALTER COLUMN "status" SET DATA TYPE "public"."status_tagihan" USING "status"::"public"."status_tagihan";--> statement-breakpoint
ALTER TABLE "tagihan_siswa" ALTER COLUMN "status" SET DEFAULT 'terbit'::"public"."status_tagihan";--> statement-breakpoint
ALTER TABLE "tagihan_siswa" ALTER COLUMN "status" SET DATA TYPE "public"."status_tagihan" USING "status"::"public"."status_tagihan";--> statement-breakpoint
ALTER TABLE "tagihan" ALTER COLUMN "jenis" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tagihan" ALTER COLUMN "jenis" SET DEFAULT 'lainnya'::text;--> statement-breakpoint
DROP TYPE "public"."jenis_tagihan";--> statement-breakpoint
CREATE TYPE "public"."jenis_tagihan" AS ENUM('spp', 'bangunan', 'daftar_ulang', 'kegiatan', 'lainnya');--> statement-breakpoint
ALTER TABLE "tagihan" ALTER COLUMN "jenis" SET DEFAULT 'lainnya'::"public"."jenis_tagihan";--> statement-breakpoint
ALTER TABLE "tagihan" ALTER COLUMN "jenis" SET DATA TYPE "public"."jenis_tagihan" USING "jenis"::"public"."jenis_tagihan";--> statement-breakpoint
ALTER TABLE "wali" ALTER COLUMN "is_primary" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "wali" ALTER COLUMN "is_primary" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "spp_setting" ALTER COLUMN "nominal" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "anggaran" ALTER COLUMN "total" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "anggaran" ALTER COLUMN "terpakai" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "bank_account" ALTER COLUMN "saldo_awal" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "bank_account" ALTER COLUMN "saldo" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "hutang_piutang" ALTER COLUMN "jumlah" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "hutang_piutang" ALTER COLUMN "sisa" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "kas_transaksi" ALTER COLUMN "jumlah" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "siswa_riwayat" ALTER COLUMN "status" SET DEFAULT 'aktif'::"public"."status_riwayat";--> statement-breakpoint
ALTER TABLE "siswa_riwayat" ALTER COLUMN "status" SET DATA TYPE "public"."status_riwayat" USING "status"::"public"."status_riwayat";--> statement-breakpoint
ALTER TABLE "pegawai" ALTER COLUMN "jenis_kelamin" SET DATA TYPE "public"."jenis_kelamin" USING "jenis_kelamin"::"public"."jenis_kelamin";--> statement-breakpoint
ALTER TABLE "pegawai" ALTER COLUMN "status_pegawai" SET DEFAULT 'honorer'::"public"."status_pegawai";--> statement-breakpoint
ALTER TABLE "pegawai" ALTER COLUMN "status_pegawai" SET DATA TYPE "public"."status_pegawai" USING "status_pegawai"::"public"."status_pegawai";--> statement-breakpoint
ALTER TABLE "pegawai" ALTER COLUMN "jabatan" SET DEFAULT 'guru_mapel'::"public"."jabatan";--> statement-breakpoint
ALTER TABLE "pegawai" ALTER COLUMN "jabatan" SET DATA TYPE "public"."jabatan" USING "jabatan"::"public"."jabatan";--> statement-breakpoint
ALTER TABLE "pegawai" ALTER COLUMN "gaji_pokok" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "penggajian" ALTER COLUMN "gaji_pokok" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "penggajian" ALTER COLUMN "total_diterima" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "penggajian" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."status_penggajian";--> statement-breakpoint
ALTER TABLE "penggajian" ALTER COLUMN "status" SET DATA TYPE "public"."status_penggajian" USING "status"::"public"."status_penggajian";--> statement-breakpoint
ALTER TABLE "beasiswa" ALTER COLUMN "besaran_potongan" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "beasiswa" ALTER COLUMN "aktif" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "beasiswa" ALTER COLUMN "aktif" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "tagihan" ALTER COLUMN "nominal" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "tagihan" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "tagihan" ALTER COLUMN "status" SET DATA TYPE "public"."status_tagihan" USING "status"::text::"public"."status_tagihan";--> statement-breakpoint
ALTER TABLE "tagihan" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "unit" ADD COLUMN "nomor_unit" text;--> statement-breakpoint
ALTER TABLE "unit" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "user_unit" ADD COLUMN "is_bendahara" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "yayasan" ADD COLUMN "npwp" text;--> statement-breakpoint
ALTER TABLE "yayasan" ADD COLUMN "status_pkp" text;--> statement-breakpoint
ALTER TABLE "yayasan" ADD COLUMN "ketua" text;--> statement-breakpoint
ALTER TABLE "yayasan" ADD COLUMN "bendahara" text;--> statement-breakpoint
ALTER TABLE "yayasan" ADD COLUMN "sekretaris" text;--> statement-breakpoint
ALTER TABLE "yayasan" ADD COLUMN "logo_dokumen" text;--> statement-breakpoint
ALTER TABLE "yayasan" ADD COLUMN "header_dokumen" text;--> statement-breakpoint
ALTER TABLE "yayasan" ADD COLUMN "footer_dokumen" text;--> statement-breakpoint
ALTER TABLE "spp_setting" ADD COLUMN "tingkat_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "spp_setting" ADD COLUMN "tahun_ajaran_id" uuid;--> statement-breakpoint
ALTER TABLE "bank_account" ADD COLUMN "jenis" "jenis_bank" DEFAULT 'bank' NOT NULL;--> statement-breakpoint
ALTER TABLE "kas_kategori" ADD COLUMN "kode_coretax" text;--> statement-breakpoint
ALTER TABLE "kas_kategori" ADD COLUMN "coa_kode" text;--> statement-breakpoint
ALTER TABLE "kas_transaksi" ADD COLUMN "ref_type" "ref_type" DEFAULT 'kas' NOT NULL;--> statement-breakpoint
ALTER TABLE "kas_transaksi" ADD COLUMN "ref_id" text;--> statement-breakpoint
ALTER TABLE "vendor" ADD COLUMN "npwp" text;--> statement-breakpoint
ALTER TABLE "kelas" ADD COLUMN "tingkat_id" uuid;--> statement-breakpoint
ALTER TABLE "kelas" ADD COLUMN "wali_kelas_id" uuid;--> statement-breakpoint
ALTER TABLE "pegawai" ADD COLUMN "npwp" text;--> statement-breakpoint
ALTER TABLE "pegawai" ADD COLUMN "status_pajak" text;--> statement-breakpoint
ALTER TABLE "penggajian" ADD COLUMN "total_penerimaan" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "penggajian" ADD COLUMN "total_potongan" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "penggajian" ADD COLUMN "pph21_dipotong" bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE "penggajian" ADD COLUMN "bpjs_karyawan" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "penggajian" ADD COLUMN "bpjs_perusahaan" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "penggajian" ADD COLUMN "approved_by" text;--> statement-breakpoint
ALTER TABLE "penggajian" ADD COLUMN "approved_at" text;--> statement-breakpoint
ALTER TABLE "penggajian" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tagihan" ADD COLUMN "judul" text;--> statement-breakpoint
ALTER TABLE "tagihan" ADD COLUMN "tahun_ajaran" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tagihan" ADD COLUMN "tahun_ajaran_id" uuid;--> statement-breakpoint
ALTER TABLE "tagihan" ADD COLUMN "bulan" integer;--> statement-breakpoint
ALTER TABLE "tagihan" ADD COLUMN "tahun" integer;--> statement-breakpoint
ALTER TABLE "tagihan" ADD COLUMN "siswa_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "coa" ADD CONSTRAINT "coa_parent_id_coa_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."coa"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_detail" ADD CONSTRAINT "jurnal_detail_jurnal_id_jurnal_header_id_fk" FOREIGN KEY ("jurnal_id") REFERENCES "public"."jurnal_header"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_detail" ADD CONSTRAINT "jurnal_detail_coa_id_coa_id_fk" FOREIGN KEY ("coa_id") REFERENCES "public"."coa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_header" ADD CONSTRAINT "jurnal_header_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_header" ADD CONSTRAINT "jurnal_header_transaksi_id_kas_transaksi_id_fk" FOREIGN KEY ("transaksi_id") REFERENCES "public"."kas_transaksi"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_header" ADD CONSTRAINT "jurnal_header_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penggajian_detail" ADD CONSTRAINT "penggajian_detail_penggajian_id_penggajian_id_fk" FOREIGN KEY ("penggajian_id") REFERENCES "public"."penggajian"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penggajian_detail" ADD CONSTRAINT "penggajian_detail_komponen_id_penggajian_komponen_id_fk" FOREIGN KEY ("komponen_id") REFERENCES "public"."penggajian_komponen"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penggajian_komponen" ADD CONSTRAINT "penggajian_komponen_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembayaran" ADD CONSTRAINT "pembayaran_tagihan_siswa_id_tagihan_siswa_id_fk" FOREIGN KEY ("tagihan_siswa_id") REFERENCES "public"."tagihan_siswa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembayaran" ADD CONSTRAINT "pembayaran_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan_item" ADD CONSTRAINT "tagihan_item_tagihan_id_tagihan_id_fk" FOREIGN KEY ("tagihan_id") REFERENCES "public"."tagihan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan_siswa" ADD CONSTRAINT "tagihan_siswa_tagihan_id_tagihan_id_fk" FOREIGN KEY ("tagihan_id") REFERENCES "public"."tagihan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan_siswa" ADD CONSTRAINT "tagihan_siswa_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan_siswa" ADD CONSTRAINT "tagihan_siswa_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan_siswa" ADD CONSTRAINT "tagihan_siswa_beasiswa_id_beasiswa_id_fk" FOREIGN KEY ("beasiswa_id") REFERENCES "public"."beasiswa"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tingkat" ADD CONSTRAINT "tingkat_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aset_tetap" ADD CONSTRAINT "aset_tetap_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dana" ADD CONSTRAINT "dana_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bos_periode" ADD CONSTRAINT "bos_periode_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bos_realisasi" ADD CONSTRAINT "bos_realisasi_rkas_id_bos_rkas_id_fk" FOREIGN KEY ("rkas_id") REFERENCES "public"."bos_rkas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bos_rkas" ADD CONSTRAINT "bos_rkas_periode_id_bos_periode_id_fk" FOREIGN KEY ("periode_id") REFERENCES "public"."bos_periode"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengaturan" ADD CONSTRAINT "pengaturan_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pengaturan_unit_key_idx" ON "pengaturan" USING btree ("unit_id","key");--> statement-breakpoint
ALTER TABLE "spp_setting" ADD CONSTRAINT "spp_setting_tingkat_id_tingkat_id_fk" FOREIGN KEY ("tingkat_id") REFERENCES "public"."tingkat"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spp_setting" ADD CONSTRAINT "spp_setting_tahun_ajaran_id_tahun_ajaran_id_fk" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "public"."tahun_ajaran"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anggaran" ADD CONSTRAINT "anggaran_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kas_transaksi" ADD CONSTRAINT "kas_transaksi_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_tingkat_id_tingkat_id_fk" FOREIGN KEY ("tingkat_id") REFERENCES "public"."tingkat"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_wali_kelas_id_pegawai_id_fk" FOREIGN KEY ("wali_kelas_id") REFERENCES "public"."pegawai"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penggajian" ADD CONSTRAINT "penggajian_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan" ADD CONSTRAINT "tagihan_tahun_ajaran_id_tahun_ajaran_id_fk" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "public"."tahun_ajaran"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siswa" DROP COLUMN "kelas";--> statement-breakpoint
ALTER TABLE "spp_setting" DROP COLUMN "kelas";--> statement-breakpoint
ALTER TABLE "kas_kategori" DROP COLUMN "unit_id";--> statement-breakpoint
ALTER TABLE "vendor" DROP COLUMN "unit_id";--> statement-breakpoint
ALTER TABLE "kelas" DROP COLUMN "wali_kelas";--> statement-breakpoint
ALTER TABLE "penggajian" DROP COLUMN "tunjangan";--> statement-breakpoint
ALTER TABLE "penggajian" DROP COLUMN "potongan";--> statement-breakpoint
ALTER TABLE "tagihan" DROP COLUMN "siswa_id";--> statement-breakpoint
ALTER TABLE "tagihan" DROP COLUMN "sudah_dibayar";--> statement-breakpoint
ALTER TABLE "tagihan" DROP COLUMN "diskon";--> statement-breakpoint
ALTER TABLE "tagihan" DROP COLUMN "beasiswa_id";--> statement-breakpoint
ALTER TABLE "siswa" ADD CONSTRAINT "siswa_nis_unit_idx" UNIQUE("unit_id","nis");--> statement-breakpoint
ALTER TABLE "spp_setting" ADD CONSTRAINT "spp_setting_unit_tingkat_ta_idx" UNIQUE("unit_id","tingkat_id","tahun_ajaran_id");--> statement-breakpoint
ALTER TABLE "mata_pelajaran" ADD CONSTRAINT "mata_pelajaran_unit_id_kode_unique" UNIQUE("unit_id","kode");--> statement-breakpoint
ALTER TABLE "pegawai_mapel" ADD CONSTRAINT "pegawai_mapel_pegawai_id_mata_pelajaran_id_unique" UNIQUE("pegawai_id","mata_pelajaran_id");--> statement-breakpoint
ALTER TABLE "siswa_beasiswa" ADD CONSTRAINT "siswa_beasiswa_siswa_bea_ta_idx" UNIQUE("siswa_id","beasiswa_id","tahun_ajaran");--> statement-breakpoint
DROP TYPE "public"."status_tagihan2";