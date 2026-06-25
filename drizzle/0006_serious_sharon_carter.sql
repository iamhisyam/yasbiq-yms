CREATE TABLE "mata_pelajaran" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"kode" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pegawai" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"nip" text,
	"nama" text NOT NULL,
	"jenis_kelamin" text,
	"tempat_lahir" text,
	"tanggal_lahir" text,
	"alamat" text,
	"telepon" text,
	"email" text,
	"status_pegawai" text DEFAULT 'honorer',
	"jabatan" text DEFAULT 'guru_mapel',
	"tanggal_masuk" text,
	"tanggal_keluar" text,
	"pendidikan_terakhir" text,
	"jurusan" text,
	"bank" text,
	"nomor_rekening" text,
	"gaji_pokok" integer DEFAULT 0,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pegawai_mapel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pegawai_id" uuid NOT NULL,
	"mata_pelajaran_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "penggajian" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"pegawai_id" uuid NOT NULL,
	"periode" text NOT NULL,
	"gaji_pokok" integer DEFAULT 0 NOT NULL,
	"tunjangan" integer DEFAULT 0 NOT NULL,
	"potongan" integer DEFAULT 0 NOT NULL,
	"total_diterima" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"tanggal_bayar" text,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mata_pelajaran" ADD CONSTRAINT "mata_pelajaran_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pegawai" ADD CONSTRAINT "pegawai_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pegawai_mapel" ADD CONSTRAINT "pegawai_mapel_pegawai_id_pegawai_id_fk" FOREIGN KEY ("pegawai_id") REFERENCES "public"."pegawai"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pegawai_mapel" ADD CONSTRAINT "pegawai_mapel_mata_pelajaran_id_mata_pelajaran_id_fk" FOREIGN KEY ("mata_pelajaran_id") REFERENCES "public"."mata_pelajaran"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penggajian" ADD CONSTRAINT "penggajian_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penggajian" ADD CONSTRAINT "penggajian_pegawai_id_pegawai_id_fk" FOREIGN KEY ("pegawai_id") REFERENCES "public"."pegawai"("id") ON DELETE restrict ON UPDATE no action;