/**
 * Schema: Keuangan (Financial Management)
 * Kas masuk/keluar, bank, vendor, hutang piutang, dan anggaran
 */
import { relations } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import {
  bigint,
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { unit, authUser } from './organization'
import { pegawai } from './pegawai'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const tipeTransaksiEnum = pgEnum('tipe_transaksi', [
  'pemasukan',
  'pengeluaran',
])

export const statusAnggaranEnum = pgEnum('status_anggaran', [
  'draft',
  'aktif',
  'selesai',
  'dibatalkan',
])

export const statusHutangEnum = pgEnum('status_hutang', [
  'belum_lunas',
  'cicil',
  'lunas',
])

export const tipeVendorEnum = pgEnum('tipe_vendor', [
  'vendor',
  'supplier',
  'customer',
  'lainnya',
])

export const tipeHutangEnum = pgEnum('tipe_hutang', [
  'hutang',
  'piutang',
])

export const kategoriHutangEnum = pgEnum('kategori_hutang', [
  'pembelian',
  'penjualan',
  'sewa',
  'gaji',
  'pinjaman',
  'lainnya',
])

export const tipeJurnalEnum = pgEnum('tipe_jurnal', [
  'kas', 'spp', 'gaji', 'penyusutan', 'penyesuaian', 'penutup',
])

export const jenisBankEnum = pgEnum('jenis_bank', [
  'bank', 'kas', 'ems',
])

export const tipeCoaEnum = pgEnum('tipe_coa', [
  'aset_lancar', 'aset_tetap', 'liabilitas', 'aset_neto', 'pendapatan', 'beban',
])

export const saldoNormalEnum = pgEnum('saldo_normal', [
  'debit', 'kredit',
])

export const refTypeEnum = pgEnum('ref_type', [
  'kas', 'spp', 'gaji', 'penyusutan', 'penyesuaian', 'penutup', 'dana',
])

// ─── Kas Kategori ─────────────────────────────────────────────────────────────

export const kasKategori = pgTable('kas_kategori', {
  id: uuid('id').primaryKey().defaultRandom(),
  nama: text('nama').notNull(),
  tipe: tipeTransaksiEnum('tipe').notNull(),
  warna: text('warna').default('#6366f1'),
  ikon: text('ikon'),
  kodeCoretax: text('kode_coretax'),
  coaKode: text('coa_kode'),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Bank Account ─────────────────────────────────────────────────────────────

export const bankAccount = pgTable('bank_account', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id')
    .notNull()
    .references(() => unit.id, { onDelete: 'cascade' }),
  namaBank: text('nama_bank').notNull(),
  atasNama: text('atas_nama').notNull(),
  nomorRekening: text('nomor_rekening').notNull(),
  saldoAwal: bigint('saldo_awal', { mode: 'number' }).notNull().default(0),
  saldo: bigint('saldo', { mode: 'number' }).notNull().default(0),
  jenis: jenisBankEnum('jenis').notNull().default('bank'),
  keterangan: text('keterangan'),
  aktif: boolean('aktif').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Vendor ───────────────────────────────────────────────────────────────────

export const vendor = pgTable('vendor', {
  id: uuid('id').primaryKey().defaultRandom(),
  nama: text('nama').notNull(),
  tipe: tipeVendorEnum('tipe').notNull().default('vendor'),
  npwp: text('npwp'),
  kontak: text('kontak'),
  telepon: text('telepon'),
  email: text('email'),
  alamat: text('alamat'),
  keterangan: text('keterangan'),
  aktif: boolean('aktif').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Hutang Piutang ───────────────────────────────────────────────────────────

export const hutangPiutang = pgTable('hutang_piutang', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id')
    .notNull()
    .references(() => unit.id, { onDelete: 'cascade' }),
  tipe: tipeHutangEnum('tipe').notNull(),
  jumlah: bigint('jumlah', { mode: 'number' }).notNull(),
  sisa: bigint('sisa', { mode: 'number' }).notNull(),
  vendorId: uuid('vendor_id')
    .references(() => vendor.id, { onDelete: 'set null' }),
  pegawaiId: uuid('pegawai_id')
    .references(() => pegawai.id, { onDelete: 'set null' }),
  pihak: text('pihak'),
  deskripsi: text('deskripsi').notNull(),
  tanggal: text('tanggal').notNull(),
  jatuhTempo: text('jatuh_tempo'),
  status: statusHutangEnum('status').notNull().default('belum_lunas'),
  kategori: kategoriHutangEnum('kategori').notNull().default('lainnya'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Kas Transaksi (enhanced) ─────────────────────────────────────────────────

export const kasTransaksi = pgTable('kas_transaksi', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id')
    .notNull()
    .references(() => unit.id, { onDelete: 'restrict' }),
  kategoriId: uuid('kategori_id')
    .references(() => kasKategori.id, { onDelete: 'set null' }),
  bankAccountId: uuid('bank_account_id')
    .references(() => bankAccount.id, { onDelete: 'set null' }),
  vendorId: uuid('vendor_id')
    .references(() => vendor.id, { onDelete: 'set null' }),
  hutangPiutangId: uuid('hutang_piutang_id')
    .references(() => hutangPiutang.id, { onDelete: 'set null' }),
  tipe: tipeTransaksiEnum('tipe').notNull(),
  refType: refTypeEnum('ref_type').notNull().default('kas'),
  refId: text('ref_id'),
  jumlah: bigint('jumlah', { mode: 'number' }).notNull(),
  keterangan: text('keterangan').notNull(),
  tanggal: text('tanggal').notNull(),
  referensi: text('referensi'),
  buktiUrl: text('bukti_url'),
  anggaranId: uuid('anggaran_id')
    .references(() => anggaran.id, { onDelete: 'set null' }),
  createdBy: text('created_by').notNull().references(() => authUser.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Anggaran ─────────────────────────────────────────────────────────────────

export const anggaran = pgTable('anggaran', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id')
    .notNull()
    .references(() => unit.id, { onDelete: 'restrict' }),
  nama: text('nama').notNull(),
  total: bigint('total', { mode: 'number' }).notNull(),
  terpakai: bigint('terpakai', { mode: 'number' }).notNull().default(0),
  periode: text('periode').notNull(),
  tipe: tipeTransaksiEnum('tipe').notNull().default('pengeluaran'),
  status: statusAnggaranEnum('status').notNull().default('draft'),
  keterangan: text('keterangan'),
  createdBy: text('created_by').notNull().references(() => authUser.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Chart of Accounts (ISAK 35) ──────────────────────────────────────────────

export const coa = pgTable('coa', {
  id: uuid('id').primaryKey().defaultRandom(),
  kode: text('kode').notNull().unique(),
  nama: text('nama').notNull(),
  tipe: tipeCoaEnum('tipe').notNull(),
  subTipe: text('sub_tipe'),               // kas | piutang | utang | penyusutan | etc
  saldoNormal: saldoNormalEnum('saldo_normal').notNull().default('debit'),
  parentId: uuid('parent_id').references((): AnyPgColumn => coa.id, { onDelete: 'set null' }),
  level: integer('level').notNull().default(1),
  urutan: integer('urutan').notNull().default(0),
  aktif: boolean('aktif').notNull().default(true),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Jurnal Double-Entry (ISAK 35) ────────────────────────────────────────────

export const jurnalHeader = pgTable('jurnal_header', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').notNull().references(() => unit.id, { onDelete: 'cascade' }),
  nomor: text('nomor').notNull(),
  tanggal: text('tanggal').notNull(),
  tipe: tipeJurnalEnum('tipe').notNull(),
  referensi: text('referensi'),              // link ke source: 'spp/{id}', 'gaji/{id}'
  transaksiId: uuid('transaksi_id').references(() => kasTransaksi.id, { onDelete: 'set null' }),
  keterangan: text('keterangan'),
  createdBy: text('created_by').notNull().references(() => authUser.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  unqNomor: unique('jurnal_header_unit_nomor_idx').on(table.unitId, table.nomor),
}))

export const jurnalDetail = pgTable('jurnal_detail', {
  id: uuid('id').primaryKey().defaultRandom(),
  jurnalId: uuid('jurnal_id').notNull().references(() => jurnalHeader.id, { onDelete: 'cascade' }),
  coaId: uuid('coa_id').notNull().references(() => coa.id, { onDelete: 'restrict' }),
  debit: bigint('debit', { mode: 'number' }).notNull().default(0),
  kredit: bigint('kredit', { mode: 'number' }).notNull().default(0),
  keterangan: text('keterangan'),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const kasKategoriRelations = relations(kasKategori, ({ many }) => ({
  transaksis: many(kasTransaksi),
}))

export const bankAccountRelations = relations(bankAccount, ({ one, many }) => ({
  unit: one(unit, {
    fields: [bankAccount.unitId],
    references: [unit.id],
  }),
  transaksis: many(kasTransaksi),
}))

export const vendorRelations = relations(vendor, ({ many }) => ({
  transaksis: many(kasTransaksi),
  hutangPiutangs: many(hutangPiutang),
}))

export const hutangPiutangRelations = relations(hutangPiutang, ({ one, many }) => ({
  unit: one(unit, {
    fields: [hutangPiutang.unitId],
    references: [unit.id],
  }),
  vendor: one(vendor, {
    fields: [hutangPiutang.vendorId],
    references: [vendor.id],
  }),
  pegawai: one(pegawai, {
    fields: [hutangPiutang.pegawaiId],
    references: [pegawai.id],
  }),
  transaksis: many(kasTransaksi),
}))

export const kasTransaksiRelations = relations(kasTransaksi, ({ one }) => ({
  unit: one(unit, {
    fields: [kasTransaksi.unitId],
    references: [unit.id],
  }),
  kategori: one(kasKategori, {
    fields: [kasTransaksi.kategoriId],
    references: [kasKategori.id],
  }),
  bankAccount: one(bankAccount, {
    fields: [kasTransaksi.bankAccountId],
    references: [bankAccount.id],
  }),
  vendor: one(vendor, {
    fields: [kasTransaksi.vendorId],
    references: [vendor.id],
  }),
  hutangPiutang: one(hutangPiutang, {
    fields: [kasTransaksi.hutangPiutangId],
    references: [hutangPiutang.id],
  }),
  anggaran: one(anggaran, {
    fields: [kasTransaksi.anggaranId],
    references: [anggaran.id],
  }),
}))

export const coaRelations = relations(coa, ({ one, many }) => ({
  parent: one(coa, { fields: [coa.parentId], references: [coa.id], relationName: 'coa_parent' }),
  children: many(coa, { relationName: 'coa_parent' }),
  jurnalDetails: many(jurnalDetail),
}))

export const jurnalHeaderRelations = relations(jurnalHeader, ({ one, many }) => ({
  unit: one(unit, { fields: [jurnalHeader.unitId], references: [unit.id] }),
  transaksi: one(kasTransaksi, { fields: [jurnalHeader.transaksiId], references: [kasTransaksi.id] }),
  details: many(jurnalDetail),
}))

export const jurnalDetailRelations = relations(jurnalDetail, ({ one }) => ({
  jurnal: one(jurnalHeader, { fields: [jurnalDetail.jurnalId], references: [jurnalHeader.id] }),
  coa: one(coa, { fields: [jurnalDetail.coaId], references: [coa.id] }),
}))

export const anggaranRelations = relations(anggaran, ({ one, many }) => ({
  unit: one(unit, {
    fields: [anggaran.unitId],
    references: [unit.id],
  }),
  transaksis: many(kasTransaksi),
}))
