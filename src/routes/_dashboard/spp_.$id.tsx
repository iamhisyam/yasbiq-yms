import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { getSppDetail } from '#/server/spp'
import { getYayasanPengaturan } from '#/server/pengaturan'
import { useState, useEffect, lazy, Suspense } from 'react'
import { ArrowLeft, FileText, Eye } from 'lucide-react'
import { SppKwitansiPDF } from '#/components/spp-kwitansi-pdf'

const PDFViewer = lazy(() =>
  import('@react-pdf/renderer').then((mod) => ({ default: mod.PDFViewer })),
)

export const Route = createFileRoute('/_dashboard/spp_/$id')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'operator' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: SppDetailPage,
})

const BULAN_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function rp(n: number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n) }

function SppDetailPage() {
  const { id } = Route.useParams()
  const [data, setData] = useState<any>(null)
  const [pengaturan, setPengaturan] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'detail' | 'kwitansi'>('detail')

  useEffect(() => {
    setLoading(true); setError('')
    const timeout = setTimeout(() => { setLoading(false); setError('Memuat data terlalu lama, coba refresh halaman') }, 20000)
    Promise.all([
      getSppDetail({ data: { id } }),
      getYayasanPengaturan(),
    ])
      .then(([sp, pg]) => { setData(sp); setPengaturan(pg) })
      .catch((err) => setError(err.message))
      .finally(() => { clearTimeout(timeout); setLoading(false) })
  }, [id])

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 bg-muted animate-pulse rounded w-48" />
      <div className="h-64 bg-muted animate-pulse rounded border-2 border-nb-ink" />
    </div>
  )

  if (error) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/spp" search={{ s: undefined }} className="p-2 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h2 className="font-heading font-bold text-lg">Detail SPP</h2>
      </div>
      <div className="p-4 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm rounded">{error}</div>
    </div>
  )

  if (!data) return null

  const t = data
  const sisa = t.nominal - (t.diskon || 0) - t.sudahDibayar

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/spp" search={{ s: undefined }} className="p-2 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="font-heading font-bold text-lg">Detail SPP Siswa</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{t.siswa?.nama || '-'} — {BULAN_NAMES[t.tagihan?.bulan]} {t.tagihan?.tahun}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-card border-2 border-nb-ink rounded w-fit">
        <button onClick={() => setTab('detail')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'detail' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <Eye className="w-3.5 h-3.5 inline mr-1.5" />Detail
        </button>
        <button onClick={() => setTab('kwitansi')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'kwitansi' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <FileText className="w-3.5 h-3.5 inline mr-1.5" />Kwitansi
        </button>
      </div>

      {/* Tab: Detail */}
      {tab === 'detail' && (
        <>
          <div className="bg-card border-2 border-nb-ink rounded p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Siswa</p>
                <p className="font-heading font-bold mt-0.5">{t.siswa?.nama || '-'}</p>
                <p className="text-sm text-muted-foreground">NIS: {t.siswa?.nis || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Kelas</p>
                <p className="font-heading font-bold mt-0.5">
                  {t.siswa?.kelasRef ? `${t.siswa.kelasRef.tingkatRef?.nama ? t.siswa.kelasRef.tingkatRef.nama + ' ' : ''}${t.siswa.kelasRef.nama}` : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Periode</p>
                <p className="font-heading font-bold mt-0.5">{BULAN_NAMES[t.tagihan?.bulan]} {t.tagihan?.tahun}</p>
              </div>
              <div>
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                <p className={`mt-0.5 text-[11px] px-2 py-0.5 rounded border font-heading font-bold inline-block ${
                  t.status === 'lunas' ? 'bg-emerald-100 border-emerald-800 text-emerald-800' :
                  t.status === 'cicil' ? 'bg-yellow-100 border-yellow-800 text-yellow-800' :
                  t.status === 'dibebaskan' ? 'bg-blue-100 border-blue-800 text-blue-800' :
                  'bg-rose-100 border-rose-800 text-rose-800'
                }`}>{t.status}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border-2 border-nb-ink rounded p-3">
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Nominal SPP</p>
              <p className="text-lg font-heading font-bold mt-0.5">{rp(t.nominal)}</p>
            </div>
            <div className="bg-card border-2 border-nb-ink rounded p-3">
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Beasiswa</p>
              <p className="text-lg font-heading font-bold mt-0.5 text-blue-700">{t.diskon > 0 ? `-${rp(t.diskon)}` : 'Rp0'}</p>
              {t.beasiswa && <p className="text-sm text-muted-foreground mt-0.5">{t.beasiswa.nama}</p>}
            </div>
            <div className="bg-card border-2 border-nb-ink rounded p-3">
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Sudah Dibayar</p>
              <p className="text-lg font-heading font-bold mt-0.5 text-emerald-700">{rp(t.sudahDibayar)}</p>
            </div>
            <div className="bg-card border-2 border-nb-ink rounded p-3">
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Sisa Tagihan</p>
              <p className="text-lg font-heading font-bold mt-0.5 text-rose-700">{rp(sisa)}</p>
            </div>
          </div>

          <div className="bg-card border-2 border-nb-ink rounded">
            <div className="p-4 border-b-2 border-nb-ink">
              <h3 className="font-heading font-bold text-sm">Riwayat Pembayaran</h3>
            </div>
            {t.pembayarans?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="nb-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Metode</th>
                      <th className="hidden md:table-cell">Catatan</th>
                      <th className="text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.pembayarans.map((p: any) => (
                      <tr key={p.id}>
                        <td className="text-sm font-mono">{p.tanggalBayar}<br /><span className="text-sm text-muted-foreground">{p.createdAt ? new Date(p.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}</span></td>
                        <td className="text-sm capitalize">{p.metode}</td>
                        <td className="hidden md:table-cell text-sm text-muted-foreground">{p.catatan || '-'}</td>
                        <td className="text-right font-heading font-bold text-sm text-emerald-700">{rp(p.jumlahBayar)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <p>Belum ada pembayaran</p>
              </div>
            )}
            <div className="p-4 border-t-2 border-nb-ink bg-secondary/20 flex justify-between items-center">
              <span className="text-sm font-heading font-bold">Total Dibayar</span>
              <span className="font-heading font-bold text-emerald-700">{rp(t.sudahDibayar)}</span>
            </div>
          </div>
        </>
      )}

      {/* Tab: Kwitansi */}
      {tab === 'kwitansi' && (
        <div className="bg-card border-2 border-nb-ink rounded" style={{ height: '90dvh' }}>
          <div className="p-3 border-b-2 border-nb-ink flex items-center justify-between shrink-0">
            <h3 className="font-heading font-bold text-sm">Kuitansi Pembayaran SPP</h3>
            <button onClick={() => window.print()} className="nb-btn nb-btn-primary cursor-pointer text-sm py-1 px-3">
              Cetak
            </button>
          </div>
          <div className="flex-1 min-h-0 relative" style={{ height: 'calc(90dvh - 45px)' }}>
            <Suspense fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-heading font-bold text-muted-foreground">Loading PDF Viewer...</p>
                </div>
              </div>
            }>
              <PDFViewer width="100%" height="100%" showToolbar={true} style={{ border: 'none' }}>
                <SppKwitansiPDF data={t} pengaturan={pengaturan || undefined} />
              </PDFViewer>
            </Suspense>
          </div>
        </div>
      )}
    </div>
  )
}
