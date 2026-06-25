import { relations } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core'
import { unit } from './organization'

export const pengaturan = pgTable('pengaturan', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').notNull().references(() => unit.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  unitKeyIdx: uniqueIndex('pengaturan_unit_key_idx').on(table.unitId, table.key),
}))

export const pengaturanRelations = relations(pengaturan, ({ one }) => ({
  unit: one(unit, { fields: [pengaturan.unitId], references: [unit.id] }),
}))
