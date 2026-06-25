CREATE TABLE "angkatan_kurikulum" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"tahun" integer NOT NULL,
	"kurikulum_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kurikulum" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"deskripsi" text,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "angkatan_kurikulum" ADD CONSTRAINT "angkatan_kurikulum_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "angkatan_kurikulum" ADD CONSTRAINT "angkatan_kurikulum_kurikulum_id_kurikulum_id_fk" FOREIGN KEY ("kurikulum_id") REFERENCES "public"."kurikulum"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kurikulum" ADD CONSTRAINT "kurikulum_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "angkatan_unit_tahun_idx" ON "angkatan_kurikulum" USING btree ("unit_id","tahun");