import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Load .env.local atau .env (kalau ada) — env vars dari sistem tidak di-override
config({ path: ['.env.local', '.env'] })

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error(
    'DATABASE_URL tidak ditemukan. Set di .env.local untuk development, atau di Environment Variables dashboard Render untuk production.',
  )
}

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: { url },
  verbose: true,
  strict: true,
})
