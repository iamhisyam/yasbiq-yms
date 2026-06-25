import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { getSiswaDetail, getSiswaSppList, getSiswaTagihanList, createWali, deleteWali } from '#/server/siswa'
import { bayarTagihan } from '#/server/tagihan'
import { getBankAccountList } from '#/server/keuangan'
import { useUnit } from '#/lib/unit-context'
import { useState, useEffect } from 'react'
import { ArrowLeft, User, BookOpen, Phone, Mail, MapPin, Calendar, Hash,
  CreditCard, Receipt, GraduationCap, BadgeCheck, Users, Eye, DollarSign, Plus, X, Trash2, AlertCircle, TrendingUp,
} from 'lucide-react'
import { ActionMenu } from '#/components/ui/action-menu'
import { Combobox } from '#/components/ui/combobox'

export const Route = createFileRoute('/_dashboard/siswa_/$id')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'operator' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },
  component: SiswaDetailPage,
})

const STATUS_LABEL: Record<string, string> = {
  aktif: 'Aktif', nonaktif: 'Nonaktif', lulus: 'Lulus', pindah: 'Pindah', dikeluarkan: 'Dikeluarkan',
}
const STATUS_CLS: Record<string, string> = {
  aktif: 'bg-emerald-100 border-emerald-800 text-emerald-800',
  nonaktif: 'bg-rose-100 border-rose-800 text-rose-800',
  lulus: 'bg-blue-100 border-blue-800 text-blue-800',
  pindah: 'bg-amber-100 border-amber-800 text-amber-800',
  dikeluarkan: 'bg-rose-100 border-rose-800 text-rose-800',
}

const BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function rp(n: number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n) }

const statusBadge = (status: string) => {
  const m: Record<string, string> = {
    terbit: 'bg-amber-100 border-amber-800 text-amber-800',
    cicil: 'bg-yellow-100 border-yellow-800 text-yellow-800',
    lunas: 'bg-emerald-100 border-emerald-800 text-emerald-800',
    dibebaskan: 'bg-blue-100 border-blue-800 text-blue-800',
  }
  return `text-sm px-2 py-0.5 rounded border font-heading font-bold ${m[status] || 'bg-gray-100 border-gray-600 text-gray-600'}`
}

const METODE_OPTS = [
  { value: 'tunai', label: 'Tunai' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' },
  { value: 'lainnya', label: 'Lainnya' },
]

function SiswaDetailPage() {
  const { id } = Route.useParams()
  const { activeUnit } = useUnit()
  const canManage = activeUnit?.role === 'operator' || activeUnit?.role === 'admin_yayasan' || activeUnit?.role === 'super_admin'
  const [data, setData] = useState<any>(null)
  const [spp, setSpp] = useState<any[]>([])
  const [tagihan, setTagihan] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'profil' | 'spp' | 'tagihan'>('profil')
  const [waliModal, setWaliModal] = useState(false)
  const [waliForm, setWaliForm] = useState({ nama: '', hubungan: 'ayah', telepon: '', email: '', pekerjaan: '', alamat: '' })
  const [waliError, setWaliError] = useState('')
  const [waliSaving, setWaliSaving] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Payment modal
  const [bayarModal, setBayarModal] = useState(false)
  const [selectedTagihan, setSelectedTagihan] = useState<any>(null)
  const [bayarForm, setBayarForm] = useState({ jumlahBayar: 0, tanggalBayar: new Date().toISOString().split('T')[0], metode: 'tunai', catatan: '', bankAccountId: '' })
  const [bayarError, setBayarError] = useState('')
  const [bayarSuccess, setBayarSuccess] = useState('')
  const [bayarSaving, setBayarSaving] = useState(false)
  const [bankAccountList, setBankAccountList] = useState<any[]>([])

  useEffect(() => {
    setLoading(true); setError('')
    const timeout = setTimeout(() => { setLoading(false); setError('Memuat data terlalu lama, coba refresh halaman') }, 20000)
    Promise.all([
      getSiswaDetail({ data: { id } }),
      getSiswaSppList({ data: { siswaId: id } }),
      getSiswaTagihanList({ data: { siswaId: id } }),
    ])
      .then(([d, sp, tg]) => { setData(d); setSpp(sp); setTagihan(tg) })
      .catch((err) => setError(err.message))
      .finally(() => { clearTimeout(timeout); setLoading(false) })
  }, [id, refreshKey])

  useEffect(() => {
    if (activeUnit?.id) getBankAccountList({ data: { unitId: activeUnit.id } }).then(setBankAccountList).catch(console.error)
  }, [activeUnit?.id])

  const openBayar = (item: any) => {
    const sisa = item.nominal - (item.diskon || 0) - item.sudahDibayar
    if (sisa <= 0) return
    setSelectedTagihan(item); setBayarError(''); setBayarSuccess('')
    setBayarForm({ jumlahBayar: sisa, tanggalBayar: new Date().toISOString().split('T')[0], metode: 'tunai', catatan: '', bankAccountId: '' })
    setBayarModal(true)
  }

  const handleBayarSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTagihan || bayarForm.jumlahBayar <= 0) { setBayarError('Jumlah bayar harus positif'); return }
    const sisa = selectedTagihan.nominal - (selectedTagihan.diskon || 0) - selectedTagihan.sudahDibayar
    if (bayarForm.jumlahBayar > sisa) { setBayarError(`Maksimal Rp${sisa.toLocaleString('id-ID')}`); return }
    setBayarSaving(true); setBayarError(''); setBayarSuccess('')
    try {
      await bayarTagihan({ data: { tagihanSiswaId: selectedTagihan.id, jumlahBayar: bayarForm.jumlahBayar, tanggalBayar: bayarForm.tanggalBayar, metode: bayarForm.metode as any, catatan: bayarForm.catatan || undefined, bankAccountId: bayarForm.bankAccountId || undefined } })
      setBayarSuccess('Pembayaran berhasil dicatat!')
      setTimeout(() => { setBayarModal(false); setSelectedTagihan(null); setRefreshKey(k => k + 1) }, 1000)
    } catch (err: any) { setBayarError(err.message) } finally { setBayarSaving(false) }
  }

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 bg-muted animate-pulse rounded w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted animate-pulse rounded border-2 border-nb-ink" />)}
      </div>
      <div className="h-64 bg-muted animate-pulse rounded border-2 border-nb-ink" />
    </div>
  )

  if (error) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/siswa" className="p-2 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"><ArrowLeft className="w-4 h-4" /></Link>
        <h2 className="font-heading font-bold text-lg">Detail Siswa</h2>
      </div>
      <div className="p-4 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm rounded">{error}</div>
    </div>
  )

  if (!data) return null

  const s = data
  const totalSppBelum = spp.filter((t: any) => t.status === 'terbit').length
  const totalSppLunas = spp.filter((t: any) => t.status === 'lunas').length
  const totalSppCicil = spp.filter((t: any) => t.status === 'cicil').length
  const totalTagihanBelum = tagihan.filter((t: any) => t.status === 'terbit').length
  const totalSppSisa = spp.reduce((s: number, t: any) => s + Math.max(t.nominal - (t.diskon || 0) - t.sudahDibayar, 0), 0)
  const totalTagihanSisa = tagihan.reduce((s: number, t: any) => s + Math.max(t.nominal - (t.diskon || 0) - t.sudahDibayar, 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/siswa" className="p-2 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <h2 className="font-heading font-bold text-lg">{s.nama}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">NIS: {s.nis || '-'} — {s.kelasRef?.nama || '-'}</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border-2 border-nb-ink rounded p-3">
          <div className="flex items-center gap-2 mb-1"><CreditCard className="w-4 h-4 text-emerald-600" /><span className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">SPP Lunas</span></div>
          <p className="text-lg font-heading font-bold text-emerald-700">{totalSppLunas}</p>
        </div>
        <div className="bg-card border-2 border-nb-ink rounded p-3">
          <div className="flex items-center gap-2 mb-1"><CreditCard className="w-4 h-4 text-yellow-600" /><span className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">SPP Cicil</span></div>
          <p className="text-lg font-heading font-bold text-yellow-700">{totalSppCicil}</p>
        </div>
        <div className="bg-card border-2 border-nb-ink rounded p-3">
          <div className="flex items-center gap-2 mb-1"><CreditCard className="w-4 h-4 text-amber-600" /><span className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">SPP Belum Dibayar</span></div>
          <p className="text-lg font-heading font-bold text-amber-700">{rp(totalSppSisa)}</p>
          <p className="text-sm text-muted-foreground">{totalSppBelum} tagihan terbit</p>
        </div>
        <div className="bg-card border-2 border-nb-ink rounded p-3">
          <div className="flex items-center gap-2 mb-1"><Receipt className="w-4 h-4 text-amber-600" /><span className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Tagihan Lainnya</span></div>
          <p className="text-lg font-heading font-bold text-amber-700">{rp(totalTagihanSisa)}</p>
          <p className="text-sm text-muted-foreground">{totalTagihanBelum} tagihan terbit</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-card border-2 border-nb-ink rounded w-fit">
        <button onClick={() => setTab('profil')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'profil' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <User className="w-3.5 h-3.5 inline mr-1.5" />Profil
        </button>
        <button onClick={() => setTab('spp')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'spp' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <CreditCard className="w-3.5 h-3.5 inline mr-1.5" />SPP ({spp.length})
        </button>
        <button onClick={() => setTab('tagihan')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'tagihan' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <Receipt className="w-3.5 h-3.5 inline mr-1.5" />Tagihan Lainnya ({tagihan.length})
        </button>
      </div>

      {/* Tab: Profil */}
      {tab === 'profil' && (
        <>
          {/* Identitas Siswa */}
          <div className="bg-card border-2 border-nb-ink rounded p-4">
            <h3 className="font-heading font-bold text-sm mb-3 flex items-center gap-2"><User className="w-4 h-4" /> Identitas Siswa</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Nama Lengkap</p>
                <p className="font-heading font-bold mt-0.5">{s.nama}</p>
              </div>
              <div>
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">NIS</p>
                <p className="font-heading font-bold mt-0.5">{s.nis || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                <p className={`mt-0.5 text-[11px] px-2 py-0.5 rounded border font-heading font-bold inline-block ${STATUS_CLS[s.status] || ''}`}>{STATUS_LABEL[s.status] || s.status}</p>
              </div>
              <div>
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Jenis Kelamin</p>
                <p className="mt-0.5">{s.jenisKelamin === 'L' ? 'Laki-laki' : s.jenisKelamin === 'P' ? 'Perempuan' : '-'}</p>
              </div>
              <div>
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Tanggal Lahir</p>
                <p className="mt-0.5">{s.tanggalLahir || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Tahun Masuk</p>
                <p className="mt-0.5">{s.tahunMasuk || '-'}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Alamat</p>
              <p className="mt-0.5 text-sm">{s.alamat || '-'}</p>
            </div>
            {s.keterangan && <p className="mt-3 text-sm text-muted-foreground">Catatan: {s.keterangan}</p>}
          </div>

          {/* Kelas */}
          <div className="bg-card border-2 border-nb-ink rounded p-4">
            <h3 className="font-heading font-bold text-sm mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Kelas</h3>
            {s.kelasRef ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Kelas</p>
                  <p className="font-heading font-bold mt-0.5">{s.kelasRef.nama}</p>
                </div>
                <div>
                  <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Tingkat</p>
                  <p className="mt-0.5">{s.kelasRef.tingkatRef?.nama || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Wali Kelas</p>
                  <p className="mt-0.5">{s.kelasRef.waliKelas?.nama || '-'}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Belum ditempatkan di kelas</p>
            )}
          </div>

          {/* Wali / Orang Tua */}
          <div className="bg-card border-2 border-nb-ink rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Wali / Orang Tua</h3>
              <button onClick={() => { setWaliModal(true); setWaliForm({ nama: '', hubungan: 'ayah', telepon: '', email: '', pekerjaan: '', alamat: '' }); setWaliError('') }} className="text-sm font-heading font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer">
                <Plus className="w-3 h-3" /> Tambah
              </button>
            </div>
            {s.walis && s.walis.length > 0 ? (
              <div className="space-y-3">
                {s.walis.map((w: any) => (
                  <div key={w.id} className="p-3 bg-secondary/20 border-2 border-nb-ink rounded relative">
                    <button
                      onClick={() => { if (confirm(`Hapus wali "${w.nama}"?`)) deleteWali({ data: { id: w.id } }).then(() => setRefreshKey(k => k + 1)).catch(console.error) }}
                      className="absolute top-2 right-2 p-1 hover:bg-rose-100 rounded cursor-pointer" title="Hapus wali"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm pr-8">
                      <div>
                        <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Nama</p>
                        <p className="font-heading font-bold mt-0.5">{w.nama} {w.isPrimary && <span className="text-sm text-primary">(Utama)</span>}</p>
                      </div>
                      <div>
                        <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Hubungan</p>
                        <p className="mt-0.5 capitalize">{w.hubungan || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Telepon</p>
                        <p className="mt-0.5">{w.telepon || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Pekerjaan</p>
                        <p className="mt-0.5">{w.pekerjaan || '-'}</p>
                      </div>
                    </div>
                    {w.alamat && <p className="mt-2 text-sm text-muted-foreground">Alamat: {w.alamat}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <p>Belum ada data wali</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab: SPP */}
      {tab === 'spp' && (
        <div className="bg-card border-2 border-nb-ink rounded">
          <div className="p-4 border-b-2 border-nb-ink">
            <h3 className="font-heading font-bold text-sm">Riwayat SPP</h3>
          </div>
          {spp.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <CreditCard className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>Belum ada tagihan SPP</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="nb-table">
                <thead>
                  <tr>
                    <th>Periode</th>
                    <th className="text-right">Nominal</th>
                    <th className="hidden md:table-cell text-right">Diskon</th>
                    <th className="text-right">Dibayar</th>
                    <th className="text-right">Sisa</th>
                    <th>Status</th>
                    <th className="w-16 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {spp.map((t: any) => {
                    const sisa = t.nominal - (t.diskon || 0) - t.sudahDibayar
                    return (
                      <tr key={t.id}>
                        <td className="font-heading font-semibold text-sm">{BULAN[t.tagihan?.bulan]} {t.tagihan?.tahun}</td>
                        <td className="text-right text-sm">{rp(t.nominal)}</td>
                        <td className="hidden md:table-cell text-right text-sm text-blue-600">{t.diskon > 0 ? rp(t.diskon) : '-'}</td>
                        <td className="text-right text-sm text-emerald-700">{rp(t.sudahDibayar)}</td>
                        <td className="text-right text-sm text-rose-700">{rp(sisa)}</td>
                        <td><span className={statusBadge(t.status)}>{t.status}</span></td>
                        <td>
                          <ActionMenu items={[
                            { label: 'Detail', icon: <Eye className="w-3.5 h-3.5" />, onClick: () => window.location.href = `/spp/${t.id}` },
                            ...(canManage && sisa > 0 && t.status !== 'dibebaskan' ? [{ label: 'Bayar', icon: <DollarSign className="w-3.5 h-3.5 text-emerald-700" />, onClick: () => openBayar(t), variant: 'success' as const }] : []),
                          ]} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Tagihan Lainnya */}
      {tab === 'tagihan' && (
        <div className="bg-card border-2 border-nb-ink rounded">
          <div className="p-4 border-b-2 border-nb-ink">
            <h3 className="font-heading font-bold text-sm">Riwayat Tagihan Lainnya</h3>
          </div>
          {tagihan.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Receipt className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>Belum ada tagihan lainnya</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="nb-table">
                <thead>
                  <tr>
                    <th>Tagihan</th>
                    <th className="text-right">Nominal</th>
                    <th className="hidden md:table-cell text-right">Diskon</th>
                    <th className="text-right">Dibayar</th>
                    <th className="text-right">Sisa</th>
                    <th>Status</th>
                    <th className="w-16 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {tagihan.map((t: any) => {
                    const sisa = t.nominal - (t.diskon || 0) - t.sudahDibayar
                    return (
                      <tr key={t.id}>
                        <td className="font-heading font-bold text-sm">{t.tagihan?.judul || t.tagihan?.tahunAjaran || '-'}</td>
                        <td className="text-right text-sm">{rp(t.nominal)}</td>
                        <td className="hidden md:table-cell text-right text-sm text-blue-600">{t.diskon > 0 ? rp(t.diskon) : '-'}</td>
                        <td className="text-right text-sm text-emerald-700">{rp(t.sudahDibayar)}</td>
                        <td className="text-right text-sm text-rose-700">{rp(sisa)}</td>
                        <td><span className={statusBadge(t.status)}>{t.status}</span></td>
                        <td>
                          <ActionMenu items={[
                            ...(canManage && sisa > 0 && t.status !== 'dibebaskan' ? [{ label: 'Bayar', icon: <DollarSign className="w-3.5 h-3.5 text-emerald-700" />, onClick: () => openBayar(t), variant: 'success' as const }] : []),
                          ]} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: BAYAR */}
      {bayarModal && selectedTagihan && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-md flex flex-col max-h-[85dvh]">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Catat Pembayaran</h3>
              <button onClick={() => setBayarModal(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleBayarSubmit} className="p-4 flex-1 min-h-0 overflow-y-auto space-y-3">
              {bayarError && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{bayarError}</div>}
              {bayarSuccess && <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border-2 border-emerald-700 rounded p-2.5"><TrendingUp className="w-4 h-4 shrink-0" />{bayarSuccess}</div>}
              <div className="bg-secondary/30 border-2 border-nb-ink rounded p-3 text-sm space-y-1">
                <div>Siswa: <span className="font-heading font-bold">{selectedTagihan.siswa?.nama}</span></div>
                <div>Tagihan: <span className="font-heading font-bold">{selectedTagihan.tagihan?.judul || selectedTagihan.tagihan?.tahunAjaran || selectedTagihan.tagihan ? `${BULAN[selectedTagihan.tagihan.bulan]} ${selectedTagihan.tagihan.tahun}` : '-'}</span></div>
                <div>Nominal: <span className="font-heading font-bold">{rp(selectedTagihan.nominal)}</span></div>
                {selectedTagihan.diskon > 0 && <div>Diskon: <span className="text-blue-700 font-heading font-bold">-{rp(selectedTagihan.diskon)}</span></div>}
                <div>Sisa: <span className="text-rose-700 font-heading font-bold">{rp(selectedTagihan.nominal - (selectedTagihan.diskon || 0) - selectedTagihan.sudahDibayar)}</span></div>
              </div>

              {selectedTagihan.pembayarans?.length > 0 && (
                <div>
                  <p className="text-sm font-heading font-bold uppercase tracking-wider mb-1.5">Riwayat Pembayaran</p>
                  <div className="space-y-1">
                    {selectedTagihan.pembayarans.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between bg-secondary/20 border border-nb-ink/30 rounded px-3 py-2 text-sm">
                        <span className="text-sm">{p.tanggalBayar} {p.createdAt ? new Date(p.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''} — {p.metode}</span>
                        <span className="font-heading font-bold text-emerald-700">{rp(p.jumlahBayar)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t-2 border-nb-ink/20 pt-3">
                <p className="text-sm font-heading font-bold uppercase tracking-wider mb-2">Pembayaran Baru</p>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Jumlah Bayar (Rp)</label>
                <input type="number" required min={1} max={selectedTagihan.nominal - (selectedTagihan.diskon || 0) - selectedTagihan.sudahDibayar} value={bayarForm.jumlahBayar} onChange={(e) => setBayarForm({ ...bayarForm, jumlahBayar: Number(e.target.value) || 0 })} className="nb-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tanggal</label>
                  <input type="date" required value={bayarForm.tanggalBayar} onChange={(e) => setBayarForm({ ...bayarForm, tanggalBayar: e.target.value })} className="nb-input" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Metode</label>
                  <Combobox options={METODE_OPTS} value={bayarForm.metode} onValueChange={(v) => setBayarForm({ ...bayarForm, metode: v })} className="w-full" triggerClassName="nb-input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Rekening Bank <span className="font-normal normal-case text-muted-foreground">(opsional)</span></label>
                <Combobox
                  options={[{ value: '', label: 'Tidak pilih bank' }, ...bankAccountList.filter((b: any) => b.aktif).map((b: any) => ({ value: b.id, label: `${b.namaBank} — ${b.atasNama} (${b.nomorRekening})` }))]}
                  value={bayarForm.bankAccountId}
                  onValueChange={(v) => setBayarForm({ ...bayarForm, bankAccountId: v })}
                  placeholder="Pilih bank"
                  searchPlaceholder="Cari bank..."
                  className="w-full"
                  triggerClassName="nb-input text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Catatan</label>
                <input value={bayarForm.catatan} onChange={(e) => setBayarForm({ ...bayarForm, catatan: e.target.value })} className="nb-input" placeholder="Opsional" />
              </div>
            </form>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex gap-3 justify-end bg-card rounded-b-lg">
              <button type="button" onClick={() => setBayarModal(false)} className="nb-btn nb-btn-secondary cursor-pointer">Batal</button>
              <button type="submit" disabled={bayarSaving} className="nb-btn nb-btn-primary cursor-pointer">{bayarSaving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Wali Modal */}
      {waliModal && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-md flex flex-col">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Tambah Wali / Orang Tua</h3>
              <button onClick={() => setWaliModal(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {waliError && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{waliError}</div>}
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama Lengkap</label>
                <input value={waliForm.nama} onChange={(e) => setWaliForm({ ...waliForm, nama: e.target.value })} className="nb-input" placeholder="Nama orang tua/wali" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Hubungan</label>
                  <Combobox
                    options={[{value: 'ayah', label: 'Ayah'}, {value: 'ibu', label: 'Ibu'}, {value: 'wali', label: 'Wali'}, {value: 'kakek', label: 'Kakek'}, {value: 'nenek', label: 'Nenek'}, {value: 'lainnya', label: 'Lainnya'}]}
                    value={waliForm.hubungan}
                    onValueChange={(v) => setWaliForm({ ...waliForm, hubungan: v })}
                    placeholder="Pilih..."
                    triggerClassName="nb-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Telepon</label>
                  <input value={waliForm.telepon} onChange={(e) => setWaliForm({ ...waliForm, telepon: e.target.value })} className="nb-input" placeholder="No. telepon" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Email</label>
                <input type="email" value={waliForm.email} onChange={(e) => setWaliForm({ ...waliForm, email: e.target.value })} className="nb-input" placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Pekerjaan</label>
                <input value={waliForm.pekerjaan} onChange={(e) => setWaliForm({ ...waliForm, pekerjaan: e.target.value })} className="nb-input" placeholder="Pekerjaan" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Alamat</label>
                <textarea value={waliForm.alamat} onChange={(e) => setWaliForm({ ...waliForm, alamat: e.target.value })} className="nb-input" rows={2} placeholder="Alamat (jika berbeda dengan siswa)" />
              </div>
            </div>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex gap-3 justify-end bg-card rounded-b-lg">
              <button onClick={() => setWaliModal(false)} className="nb-btn nb-btn-secondary cursor-pointer">Batal</button>
              <button
                onClick={async () => {
                  if (!waliForm.nama.trim()) { setWaliError('Nama wajib diisi'); return }
                  setWaliSaving(true); setWaliError('')
                  try {
                    await createWali({ data: { siswaId: id, ...waliForm, hubungan: waliForm.hubungan as any, telepon: waliForm.telepon || undefined, email: waliForm.email || undefined, pekerjaan: waliForm.pekerjaan || undefined, alamat: waliForm.alamat || undefined } })
                    setWaliModal(false); setRefreshKey(k => k + 1)
                  } catch (err: any) { setWaliError(err.message) } finally { setWaliSaving(false) }
                }}
                disabled={waliSaving}
                className="nb-btn nb-btn-primary cursor-pointer"
              >
                {waliSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
