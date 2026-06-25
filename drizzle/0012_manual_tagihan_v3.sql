CREATE TABLE "tagihan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"judul" text,
	"tahun_ajaran" text NOT NULL,
	"status" "status_tagihan2" DEFAULT 'draft' NOT NULL,
	"total_nominal" integer DEFAULT 0 NOT NULL,
	"total_diskon" integer DEFAULT 0 NOT NULL,
	"tanggal_terbit" text,
	"due_date" text,
	"keterangan" text,
	"siswa_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tagihan_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tagihan_id" uuid NOT NULL,
	"jenis_tagihan_id" uuid,
	"nama" text NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"harga_satuan" integer NOT NULL,
	"diskon" integer DEFAULT 0 NOT NULL,
	"subtotal" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tagihan_siswa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tagihan_id" uuid NOT NULL,
	"siswa_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"total_nominal" integer DEFAULT 0 NOT NULL,
	"total_diskon" integer DEFAULT 0 NOT NULL,
	"sudah_dibayar" integer DEFAULT 0 NOT NULL,
	"status" "status_tagihan2" DEFAULT 'terbit' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tagihan_pembayaran" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tagihan_siswa_id" uuid NOT NULL,
	"jumlah_bayar" integer NOT NULL,
	"tanggal_bayar" text NOT NULL,
	"metode" text DEFAULT 'tunai' NOT NULL,
	"bukti_url" text,
	"catatan" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tagihan" ADD CONSTRAINT "tagihan_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tagihan_item" ADD CONSTRAINT "tagihan_item_tagihan_id_tagihan_id_fk" FOREIGN KEY ("tagihan_id") REFERENCES "public"."tagihan"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tagihan_item" ADD CONSTRAINT "tagihan_item_jenis_tagihan_id_jenis_tagihan_id_fk" FOREIGN KEY ("jenis_tagihan_id") REFERENCES "public"."jenis_tagihan"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tagihan_siswa" ADD CONSTRAINT "tagihan_siswa_tagihan_id_tagihan_id_fk" FOREIGN KEY ("tagihan_id") REFERENCES "public"."tagihan"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tagihan_siswa" ADD CONSTRAINT "tagihan_siswa_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tagihan_siswa" ADD CONSTRAINT "tagihan_siswa_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tagihan_pembayaran" ADD CONSTRAINT "tagihan_pembayaran_tagihan_siswa_id_tagihan_siswa_id_fk" FOREIGN KEY ("tagihan_siswa_id") REFERENCES "public"."tagihan_siswa"("id") ON DELETE restrict ON UPDATE no action;
