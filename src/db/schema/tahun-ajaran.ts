import { relations } from 'drizzle-orm'
import { boolean, pgEnum, pgTable, text, timestamp, uuid, date } from 'drizzle-orm/pg-core'
import { unit } from './organization'
import { siswa } from './siswa'
import { kelas } from './kelas'

export const statusRiwayatEnum = pgEnum('status_riwayat', [
  'aktif', 'nonaktif', 'lulus', 'pindah', 'dikeluarkan',
])

export const tahunAjaran = pgTable('tahun_ajaran', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').notNull().references(() => unit.id, { onDelete: 'cascade' }),
  nama: text('nama').notNull(),
  tanggalMulai: date('tanggal_mulai').notNull(),
  tanggalSelesai: date('tanggal_selesai').notNull(),
  aktif: boolean('aktif').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const tahunAjaranRelations = relations(tahunAjaran, ({ one, many }) => ({
  unit: one(unit, { fields: [tahunAjaran.unitId], references: [unit.id] }),
  riwayat: many(siswaRiwayat),
}))

export const siswaRiwayat = pgTable('siswa_riwayat', {
  id: uuid('id').primaryKey().defaultRandom(),
  siswaId: uuid('siswa_id').notNull().references(() => siswa.id, { onDelete: 'cascade' }),
  tahunAjaranId: uuid('tahun_ajaran_id').notNull().references(() => tahunAjaran.id, { onDelete: 'restrict' }),
  kelasId: uuid('kelas_id').references(() => kelas.id, { onDelete: 'set null' }),
  status: statusRiwayatEnum('status').notNull().default('aktif'),
  tanggal: date('tanggal').notNull(),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const siswaRiwayatRelations = relations(siswaRiwayat, ({ one }) => ({
  siswa: one(siswa, { fields: [siswaRiwayat.siswaId], references: [siswa.id] }),
  tahunAjaran: one(tahunAjaran, { fields: [siswaRiwayat.tahunAjaranId], references: [tahunAjaran.id] }),
  kelas: one(kelas, { fields: [siswaRiwayat.kelasId], references: [kelas.id] }),
}))
