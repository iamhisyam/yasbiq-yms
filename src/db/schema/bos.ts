import { relations } from 'drizzle-orm'
import { bigint, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { unit } from './organization'

export const statusBosEnum = pgEnum('status_bos', ['aktif', 'selesai'])

export const bosPeriode = pgTable('bos_periode', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').notNull().references(() => unit.id, { onDelete: 'restrict' }),
  tahun: integer('tahun').notNull(),
  nama: text('nama').notNull(),
  jumlahDana: bigint('jumlah_dana', { mode: 'number' }).notNull().default(0),
  rekeningKhusus: text('rekening_khusus'),
  status: statusBosEnum('status').notNull().default('aktif'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  unq: unique('bos_periode_unit_tahun_idx').on(table.unitId, table.tahun),
}))

export const bosRkas = pgTable('bos_rkas', {
  id: uuid('id').primaryKey().defaultRandom(),
  periodeId: uuid('periode_id').notNull().references(() => bosPeriode.id, { onDelete: 'cascade' }),
  kodeRekening: text('kode_rekening'),
  komponen: text('komponen').notNull(),
  subKomponen: text('sub_komponen'),
  anggaran: bigint('anggaran', { mode: 'number' }).notNull().default(0),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const bosRealisasi = pgTable('bos_realisasi', {
  id: uuid('id').primaryKey().defaultRandom(),
  rkasId: uuid('rkas_id').notNull().references(() => bosRkas.id, { onDelete: 'cascade' }),
  tanggal: text('tanggal').notNull(),
  uraian: text('uraian').notNull(),
  jumlah: bigint('jumlah', { mode: 'number' }).notNull(),
  bukti: text('bukti'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const bosPeriodeRelations = relations(bosPeriode, ({ one, many }) => ({
  unit: one(unit, { fields: [bosPeriode.unitId], references: [unit.id] }),
  rkasItems: many(bosRkas),
}))

export const bosRkasRelations = relations(bosRkas, ({ one, many }) => ({
  periode: one(bosPeriode, { fields: [bosRkas.periodeId], references: [bosPeriode.id] }),
  realisasis: many(bosRealisasi),
}))

export const bosRealisasiRelations = relations(bosRealisasi, ({ one }) => ({
  rkas: one(bosRkas, { fields: [bosRealisasi.rkasId], references: [bosRkas.id] }),
}))
