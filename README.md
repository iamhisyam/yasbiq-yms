# Foundation Management System

Sistem manajemen yayasan pendidikan — mengelola keuangan, penggajian, SPP, aset, dan pelaporan ISAK 35.

## Prerequisites

- **Node.js** >= 20
- **pnpm** — `npm install -g pnpm`
- **Docker Desktop** (untuk PostgreSQL)

## Quick Start

```bash
# 1. Clone & install dependencies
pnpm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local — generate BETTER_AUTH_SECRET:
#   openssl rand -base64 32

# 3. Start PostgreSQL
docker compose up -d

# 4. Run database migrations
#    Jalankan semua file SQL di folder drizzle/ secara berurutan:
psql "$DATABASE_URL" < drizzle/0000_flawless_black_widow.sql
#    ... (ulangi untuk setiap file migration)
#    Atau gunakan drizzle-kit untuk migration yang terintegrasi:
pnpm db:migrate

# 5. (Opsional) Seed data dummy
pnpm db:seed

# 6. Start development server
pnpm dev
```

Buka **http://localhost:3000**.

## Database Commands

| Perintah | Deskripsi |
|---|---|
| `pnpm db:migrate` | Jalankan migration via Drizzle Kit |
| `pnpm db:generate` | Generate migration dari perubahan schema |
| `pnpm db:push` | Push schema langsung ke DB (tanpa migration file) |
| `pnpm db:pull` | Pull schema dari DB ke file |
| `pnpm db:studio` | Buka Drizzle Studio (GUI database) |
| `pnpm db:seed` | Seed data dummy |

### Manual Migration

Migration berupa file `.sql` di folder `drizzle/`. Untuk migration manual (enum changes, data migration), jalankan langsung:

```bash
psql "$DATABASE_URL" < drizzle/0035_thp_payroll.sql
```

## Akun Default (Setelah Seed)

Setelah `pnpm db:seed`, akun yang tersedia:

| Email | Password | Role |
|---|---|---|
| `admin@annahl.sch.id` | `admin123` | Super Admin |

Seed menghasilkan data 12 bulan penggajian, SPP, transaksi kas, aset tetap, dan jurnal akuntansi untuk 2 unit (TK + SD).

## Production Build

```bash
pnpm build
node dist/server/index.mjs
```

## Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (React + Vite + Nitro)
- **Database**: PostgreSQL 17 via Drizzle ORM
- **Auth**: Better Auth
- **Styling**: Tailwind CSS v4
- **PDF**: @react-pdf/renderer
- **UI Components**: Shadcn/ui + Radix

## Struktur Proyek

```
src/
├── components/        # Komponen UI reusable
├── db/
│   ├── schema/        # Drizzle schema definitions
│   └── seed.ts        # Data seeder
├── lib/
│   ├── auth.ts        # Better Auth config
│   └── unit-guard.server.ts  # RBAC
├── routes/            # TanStack Router — file-based routing
│   └── _dashboard/    # Halaman utama (login required)
└── server/            # Server functions (createServerFn)
```

## Pelaporan ISAK 35

Tersedia laporan keuangan sesuai standar ISAK 35:
- **Neraca** — Aset, Liabilitas, Aset Neto (tahun ini vs tahun lalu)
- **Penghasilan Komprehensif** — Format A (tanpa pembatasan / dengan pembatasan)
- **Perubahan Aset Neto** — Saldo awal, surplus, reklasifikasi, saldo akhir
