import { relations } from 'drizzle-orm'
import { bigint, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { unit, authUser } from './organization'
import { siswa } from './siswa'
import { beasiswa } from './beasiswa'
import { tahunAjaran } from './tahun-ajaran'

export const statusTagihanEnum = pgEnum('status_tagihan', [
  'draft', 'terbit', 'cicil', 'lunas', 'dibebaskan',
])

export const metodePembayaranEnum = pgEnum('metode_pembayaran', [
  'tunai', 'transfer', 'qris', 'va', 'debit', 'kartu_kredit', 'gerai', 'lainnya',
])

export const jenisTagihanEnum = pgEnum('jenis_tagihan', [
  'spp', 'bangunan', 'daftar_ulang', 'kegiatan', 'lainnya',
])

export const tagihan = pgTable('tagihan', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').notNull().references(() => unit.id, { onDelete: 'restrict' }),
  judul: text('judul'),
  jenis: jenisTagihanEnum('jenis').notNull().default('lainnya'),
  tahunAjaran: text('tahun_ajaran').notNull(),
  tahunAjaranId: uuid('tahun_ajaran_id').references(() => tahunAjaran.id, { onDelete: 'set null' }),
  bulan: integer('bulan'),
  tahun: integer('tahun'),
  status: statusTagihanEnum('status').notNull().default('draft'),
  nominal: bigint('nominal', { mode: 'number' }).notNull().default(0),
  tanggalTerbit: text('tanggal_terbit'),
  dueDate: text('due_date'),
  keterangan: text('keterangan'),
  siswaCount: integer('siswa_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const tagihanItem = pgTable('tagihan_item', {
  id: uuid('id').primaryKey().defaultRandom(),
  tagihanId: uuid('tagihan_id').notNull().references(() => tagihan.id, { onDelete: 'cascade' }),
  nama: text('nama').notNull(),
  qty: integer('qty').notNull().default(1),
  hargaSatuan: bigint('harga_satuan', { mode: 'number' }).notNull(),
  diskon: bigint('diskon', { mode: 'number' }).notNull().default(0),
  subtotal: bigint('subtotal', { mode: 'number' }).notNull(),
})

export const tagihanSiswa = pgTable('tagihan_siswa', {
  id: uuid('id').primaryKey().defaultRandom(),
  tagihanId: uuid('tagihan_id').notNull().references(() => tagihan.id, { onDelete: 'cascade' }),
  siswaId: uuid('siswa_id').notNull().references(() => siswa.id, { onDelete: 'restrict' }),
  unitId: uuid('unit_id').notNull().references(() => unit.id, { onDelete: 'restrict' }),
  nominal: bigint('nominal', { mode: 'number' }).notNull().default(0),
  sudahDibayar: bigint('sudah_dibayar', { mode: 'number' }).notNull().default(0),
  status: statusTagihanEnum('status').notNull().default('terbit'),
  beasiswaId: uuid('beasiswa_id').references(() => beasiswa.id, { onDelete: 'set null' }),
  diskon: bigint('diskon', { mode: 'number' }).notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  unq: unique('tagihan_siswa_tagihan_siswa_idx').on(table.tagihanId, table.siswaId),
}))

export const pembayaran = pgTable('pembayaran', {
  id: uuid('id').primaryKey().defaultRandom(),
  tagihanSiswaId: uuid('tagihan_siswa_id').notNull().references(() => tagihanSiswa.id, { onDelete: 'cascade' }),
  jumlahBayar: bigint('jumlah_bayar', { mode: 'number' }).notNull(),
  tanggalBayar: text('tanggal_bayar').notNull(),
  metode: metodePembayaranEnum('metode').notNull().default('tunai'),
  buktiUrl: text('bukti_url'),
  catatan: text('catatan'),
  createdBy: text('created_by').notNull().references(() => authUser.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const tagihanRelations = relations(tagihan, ({ one, many }) => ({
  unit: one(unit, { fields: [tagihan.unitId], references: [unit.id] }),
  tahunAjaranRef: one(tahunAjaran, { fields: [tagihan.tahunAjaranId], references: [tahunAjaran.id] }),
  items: many(tagihanItem),
  siswaTagihan: many(tagihanSiswa),
}))

export const tagihanItemRelations = relations(tagihanItem, ({ one }) => ({
  tagihan: one(tagihan, { fields: [tagihanItem.tagihanId], references: [tagihan.id] }),
}))

export const tagihanSiswaRelations = relations(tagihanSiswa, ({ one, many }) => ({
  tagihan: one(tagihan, { fields: [tagihanSiswa.tagihanId], references: [tagihan.id] }),
  siswa: one(siswa, { fields: [tagihanSiswa.siswaId], references: [siswa.id] }),
  unit: one(unit, { fields: [tagihanSiswa.unitId], references: [unit.id] }),
  beasiswa: one(beasiswa, { fields: [tagihanSiswa.beasiswaId], references: [beasiswa.id] }),
  pembayarans: many(pembayaran),
}))

export const pembayaranRelations = relations(pembayaran, ({ one }) => ({
  tagihanSiswa: one(tagihanSiswa, { fields: [pembayaran.tagihanSiswaId], references: [tagihanSiswa.id] }),
  user: one(authUser, { fields: [pembayaran.createdBy], references: [authUser.id] }),
}))
