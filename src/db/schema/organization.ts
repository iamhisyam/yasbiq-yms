/**
 * Schema: Organization (Yayasan & Unit)
 * Tabel inti untuk struktur multi-unit yayasan
 */
import { relations } from 'drizzle-orm'
import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const jenjangEnum = pgEnum('jenjang', [
  'TK',
  'SD',
  'SMP',
  'SMA',
  'SMK',
  'Lainnya',
])

export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'admin_yayasan',
  'operator',
  'guru',
])

// ─── Yayasan ──────────────────────────────────────────────────────────────────

export const yayasan = pgTable('yayasan', {
  id: uuid('id').primaryKey().defaultRandom(),
  nama: text('nama').notNull(),
  alamat: text('alamat'),
  npwp: text('npwp'),
  statusPkp: text('status_pkp'),
  ketua: text('ketua'),
  bendahara: text('bendahara'),
  sekretaris: text('sekretaris'),
  logoUrl: text('logo_url'),
  logoDokumen: text('logo_dokumen'),
  headerDokumen: text('header_dokumen'),
  footerDokumen: text('footer_dokumen'),
  telepon: text('telepon'),
  email: text('email'),
  website: text('website'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Unit ─────────────────────────────────────────────────────────────────────

export const unit = pgTable('unit', {
  id: uuid('id').primaryKey().defaultRandom(),
  yayasanId: uuid('yayasan_id')
    .notNull()
    .references(() => yayasan.id, { onDelete: 'cascade' }),
  nama: text('nama').notNull(),
  nomorUnit: text('nomor_unit'),
  jenjang: jenjangEnum('jenjang').notNull(),
  alamat: text('alamat'),
  telepon: text('telepon'),
  email: text('email'),
  kepalaUnit: text('kepala_unit'),
  aktif: boolean('aktif').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── User Unit (Akses per-unit) ───────────────────────────────────────────────

export const userUnit = pgTable('user_unit', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => authUser.id, { onDelete: 'cascade' }),
  unitId: uuid('unit_id')
    .notNull()
    .references(() => unit.id, { onDelete: 'cascade' }),
  role: userRoleEnum('role').notNull().default('operator'),
  isBendahara: boolean('is_bendahara').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Auth User reference (untuk foreign key) ──────────────────────────────────
// Better Auth mengelola tabel ini, kita hanya butuh referensi FK

export const authUser = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  isSuperAdmin: boolean('is_super_admin').default(false).notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const yayasanRelations = relations(yayasan, ({ many }) => ({
  units: many(unit),
}))

export const unitRelations = relations(unit, ({ one, many }) => ({
  yayasan: one(yayasan, {
    fields: [unit.yayasanId],
    references: [yayasan.id],
  }),
  userUnits: many(userUnit),
}))

export const userUnitRelations = relations(userUnit, ({ one }) => ({
  unit: one(unit, {
    fields: [userUnit.unitId],
    references: [unit.id],
  }),
  user: one(authUser, {
    fields: [userUnit.userId],
    references: [authUser.id],
  }),
}))

export const authUserRelations = relations(authUser, ({ many }) => ({
  userUnits: many(userUnit),
}))
