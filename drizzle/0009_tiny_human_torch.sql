CREATE TYPE "public"."jenis_tagihan" AS ENUM('buku', 'seragam', 'study_tour', 'daftar_ulang', 'gedung', 'kegiatan', 'lainnya');--> statement-breakpoint
CREATE TYPE "public"."status_tagihan2" AS ENUM('belum_lunas', 'lunas', 'dibebaskan');--> statement-breakpoint
CREATE TABLE "tagihan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"siswa_id" uuid NOT NULL,
	"jenis" "jenis_tagihan" NOT NULL,
	"nominal" integer NOT NULL,
	"sudah_dibayar" integer DEFAULT 0 NOT NULL,
	"diskon" integer DEFAULT 0 NOT NULL,
	"beasiswa_id" uuid,
	"status" "status_tagihan2" DEFAULT 'belum_lunas' NOT NULL,
	"tanggal_terbit" text,
	"due_date" text,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tagihan_pembayaran" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tagihan_id" uuid NOT NULL,
	"jumlah_bayar" integer NOT NULL,
	"tanggal_bayar" text NOT NULL,
	"metode" text DEFAULT 'tunai' NOT NULL,
	"bukti_url" text,
	"catatan" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tagihan" ADD CONSTRAINT "tagihan_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan" ADD CONSTRAINT "tagihan_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan" ADD CONSTRAINT "tagihan_beasiswa_id_beasiswa_id_fk" FOREIGN KEY ("beasiswa_id") REFERENCES "public"."beasiswa"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan_pembayaran" ADD CONSTRAINT "tagihan_pembayaran_tagihan_id_tagihan_id_fk" FOREIGN KEY ("tagihan_id") REFERENCES "public"."tagihan"("id") ON DELETE restrict ON UPDATE no action;