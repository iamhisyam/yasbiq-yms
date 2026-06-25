import { relations } from 'drizzle-orm'
import { bigint, boolean, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { unit } from './organization'
import { siswa } from './siswa'

export const tipeBeasiswaEnum = pgEnum('tipe_beasiswa', ['potongan', 'gratis'])
export const jenisPotonganEnum = pgEnum('jenis_potongan', ['persen', 'nominal'])

export const beasiswa = pgTable('beasiswa', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').notNull().references(() => unit.id, { onDelete: 'cascade' }),
  nama: text('nama').notNull(),
  tipe: tipeBeasiswaEnum('tipe').notNull(),
  jenisPotongan: jenisPotonganEnum('jenis_potongan'),
  besaranPotongan: bigint('besaran_potongan', { mode: 'number' }),
  keterangan: text('keterangan'),
  aktif: boolean('aktif').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const siswaBeasiswa = pgTable('siswa_beasiswa', {
  id: uuid('id').primaryKey().defaultRandom(),
  siswaId: uuid('siswa_id').notNull().references(() => siswa.id, { onDelete: 'cascade' }),
  beasiswaId: uuid('beasiswa_id').notNull().references(() => beasiswa.id, { onDelete: 'cascade' }),
  unitId: uuid('unit_id').notNull().references(() => unit.id, { onDelete: 'cascade' }),
  tahunAjaran: text('tahun_ajaran').notNull(),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  unq: unique('siswa_beasiswa_siswa_bea_ta_idx').on(table.siswaId, table.beasiswaId, table.tahunAjaran),
}))

export const beasiswaRelations = relations(beasiswa, ({ one, many }) => ({
  unit: one(unit, { fields: [beasiswa.unitId], references: [unit.id] }),
  siswaAssignments: many(siswaBeasiswa),
}))

export const siswaBeasiswaRelations = relations(siswaBeasiswa, ({ one }) => ({
  siswa: one(siswa, { fields: [siswaBeasiswa.siswaId], references: [siswa.id] }),
  beasiswa: one(beasiswa, { fields: [siswaBeasiswa.beasiswaId], references: [beasiswa.id] }),
  unit: one(unit, { fields: [siswaBeasiswa.unitId], references: [unit.id] }),
}))
