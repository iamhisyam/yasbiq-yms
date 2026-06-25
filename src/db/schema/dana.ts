import { relations } from 'drizzle-orm'
import { bigint, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { unit } from './organization'

export const tipeDanaEnum = pgEnum('tipe_dana', [
  'donor', 'investor', 'endowment', 'internal',
])

export const jenisIkatEnum = pgEnum('jenis_ikat', [
  'tidak_terikat', 'terikat_temporer', 'terikat_permanen',
])

export const statusDanaEnum = pgEnum('status_dana', [
  'aktif', 'selesai', 'dibatalkan',
])

export const dana = pgTable('dana', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').notNull().references(() => unit.id, { onDelete: 'restrict' }),
  kode: text('kode'),
  nama: text('nama').notNull(),
  tipe: tipeDanaEnum('tipe').notNull().default('donor'),
  sumber: text('sumber'),
  npwp: text('npwp'),
  jenisIkat: jenisIkatEnum('jenis_ikat').notNull().default('tidak_terikat'),
  tujuan: text('tujuan'),
  targetNominal: bigint('target_nominal', { mode: 'number' }).notNull().default(0),
  realisasi: bigint('realisasi', { mode: 'number' }).notNull().default(0),
  tanggalMulai: text('tanggal_mulai'),
  tanggalSelesai: text('tanggal_selesai'),
  status: statusDanaEnum('status').notNull().default('aktif'),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const danaRelations = relations(dana, ({ one }) => ({
  unit: one(unit, { fields: [dana.unitId], references: [unit.id] }),
}))
