import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { useUnit } from '#/lib/unit-context'
import { getSiswaList } from '#/server/siswa'
import { getRingkasanSPP } from '#/server/spp'
import { getRingkasanKas } from '#/server/keuangan'
import { useState, useEffect } from 'react'
import {
  Users,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  CreditCard,
} from 'lucide-react'

export const Route = createFileRoute('/_dashboard/dashboard')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'admin_yayasan' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: DashboardPage,
})

function formatRupiah(n: number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n) }

function DashboardPage() {
  const { activeUnit, yayasanFilterUnitId } = useUnit()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const today = new Date()
    const currentBulan = today.getMonth() + 1
    const currentTahun = today.getFullYear()

    Promise.all([
      getSiswaList({ data: { unitId: yayasanFilterUnitId, pageSize: 1 } }),
      getRingkasanSPP({ data: { unitId: yayasanFilterUnitId, bulan: currentBulan, tahun: currentTahun } }),
      getRingkasanKas({ data: { unitId: yayasanFilterUnitId } }),
    ])
      .then(([siswaData, sppData, kasData]) => {
        setStats({
          totalSiswa: siswaData.total,
          sppBelumBayarCount: sppData.terbit + sppData.cicil,
          sppTerkumpul: sppData.totalTerkumpul,
          saldoKas: kasData.saldo,
          kasPemasukan: kasData.totalPemasukan,
          kasPengeluaran: kasData.totalPengeluaran,
        })
      })
      .catch((err) => { console.error('Gagal mengambil data dashboard:', err) })
      .finally(() => setLoading(false))
  }, [yayasanFilterUnitId])

  return (
    <div className="space-y-6">
      <div className="nb-page-header flex items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="nb-page-title">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">Ringkasan data yayasan dan unit sekolah.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => <div key={i} className="h-28 bg-muted animate-pulse border-2 border-nb-ink rounded" />)}
        </div>
      ) : !stats ? (
        <div className="nb-card text-center py-12">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Gagal memuat data dashboard</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="nb-stat-card bg-[#FFFDF5]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 border-2 border-blue-800 rounded shadow-sm"><Users className="w-5 h-5 text-blue-800" /></div>
                <div>
                  <span className="text-sm font-heading font-semibold text-muted-foreground uppercase">Total Siswa</span>
                  <h3 className="font-heading font-bold text-xl mt-0.5">{stats.totalSiswa}</h3>
                </div>
              </div>
            </div>
            <div className="nb-stat-card bg-[#FFFDF5]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 border-2 border-rose-800 rounded shadow-sm"><CreditCard className="w-5 h-5 text-rose-800" /></div>
                <div>
                  <span className="text-sm font-heading font-semibold text-muted-foreground uppercase">SPP Belum Lunas</span>
                  <h3 className="font-heading font-bold text-xl mt-0.5">{stats.sppBelumBayarCount}</h3>
                </div>
              </div>
            </div>
            <div className="nb-stat-card bg-[#FFFDF5]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 border-2 border-emerald-800 rounded shadow-sm"><DollarSign className="w-5 h-5 text-emerald-800" /></div>
                <div>
                  <span className="text-sm font-heading font-semibold text-muted-foreground uppercase">SPP Terkumpul</span>
                  <h3 className="font-heading font-bold text-xl mt-0.5">{formatRupiah(stats.sppTerkumpul)}</h3>
                </div>
              </div>
            </div>
            <div className="nb-stat-card bg-[#FFFDF5]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 border-2 border-amber-800 rounded shadow-sm"><TrendingUp className="w-5 h-5 text-amber-800" /></div>
                <div>
                  <span className="text-sm font-heading font-semibold text-muted-foreground uppercase">Saldo Kas</span>
                  <h3 className="font-heading font-bold text-xl mt-0.5">{formatRupiah(stats.saldoKas)}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Aliran Kas */}
          <div className="nb-card">
            <h3 className="font-heading font-bold text-sm uppercase mb-3">Rincian Aliran Kas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border-2 border-emerald-800 rounded">
                <ArrowUpRight className="w-8 h-8 text-emerald-600" />
                <div>
                  <span className="text-sm font-heading font-semibold text-muted-foreground uppercase">Pemasukan</span>
                  <p className="font-heading font-bold text-emerald-700">{formatRupiah(stats.kasPemasukan)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-rose-50 border-2 border-rose-800 rounded">
                <ArrowDownRight className="w-8 h-8 text-rose-600" />
                <div>
                  <span className="text-sm font-heading font-semibold text-muted-foreground uppercase">Pengeluaran</span>
                  <p className="font-heading font-bold text-rose-700">{formatRupiah(stats.kasPengeluaran)}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  )
}
