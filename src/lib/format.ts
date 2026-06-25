export function rp(n: number | null | undefined) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)
}

export const BULAN_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export const BULAN = BULAN_NAMES

export function statusTagihanBadge(status: string) {
  const m: Record<string, string> = {
    draft: 'bg-gray-100 border-gray-600 text-gray-600',
    terbit: 'bg-amber-100 border-amber-800 text-amber-800',
    cicil: 'bg-yellow-100 border-yellow-800 text-yellow-800',
    lunas: 'bg-emerald-100 border-emerald-800 text-emerald-800',
    dibebaskan: 'bg-blue-100 border-blue-800 text-blue-800',
  }
  return `text-[10px] px-2 py-0.5 rounded border font-heading font-bold ${m[status] || ''}`
}
