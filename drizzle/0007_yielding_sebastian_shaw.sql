CREATE TYPE "public"."kategori_hutang" AS ENUM('pembelian', 'penjualan', 'sewa', 'gaji', 'pinjaman', 'lainnya');--> statement-breakpoint
CREATE TYPE "public"."status_hutang" AS ENUM('belum_lunas', 'cicil', 'lunas');--> statement-breakpoint
CREATE TYPE "public"."tipe_hutang" AS ENUM('hutang', 'piutang');--> statement-breakpoint
CREATE TYPE "public"."tipe_vendor" AS ENUM('vendor', 'supplier', 'customer', 'lainnya');--> statement-breakpoint
CREATE TABLE "bank_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"nama_bank" text NOT NULL,
	"atas_nama" text NOT NULL,
	"nomor_rekening" text NOT NULL,
	"saldo_awal" integer DEFAULT 0 NOT NULL,
	"saldo" integer DEFAULT 0 NOT NULL,
	"keterangan" text,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hutang_piutang" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"tipe" "tipe_hutang" NOT NULL,
	"jumlah" integer NOT NULL,
	"sisa" integer NOT NULL,
	"vendor_id" uuid,
	"pegawai_id" uuid,
	"pihak" text,
	"deskripsi" text NOT NULL,
	"tanggal" text NOT NULL,
	"jatuh_tempo" text,
	"status" "status_hutang" DEFAULT 'belum_lunas' NOT NULL,
	"kategori" "kategori_hutang" DEFAULT 'lainnya' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"tipe" "tipe_vendor" DEFAULT 'vendor' NOT NULL,
	"kontak" text,
	"telepon" text,
	"email" text,
	"alamat" text,
	"keterangan" text,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kas_transaksi" ADD COLUMN "bank_account_id" uuid;--> statement-breakpoint
ALTER TABLE "kas_transaksi" ADD COLUMN "vendor_id" uuid;--> statement-breakpoint
ALTER TABLE "kas_transaksi" ADD COLUMN "hutang_piutang_id" uuid;--> statement-breakpoint
ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hutang_piutang" ADD CONSTRAINT "hutang_piutang_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hutang_piutang" ADD CONSTRAINT "hutang_piutang_vendor_id_vendor_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hutang_piutang" ADD CONSTRAINT "hutang_piutang_pegawai_id_pegawai_id_fk" FOREIGN KEY ("pegawai_id") REFERENCES "public"."pegawai"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor" ADD CONSTRAINT "vendor_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kas_transaksi" ADD CONSTRAINT "kas_transaksi_bank_account_id_bank_account_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kas_transaksi" ADD CONSTRAINT "kas_transaksi_vendor_id_vendor_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kas_transaksi" ADD CONSTRAINT "kas_transaksi_hutang_piutang_id_hutang_piutang_id_fk" FOREIGN KEY ("hutang_piutang_id") REFERENCES "public"."hutang_piutang"("id") ON DELETE set null ON UPDATE no action;