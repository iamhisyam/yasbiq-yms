import { relations } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { unit } from './organization'
import { pegawai } from './pegawai'
import { tingkat } from './tingkat'

export const kelas = pgTable('kelas', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').notNull().references(() => unit.id, { onDelete: 'cascade' }),
  nama: text('nama').notNull(),
  tingkatId: uuid('tingkat_id').references(() => tingkat.id, { onDelete: 'set null' }),
  waliKelasId: uuid('wali_kelas_id').references(() => pegawai.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const kelasRelations = relations(kelas, ({ one }) => ({
  unit: one(unit, { fields: [kelas.unitId], references: [unit.id] }),
  waliKelas: one(pegawai, { fields: [kelas.waliKelasId], references: [pegawai.id], relationName: 'kelasWali' }),
  tingkatRef: one(tingkat, { fields: [kelas.tingkatId], references: [tingkat.id] }),
}))
