CREATE TYPE "public"."jenis_potongan" AS ENUM('persen', 'nominal');--> statement-breakpoint
CREATE TYPE "public"."tipe_beasiswa" AS ENUM('potongan', 'gratis');--> statement-breakpoint
CREATE TABLE "beasiswa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"tipe" "tipe_beasiswa" NOT NULL,
	"jenis_potongan" "jenis_potongan",
	"besaran_potongan" integer,
	"keterangan" text,
	"aktif" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siswa_beasiswa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siswa_id" uuid NOT NULL,
	"beasiswa_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"tahun_ajaran" text NOT NULL,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "spp_tagihan" ADD COLUMN "beasiswa_id" uuid;--> statement-breakpoint
ALTER TABLE "spp_tagihan" ADD COLUMN "diskon" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "beasiswa" ADD CONSTRAINT "beasiswa_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siswa_beasiswa" ADD CONSTRAINT "siswa_beasiswa_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siswa_beasiswa" ADD CONSTRAINT "siswa_beasiswa_beasiswa_id_beasiswa_id_fk" FOREIGN KEY ("beasiswa_id") REFERENCES "public"."beasiswa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siswa_beasiswa" ADD CONSTRAINT "siswa_beasiswa_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spp_tagihan" ADD CONSTRAINT "spp_tagihan_beasiswa_id_beasiswa_id_fk" FOREIGN KEY ("beasiswa_id") REFERENCES "public"."beasiswa"("id") ON DELETE set null ON UPDATE no action;