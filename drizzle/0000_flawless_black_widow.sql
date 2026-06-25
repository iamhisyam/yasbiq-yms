CREATE TYPE "public"."jenjang" AS ENUM('TK', 'SD', 'SMP', 'SMA', 'SMK', 'Lainnya');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'admin_yayasan', 'operator');--> statement-breakpoint
CREATE TYPE "public"."hubungan_wali" AS ENUM('ayah', 'ibu', 'wali', 'kakek', 'nenek', 'lainnya');--> statement-breakpoint
CREATE TYPE "public"."status_siswa" AS ENUM('aktif', 'nonaktif', 'lulus', 'pindah', 'dikeluarkan');--> statement-breakpoint
CREATE TYPE "public"."metode_pembayaran" AS ENUM('tunai', 'transfer', 'qris', 'lainnya');--> statement-breakpoint
CREATE TYPE "public"."status_tagihan" AS ENUM('belum_bayar', 'cicil', 'lunas', 'dibebaskan');--> statement-breakpoint
CREATE TYPE "public"."status_anggaran" AS ENUM('draft', 'aktif', 'selesai', 'dibatalkan');--> statement-breakpoint
CREATE TYPE "public"."tipe_transaksi" AS ENUM('pemasukan', 'pengeluaran');--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"is_super_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "unit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"yayasan_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"jenjang" "jenjang" NOT NULL,
	"alamat" text,
	"telepon" text,
	"kepala_unit" text,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_unit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"unit_id" uuid NOT NULL,
	"role" "user_role" DEFAULT 'operator' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yayasan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"alamat" text,
	"logo_url" text,
	"telepon" text,
	"email" text,
	"website" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "siswa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"nis" text NOT NULL,
	"nama" text NOT NULL,
	"kelas" text NOT NULL,
	"jenis_kelamin" text,
	"tanggal_lahir" text,
	"alamat" text,
	"tahun_masuk" integer NOT NULL,
	"tahun_keluar" integer,
	"status" "status_siswa" DEFAULT 'aktif' NOT NULL,
	"foto" text,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wali" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siswa_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"hubungan" "hubungan_wali" DEFAULT 'ayah' NOT NULL,
	"telepon" text,
	"email" text,
	"pekerjaan" text,
	"alamat" text,
	"is_primary" text DEFAULT 'false',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spp_pembayaran" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tagihan_id" uuid NOT NULL,
	"jumlah_bayar" integer NOT NULL,
	"tanggal_bayar" text NOT NULL,
	"metode" "metode_pembayaran" DEFAULT 'tunai' NOT NULL,
	"bukti_url" text,
	"catatan" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spp_setting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"kelas" text NOT NULL,
	"nominal" integer NOT NULL,
	"tahun_ajaran" text NOT NULL,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spp_tagihan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siswa_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"bulan" integer NOT NULL,
	"tahun" integer NOT NULL,
	"nominal" integer NOT NULL,
	"sudah_dibayar" integer DEFAULT 0 NOT NULL,
	"status" "status_tagihan" DEFAULT 'belum_bayar' NOT NULL,
	"due_date" text,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anggaran" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"total" integer NOT NULL,
	"terpakai" integer DEFAULT 0 NOT NULL,
	"periode" text NOT NULL,
	"tipe" "tipe_transaksi" DEFAULT 'pengeluaran' NOT NULL,
	"status" "status_anggaran" DEFAULT 'draft' NOT NULL,
	"keterangan" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kas_kategori" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid,
	"nama" text NOT NULL,
	"tipe" "tipe_transaksi" NOT NULL,
	"warna" text DEFAULT '#6366f1',
	"ikon" text,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kas_transaksi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"kategori_id" uuid,
	"tipe" "tipe_transaksi" NOT NULL,
	"jumlah" integer NOT NULL,
	"keterangan" text NOT NULL,
	"tanggal" text NOT NULL,
	"referensi" text,
	"bukti_url" text,
	"anggaran_id" uuid,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "unit" ADD CONSTRAINT "unit_yayasan_id_yayasan_id_fk" FOREIGN KEY ("yayasan_id") REFERENCES "public"."yayasan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_unit" ADD CONSTRAINT "user_unit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_unit" ADD CONSTRAINT "user_unit_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siswa" ADD CONSTRAINT "siswa_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wali" ADD CONSTRAINT "wali_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spp_pembayaran" ADD CONSTRAINT "spp_pembayaran_tagihan_id_spp_tagihan_id_fk" FOREIGN KEY ("tagihan_id") REFERENCES "public"."spp_tagihan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spp_setting" ADD CONSTRAINT "spp_setting_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spp_tagihan" ADD CONSTRAINT "spp_tagihan_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spp_tagihan" ADD CONSTRAINT "spp_tagihan_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anggaran" ADD CONSTRAINT "anggaran_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kas_kategori" ADD CONSTRAINT "kas_kategori_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kas_transaksi" ADD CONSTRAINT "kas_transaksi_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kas_transaksi" ADD CONSTRAINT "kas_transaksi_kategori_id_kas_kategori_id_fk" FOREIGN KEY ("kategori_id") REFERENCES "public"."kas_kategori"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kas_transaksi" ADD CONSTRAINT "kas_transaksi_anggaran_id_anggaran_id_fk" FOREIGN KEY ("anggaran_id") REFERENCES "public"."anggaran"("id") ON DELETE set null ON UPDATE no action;