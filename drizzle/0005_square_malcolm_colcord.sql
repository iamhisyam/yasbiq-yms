ALTER TABLE "siswa" ALTER COLUMN "kelas" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "siswa" ADD COLUMN "kelas_id" uuid;--> statement-breakpoint
ALTER TABLE "siswa" ADD CONSTRAINT "siswa_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE set null ON UPDATE no action;