import { eq } from 'drizzle-orm'
import { db } from '#/db/index.server'
import { siswaBeasiswa } from '#/db/schema/index'

export async function fetchBeasiswaMapForUnit(unitId: string) {
  const items = await db.query.siswaBeasiswa.findMany({
    where: eq(siswaBeasiswa.unitId, unitId),
    with: { beasiswa: true },
    orderBy: (sb, { desc }) => [desc(sb.createdAt)],
  })
  const map = new Map<string, { beasiswaId: string; nama: string; tipe: string; besaran: number; jenisPotongan: string }>()
  for (const item of items) {
    if (!map.has(item.siswaId)) {
      const b = item.beasiswa!
      map.set(item.siswaId, {
        beasiswaId: b.id,
        nama: b.nama,
        tipe: b.tipe,
        jenisPotongan: b.jenisPotongan ?? 'nominal',
        besaran: b.besaranPotongan ?? 0,
      })
    }
  }
  return map
}

export async function calculateBeasiswaDiscount(siswaId: string, nominal: number, unitId: string): Promise<{
  beasiswaId: string | null
  diskon: number
}> {
  const map = await fetchBeasiswaMapForUnit(unitId)
  const entry = map.get(siswaId)
  if (!entry) return { beasiswaId: null, diskon: 0 }

  if (entry.tipe === 'gratis') return { beasiswaId: entry.beasiswaId, diskon: nominal }

  let diskon = 0
  if (entry.jenisPotongan === 'persen') {
    diskon = Math.round(nominal * entry.besaran / 100)
  } else {
    diskon = entry.besaran
  }

  if (diskon > nominal) diskon = nominal
  return { beasiswaId: entry.beasiswaId, diskon }
}
