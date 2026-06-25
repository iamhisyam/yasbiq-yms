import { pgTable, uuid, text, boolean, timestamp, integer, uniqueIndex } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { unit } from './organization'

export const kurikulum = pgTable('kurikulum', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').notNull().references(() => unit.id, { onDelete: 'cascade' }),
  nama: text('nama').notNull(),
  deskripsi: text('deskripsi'),
  aktif: boolean('aktif').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const angkatanKurikulum = pgTable('angkatan_kurikulum', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').notNull().references(() => unit.id, { onDelete: 'cascade' }),
  tahun: integer('tahun').notNull(),
  kurikulumId: uuid('kurikulum_id').notNull().references(() => kurikulum.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('angkatan_unit_tahun_idx').on(table.unitId, table.tahun),
])

export const kurikulumRelations = relations(kurikulum, ({ one, many }) => ({
  unit: one(unit, {
    fields: [kurikulum.unitId],
    references: [unit.id],
  }),
  angkatanAssignments: many(angkatanKurikulum),
}))

export const angkatanKurikulumRelations = relations(angkatanKurikulum, ({ one }) => ({
  unit: one(unit, {
    fields: [angkatanKurikulum.unitId],
    references: [unit.id],
  }),
  kurikulum: one(kurikulum, {
    fields: [angkatanKurikulum.kurikulumId],
    references: [kurikulum.id],
  }),
}))
