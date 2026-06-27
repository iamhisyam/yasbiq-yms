ALTER TYPE "public"."status_pegawai" ADD VALUE 'magang';--> statement-breakpoint
ALTER TYPE "public"."tipe_komponen" ADD VALUE 'biaya';--> statement-breakpoint
ALTER TABLE "pegawai" DROP CONSTRAINT "pegawai_unit_id_unit_id_fk";
--> statement-breakpoint
ALTER TABLE "pegawai" ALTER COLUMN "unit_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pegawai" ADD CONSTRAINT "pegawai_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE set null ON UPDATE no action;