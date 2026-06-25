import { relations } from 'drizzle-orm'
import { boolean, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { unit } from './organization'
import { kelas } from './kelas'
import { siswaRiwayat } from './tahun-ajaran'

export const statusSiswaEnum = pgEnum('status_siswa', [
  'aktif', 'nonaktif', 'lulus', 'pindah', 'dikeluarkan',
])

export const hubunganWaliEnum = pgEnum('hubungan_wali', [
  'ayah', 'ibu', 'wali', 'kakek', 'nenek', 'lainnya',
])

export const siswa = pgTable('siswa', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').notNull().references(() => unit.id, { onDelete: 'restrict' }),
  nis: text('nis').notNull(),
  nama: text('nama').notNull(),
  kelasId: uuid('kelas_id').references(() => kelas.id, { onDelete: 'set null' }),
  jenisKelamin: text('jenis_kelamin'),
  tanggalLahir: text('tanggal_lahir'),
  alamat: text('alamat'),
  tahunMasuk: integer('tahun_masuk').notNull(),
  tahunKeluar: integer('tahun_keluar'),
  status: statusSiswaEnum('status').notNull().default('aktif'),
  foto: text('foto'),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nisUnitIdx: unique('siswa_nis_unit_idx').on(table.unitId, table.nis),
}))

export const wali = pgTable('wali', {
  id: uuid('id').primaryKey().defaultRandom(),
  siswaId: uuid('siswa_id').notNull().references(() => siswa.id, { onDelete: 'cascade' }),
  nama: text('nama').notNull(),
  hubungan: hubunganWaliEnum('hubungan').notNull().default('ayah'),
  telepon: text('telepon'),
  email: text('email'),
  pekerjaan: text('pekerjaan'),
  alamat: text('alamat'),
  isPrimary: boolean('is_primary').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const siswaRelations = relations(siswa, ({ one, many }) => ({
  unit: one(unit, { fields: [siswa.unitId], references: [unit.id] }),
  kelasRef: one(kelas, { fields: [siswa.kelasId], references: [kelas.id] }),
  walis: many(wali),
  riwayat: many(siswaRiwayat),
}))

export const waliRelations = relations(wali, ({ one }) => ({
  siswa: one(siswa, { fields: [wali.siswaId], references: [siswa.id] }),
}))
