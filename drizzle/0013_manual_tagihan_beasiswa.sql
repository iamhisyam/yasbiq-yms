ALTER TABLE "tagihan_siswa" ADD COLUMN "beasiswa_id" uuid;
ALTER TABLE "tagihan_siswa" ADD COLUMN "diskon" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "tagihan_siswa" ADD CONSTRAINT "tagihan_siswa_beasiswa_id_beasiswa_id_fk" FOREIGN KEY ("beasiswa_id") REFERENCES "public"."beasiswa"("id") ON DELETE set null ON UPDATE no action;
