import { relations } from 'drizzle-orm'
import { bigint, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { unit } from './organization'
import { tingkat } from './tingkat'
import { tahunAjaran } from './tahun-ajaran'

export const sppSetting = pgTable('spp_setting', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').notNull().references(() => unit.id, { onDelete: 'cascade' }),
  tingkatId: uuid('tingkat_id').notNull().references(() => tingkat.id, { onDelete: 'restrict' }),
  nominal: bigint('nominal', { mode: 'number' }).notNull(),
  tahunAjaran: text('tahun_ajaran').notNull(),
  tahunAjaranId: uuid('tahun_ajaran_id').references(() => tahunAjaran.id, { onDelete: 'restrict' }),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  unq: unique('spp_setting_unit_tingkat_ta_idx').on(table.unitId, table.tingkatId, table.tahunAjaranId),
}))

export const sppSettingRelations = relations(sppSetting, ({ one }) => ({
  unit: one(unit, { fields: [sppSetting.unitId], references: [unit.id] }),
  tingkatRef: one(tingkat, { fields: [sppSetting.tingkatId], references: [tingkat.id] }),
  tahunAjaranRef: one(tahunAjaran, { fields: [sppSetting.tahunAjaranId], references: [tahunAjaran.id] }),
}))
