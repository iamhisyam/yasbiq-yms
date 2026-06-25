CREATE TABLE "siswa_riwayat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siswa_id" uuid NOT NULL,
	"tahun_ajaran_id" uuid NOT NULL,
	"kelas_id" uuid,
	"status" text DEFAULT 'aktif' NOT NULL,
	"tanggal" date NOT NULL,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tahun_ajaran" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"tanggal_mulai" date NOT NULL,
	"tanggal_selesai" date NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "siswa_riwayat" ADD CONSTRAINT "siswa_riwayat_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siswa_riwayat" ADD CONSTRAINT "siswa_riwayat_tahun_ajaran_id_tahun_ajaran_id_fk" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "public"."tahun_ajaran"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siswa_riwayat" ADD CONSTRAINT "siswa_riwayat_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tahun_ajaran" ADD CONSTRAINT "tahun_ajaran_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;