import { relations } from 'drizzle-orm'
import { integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { unit } from './organization'

export const tingkat = pgTable('tingkat', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').notNull().references(() => unit.id, { onDelete: 'cascade' }),
  nama: text('nama').notNull(),
  kode: text('kode'),
  urutan: integer('urutan').notNull().default(0),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  unq: unique('tingkat_unit_nama_idx').on(table.unitId, table.nama),
}))

export const tingkatRelations = relations(tingkat, ({ one }) => ({
  unit: one(unit, { fields: [tingkat.unitId], references: [unit.id] }),
}))
