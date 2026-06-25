import { relations } from 'drizzle-orm'
import { bigint, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { unit } from './organization'

export const kategoriAsetEnum = pgEnum('kategori_aset', [
  'tanah', 'gedung', 'kendaraan', 'peralatan', 'inventaris', 'lainnya',
])

export const metodePenyusutanEnum = pgEnum('metode_penyusutan', [
  'garis_lurus', 'saldo_menurun',
])

export const statusAsetEnum = pgEnum('status_aset', [
  'aktif', 'dijual', 'dihapuskan',
])

export const asetTetap = pgTable('aset_tetap', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').notNull().references(() => unit.id, { onDelete: 'restrict' }),
  kodeAset: text('kode_aset'),
  nama: text('nama').notNull(),
  kategori: kategoriAsetEnum('kategori').notNull().default('lainnya'),
  tanggalPerolehan: text('tanggal_perolehan').notNull(),
  hargaPerolehan: bigint('harga_perolehan', { mode: 'number' }).notNull(),
  masaManfaat: integer('masa_manfaat'),
  metodePenyusutan: metodePenyusutanEnum('metode_penyusutan').default('garis_lurus'),
  nilaiResidu: bigint('nilai_residu', { mode: 'number' }).notNull().default(0),
  akumulasiPenyusutan: bigint('akumulasi_penyusutan', { mode: 'number' }).notNull().default(0),
  lokasi: text('lokasi'),
  keterangan: text('keterangan'),
  status: statusAsetEnum('status').notNull().default('aktif'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const asetTetapRelations = relations(asetTetap, ({ one }) => ({
  unit: one(unit, { fields: [asetTetap.unitId], references: [unit.id] }),
}))
