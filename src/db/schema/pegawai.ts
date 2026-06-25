import { relations } from 'drizzle-orm'
import { bigint, boolean, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { unit, authUser } from './organization'
import { kelas } from './kelas'

export const statusPegawaiEnum = pgEnum('status_pegawai', [
  'honorer', 'tetap', 'kontrak', 'pns', 'magang',
])

export const jabatanEnum = pgEnum('jabatan', [
  'guru_mapel', 'guru_kelas', 'kepala_sekolah', 'tata_usaha', 'bendahara', 'staff',
])

export const statusPenggajianEnum = pgEnum('status_penggajian', [
  'draft', 'disetujui', 'dibayar', 'dibatalkan',
])

export const tipeKomponenEnum = pgEnum('tipe_komponen', [
  'penerimaan', 'potongan',
])

export const jenisKelaminEnum = pgEnum('jenis_kelamin', ['L', 'P'])

export const pegawai = pgTable('pegawai', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').references(() => unit.id, { onDelete: 'set null' }),
  nip: text('nip'),
  nama: text('nama').notNull(),
  jenisKelamin: jenisKelaminEnum('jenis_kelamin'),
  tempatLahir: text('tempat_lahir'),
  tanggalLahir: text('tanggal_lahir'),
  alamat: text('alamat'),
  telepon: text('telepon'),
  email: text('email'),
  statusPegawai: statusPegawaiEnum('status_pegawai').default('honorer'),
  jabatan: jabatanEnum('jabatan').default('guru_mapel'),
  tanggalMasuk: text('tanggal_masuk'),
  tanggalKeluar: text('tanggal_keluar'),
  pendidikanTerakhir: text('pendidikan_terakhir'),
  jurusan: text('jurusan'),
  bank: text('bank'),
  nomorRekening: text('nomor_rekening'),
  gajiPokok: bigint('gaji_pokok', { mode: 'number' }).default(0),
  npwp: text('npwp'),
  statusPajak: text('status_pajak'),
  aktif: boolean('aktif').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const mataPelajaran = pgTable('mata_pelajaran', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').notNull().references(() => unit.id, { onDelete: 'cascade' }),
  nama: text('nama').notNull(),
  kode: text('kode'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  unq: unique().on(table.unitId, table.kode),
}))

export const pegawaiMapel = pgTable('pegawai_mapel', {
  id: uuid('id').primaryKey().defaultRandom(),
  pegawaiId: uuid('pegawai_id').notNull().references(() => pegawai.id, { onDelete: 'cascade' }),
  mataPelajaranId: uuid('mata_pelajaran_id').notNull().references(() => mataPelajaran.id, { onDelete: 'restrict' }),
}, (table) => ({
  unq: unique().on(table.pegawaiId, table.mataPelajaranId),
}))

export const penggajian = pgTable('penggajian', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').notNull().references(() => unit.id, { onDelete: 'cascade' }),
  pegawaiId: uuid('pegawai_id').notNull().references(() => pegawai.id, { onDelete: 'restrict' }),
  periode: text('periode').notNull(),
  gajiPokok: bigint('gaji_pokok', { mode: 'number' }).notNull().default(0),
  totalPenerimaan: bigint('total_penerimaan', { mode: 'number' }).notNull().default(0),
  totalPotongan: bigint('total_potongan', { mode: 'number' }).notNull().default(0),
  pph21: bigint('pph21_dipotong', { mode: 'number' }).default(0),
  bpjsKaryawan: bigint('bpjs_karyawan', { mode: 'number' }).notNull().default(0),
  bpjsPerusahaan: bigint('bpjs_perusahaan', { mode: 'number' }).notNull().default(0),
  totalDiterima: bigint('total_diterima', { mode: 'number' }).notNull().default(0),
  status: statusPenggajianEnum('status').default('draft').notNull(),
  approvedBy: text('approved_by').references(() => authUser.id, { onDelete: 'set null' }),
  approvedAt: text('approved_at'),
  tanggalBayar: text('tanggal_bayar'),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Penggajian Komponen (template per unit) ─────────────────────────────────

export const penggajianKomponen = pgTable('penggajian_komponen', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').notNull().references(() => unit.id, { onDelete: 'cascade' }),
  nama: text('nama').notNull(),
  tipe: tipeKomponenEnum('tipe').notNull(),
  kode: text('kode').notNull(),
  defaultJumlah: bigint('default_jumlah', { mode: 'number' }).notNull().default(0),
  objekPajak: boolean('objek_pajak').notNull().default(true),
  hitungOtomatis: boolean('hitung_otomatis').notNull().default(false),
  aktif: boolean('aktif').notNull().default(true),
  urutan: integer('urutan').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  unq: unique().on(table.unitId, table.kode),
}))

// ─── Penggajian Detail (line items per payslip) ──────────────────────────────

export const penggajianDetail = pgTable('penggajian_detail', {
  id: uuid('id').primaryKey().defaultRandom(),
  penggajianId: uuid('penggajian_id').notNull().references(() => penggajian.id, { onDelete: 'cascade' }),
  komponenId: uuid('komponen_id').references(() => penggajianKomponen.id, { onDelete: 'set null' }),
  tipe: tipeKomponenEnum('tipe').notNull(),
  kode: text('kode').notNull(),
  nama: text('nama').notNull(),
  jumlah: bigint('jumlah', { mode: 'number' }).notNull().default(0),
  objekPajak: boolean('objek_pajak').notNull().default(true),
  urutan: integer('urutan').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const pegawaiRelations = relations(pegawai, ({ one, many }) => ({
  unit: one(unit, {
    fields: [pegawai.unitId],
    references: [unit.id],
  }),
  mapelAssignments: many(pegawaiMapel),
  penggajian: many(penggajian),
  waliKelasOf: many(kelas, { relationName: 'kelasWali' }),
}))

export const mataPelajaranRelations = relations(mataPelajaran, ({ one, many }) => ({
  unit: one(unit, {
    fields: [mataPelajaran.unitId],
    references: [unit.id],
  }),
  pegawaiAssignments: many(pegawaiMapel),
}))

export const pegawaiMapelRelations = relations(pegawaiMapel, ({ one }) => ({
  pegawai: one(pegawai, {
    fields: [pegawaiMapel.pegawaiId],
    references: [pegawai.id],
  }),
  mataPelajaran: one(mataPelajaran, {
    fields: [pegawaiMapel.mataPelajaranId],
    references: [mataPelajaran.id],
  }),
}))

export const penggajianRelations = relations(penggajian, ({ one, many }) => ({
  unit: one(unit, {
    fields: [penggajian.unitId],
    references: [unit.id],
  }),
  pegawai: one(pegawai, {
    fields: [penggajian.pegawaiId],
    references: [pegawai.id],
  }),
  details: many(penggajianDetail),
}))

export const penggajianKomponenRelations = relations(penggajianKomponen, ({ one, many }) => ({
  unit: one(unit, {
    fields: [penggajianKomponen.unitId],
    references: [unit.id],
  }),
  details: many(penggajianDetail),
}))

export const penggajianDetailRelations = relations(penggajianDetail, ({ one }) => ({
  penggajian: one(penggajian, {
    fields: [penggajianDetail.penggajianId],
    references: [penggajian.id],
  }),
  komponen: one(penggajianKomponen, {
    fields: [penggajianDetail.komponenId],
    references: [penggajianKomponen.id],
  }),
}))
