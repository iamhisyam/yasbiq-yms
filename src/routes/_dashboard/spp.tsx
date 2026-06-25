import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { useUnit } from '#/lib/unit-context'
import {
  getSppTagihanList, generateSPP, deleteSppBulan, checkSppSettingExists,
  getSppSettingList, createSppSetting, updateSppSetting, deleteSppSetting,
  getRingkasanSPP, getLaporanByKelas, getLaporanSummary, getLaporanDetailSiswa,
} from '#/server/spp'
import { bayarTagihan } from '#/server/tagihan'
import { getYayasanPengaturan } from '#/server/pengaturan'
import { getBankAccountList } from '#/server/keuangan'
import { getTahunAjaranList } from '#/server/tahun-ajaran'
import { getTingkatOptions } from '#/server/kelas'
import { useEffect, useState, lazy, Suspense } from 'react'
import {
  Search, CreditCard, DollarSign, AlertCircle, X, FileSpreadsheet,
  ChevronLeft, ChevronRight, TrendingUp, Settings, BarChart3, Plus,
  Trash2, Pencil, Wallet, Users, CheckCircle, Clock, Ban, Eye, FileText,
} from 'lucide-react'
import { Combobox } from '#/components/ui/combobox'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { ActionMenu } from '#/components/ui/action-menu'
import { SppLaporanPerKelasPDF, SppLaporanSummaryPDF, SppLaporanDetailSiswaPDF } from '#/components/spp-laporan-pdf'

const PDFViewer = lazy(() =>
  import('@react-pdf/renderer').then((mod) => ({ default: mod.PDFViewer })),
)

export const Route = createFileRoute('/_dashboard/spp')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'operator' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  validateSearch: (search: Record<string, unknown>) => ({
    s: search.s as string | undefined,
  }),
  component: SPPPage,
})

const BULAN_OPTS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][i + 1] }))
const STATUS_OPTS = [
  { value: '', label: 'Semua Status' },
  { value: 'terbit', label: 'Terbit' },
  { value: 'cicil', label: 'Dicicil' },
  { value: 'lunas', label: 'Lunas' },
  { value: 'dibebaskan', label: 'Dibebaskan' },
]
const METODE_OPTS = [
  { value: 'tunai', label: 'Tunai' },
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'qris', label: 'QRIS' },
  { value: 'lainnya', label: 'Lainnya' },
]

function rp(n: number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n) }
function bulanNama(b: number) { return BULAN_OPTS.find(x => x.value === String(b))?.label ?? '' }

function SPPPage() {
  const { activeUnit } = useUnit()
  const unitId = activeUnit?.id
  const userRole = activeUnit?.role
  const canManage = userRole === 'admin_yayasan' || userRole === 'super_admin'
  if (!unitId) return null

  const [activeTab, setActiveTab] = useState<'tagihan' | 'setting' | 'ringkasan' | 'laporan'>('tagihan')

  const [tagihanList, setTagihanList] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [bulan, setBulan] = useState<number>(new Date().getMonth() + 1)
  const [tahun, setTahun] = useState<number>(new Date().getFullYear())
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 15

  const [isBayarModalOpen, setIsBayarModalOpen] = useState(false)
  const [selectedTagihan, setSelectedTagihan] = useState<any>(null)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [detailModal, setDetailModal] = useState(false)
  const [detailSs, setDetailSs] = useState<any>(null)
  const [bayarForm, setBayarForm] = useState({ jumlahBayar: 0, tanggalBayar: new Date().toISOString().split('T')[0], metode: 'tunai' as any, catatan: '', bankAccountId: '' })
  const [bankAccountList, setBankAccountList] = useState<any[]>([])
  const [generateForm, setGenerateForm] = useState({ bulan: new Date().getMonth() + 1, tahun: new Date().getFullYear(), dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 10).toISOString().split('T')[0] })
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [settingList, setSettingList] = useState<any[]>([])
  const [settingLoading, setSettingLoading] = useState(true)
  const [settingModal, setSettingModal] = useState(false)
  const [editSetting, setEditSetting] = useState<any>(null)
  const [settingForm, setSettingForm] = useState({ tingkatId: '', nominal: 0, tahunAjaran: '', keterangan: '' })
  const [settingError, setSettingError] = useState('')
  const [settingActionLoading, setSettingActionLoading] = useState(false)
  const [confirmDeleteSetting, setConfirmDeleteSetting] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [confirmDeleteSpp, setConfirmDeleteSpp] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [hasSppSettings, setHasSppSettings] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const [taList, setTaList] = useState<any[]>([])
  const [tingkatOptions, setTingkatOptions] = useState<{ value: string; label: string }[]>([])

  const [ringkasan, setRingkasan] = useState<any>(null)
  const [ringkasanLoading, setRingkasanLoading] = useState(false)
  const [ringBulan, setRingBulan] = useState<number>(new Date().getMonth() + 1)
  const [ringTahun, setRingTahun] = useState<number>(new Date().getFullYear())

  const [laporanTab, setLaporanTab] = useState<'perkelas' | 'summary' | 'detailsiswa'>('perkelas')
  const [laporanBulan, setLaporanBulan] = useState<number>(new Date().getMonth() + 1)
  const [laporanTahun, setLaporanTahun] = useState<number>(new Date().getFullYear())
  const [laporanByKelas, setLaporanByKelas] = useState<any[]>([])
  const [laporanSummary, setLaporanSummary] = useState<any>(null)
  const [laporanDetailSiswa, setLaporanDetailSiswa] = useState<any[]>([])
  const [laporanLoading, setLaporanLoading] = useState(false)
  const [laporanError, setLaporanError] = useState('')
  const [pengaturan, setPengaturan] = useState<Record<string, string> | null>(null)

  const fetchTagihan = () => {
    if (!unitId) return
    setLoading(true)
    getSppTagihanList({
      data: { unitId, bulan: bulan || undefined, tahun: tahun || undefined, status: (status || undefined) as any, search: search || undefined, page, pageSize }
    })
      .then((res) => { setTagihanList(res.data); setTotal(res.total) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const fetchSettings = () => {
    if (!unitId) return
    setSettingLoading(true)
    getSppSettingList({ data: { unitId } }).then(setSettingList).catch(console.error).finally(() => setSettingLoading(false))
  }

  const fetchRingkasan = () => {
    if (!unitId) return
    setRingkasanLoading(true)
    getRingkasanSPP({ data: { unitId, bulan: ringBulan, tahun: ringTahun } }).then(setRingkasan).catch(console.error).finally(() => setRingkasanLoading(false))
  }

  useEffect(() => {
    if (!unitId) return
    fetchTagihan(); fetchSettings()
    getTahunAjaranList({ data: { unitId } }).then(setTaList).catch(console.error)
    getTingkatOptions({ data: { unitId } }).then((list: any[]) => {
      setTingkatOptions(list.map((t: any) => ({ value: t.id, label: t.nama })))
    }).catch(console.error)
    getYayasanPengaturan().then(setPengaturan).catch(console.error)
    getBankAccountList({ data: { unitId } }).then(setBankAccountList).catch(console.error)
  }, [unitId])

  useEffect(() => { if (unitId) fetchTagihan() }, [unitId, bulan, tahun, status, page, search])
  useEffect(() => { if (unitId) fetchRingkasan() }, [unitId, ringBulan, ringTahun])

  const fetchLaporan = () => {
    if (!unitId) return
    setLaporanLoading(true); setLaporanError('')
    Promise.all([
      getLaporanByKelas({ data: { unitId, bulan: laporanBulan, tahun: laporanTahun } }),
      getLaporanSummary({ data: { unitId, bulan: laporanBulan, tahun: laporanTahun } }),
      getLaporanDetailSiswa({ data: { unitId, bulan: laporanBulan, tahun: laporanTahun } }),
    ]).then(([byKelas, summary, detailSiswa]) => {
      setLaporanByKelas(byKelas); setLaporanSummary(summary); setLaporanDetailSiswa(detailSiswa)
    }).catch((err) => setLaporanError(err.message)).finally(() => setLaporanLoading(false))
  }

  useEffect(() => { if (unitId) fetchLaporan() }, [unitId, laporanBulan, laporanTahun])

  // Auto-open detail modal when ?s=tagihanSiswaId is present
  const searchParams = Route.useSearch()
  useEffect(() => {
    if (!searchParams.s || !tagihanList.length) return
    const found = tagihanList.find((t: any) => t.id === searchParams.s)
    if (found) { setDetailSs(found); setDetailModal(true) }
  }, [searchParams.s, tagihanList])

  const openBayarModal = (ts: any) => {
    const sisa = ts.nominal - (ts.diskon || 0) - ts.sudahDibayar
    setSelectedTagihan(ts)
    setBayarForm({ jumlahBayar: sisa, tanggalBayar: new Date().toISOString().split('T')[0], metode: 'tunai', catatan: '', bankAccountId: '' })
    setErrorMsg(''); setSuccessMsg('')
    setIsBayarModalOpen(true)
  }

  const handleBayarSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTagihan) return
    setErrorMsg(''); setSuccessMsg('')
    try {
      await bayarTagihan({
        data: { tagihanSiswaId: selectedTagihan.id, jumlahBayar: Number(bayarForm.jumlahBayar), tanggalBayar: bayarForm.tanggalBayar, metode: bayarForm.metode, catatan: bayarForm.catatan || undefined, bankAccountId: bayarForm.bankAccountId || undefined }
      })
      setSuccessMsg('Pembayaran berhasil dicatat!')
      setTimeout(() => { setIsBayarModalOpen(false); fetchTagihan() }, 1000)
    } catch (err: any) { setErrorMsg(err.message || 'Gagal menyimpan pembayaran') }
  }

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unitId) return
    setErrorMsg(''); setSuccessMsg(''); setActionLoading(true)
    try {
      const result = await generateSPP({ data: { unitId, bulan: Number(generateForm.bulan), tahun: Number(generateForm.tahun), dueDate: generateForm.dueDate || undefined } })
      let msg = `Tagihan SPP dibuat untuk ${result.generated} siswa. Lewati ${result.skipped} siswa (sudah ada).`
      if (result.missingSetting > 0) msg += ` Peringatan: ${result.missingSetting} siswa tanpa setting SPP (nominal = 0). Tambah setting di tab Setting.`
      setSuccessMsg(msg)
      setTimeout(() => { setIsGenerateModalOpen(false); fetchTagihan() }, 1500)
    } catch (err: any) { setErrorMsg(err.message || 'Gagal generate tagihan') } finally { setActionLoading(false) }
  }

  const openSettingModal = (item: any | null) => {
    setEditSetting(item); setSettingError('')
    setSettingForm(item ? { tingkatId: item.tingkatId || '', nominal: item.nominal, tahunAjaran: item.tahunAjaran, keterangan: item.keterangan || '' } : { tingkatId: '', nominal: 0, tahunAjaran: '', keterangan: '' })
    setSettingModal(true)
  }

  const handleSettingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unitId) return
    setSettingError(''); setSettingActionLoading(true)
    try {
      if (editSetting) await updateSppSetting({ data: { id: editSetting.id, ...settingForm } })
      else await createSppSetting({ data: { unitId, ...settingForm } })
      setSettingModal(false); fetchSettings()
    } catch (err: any) { setSettingError(err.message) } finally { setSettingActionLoading(false) }
  }

  const handleDeleteSpp = () => {
    setConfirmDeleteSpp({
      message: `Hapus semua tagihan SPP bulan ${bulanNama(bulan)} ${tahun}? Tindakan ini hanya bisa dilakukan jika belum ada pembayaran masuk.`,
      onConfirm: async () => {
        try {
          await deleteSppBulan({ data: { unitId: unitId!, bulan, tahun } })
          setConfirmDeleteSpp(null)
          fetchTagihan()
        } catch (err: any) { setErrorMsg(err.message) }
      },
    })
  }

  const totalPages = Math.ceil(total / pageSize) || 1

  const statusBadge = (s: string) => {
    const cls = s === 'lunas' ? 'nb-badge-success' : s === 'cicil' ? 'nb-badge-warning' : s === 'dibebaskan' ? 'nb-badge-info' : 'nb-badge-danger'
    return <span className={`nb-badge ${cls}`}>{s === 'terbit' ? 'terbit' : s}</span>
  }


  return (
    <div className="space-y-6">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">Manajemen SPP</h2>
          <p className="text-sm text-muted-foreground mt-1">Pantau tagihan, setting nominal, dan ringkasan pembayaran SPP.</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-card border-2 border-nb-ink rounded w-fit">
        <button onClick={() => setActiveTab('tagihan')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${activeTab === 'tagihan' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <CreditCard className="w-3.5 h-3.5 inline mr-1.5" />Tagihan
        </button>
        <button onClick={() => setActiveTab('setting')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${activeTab === 'setting' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <Settings className="w-3.5 h-3.5 inline mr-1.5" />Setting
        </button>
        <button onClick={() => setActiveTab('ringkasan')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${activeTab === 'ringkasan' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <BarChart3 className="w-3.5 h-3.5 inline mr-1.5" />Ringkasan
        </button>
        <button onClick={() => setActiveTab('laporan')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${activeTab === 'laporan' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <FileText className="w-3.5 h-3.5 inline mr-1.5" />Laporan
        </button>
      </div>

      {/* TAB: TAGIHAN */}
      {activeTab === 'tagihan' && (
        <>
          <div className="flex justify-end gap-3">
            <button onClick={() => {
              setErrorMsg(''); setSuccessMsg(''); setIsGenerateModalOpen(true)
              const ta = `${generateForm.tahun}/${generateForm.tahun + 1}`
              checkSppSettingExists({ data: { unitId: unitId!, tahunAjaran: ta } }).then(setHasSppSettings).catch(() => setHasSppSettings(false))
            }} className="nb-btn nb-btn-primary cursor-pointer shrink-0">
              <FileSpreadsheet className="w-4 h-4" />Generate SPP
            </button>
            {canManage && (
              <button onClick={handleDeleteSpp} className="nb-btn nb-btn-danger cursor-pointer shrink-0">
                <Trash2 className="w-4 h-4" />Hapus SPP Bulan Ini
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />{errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border-2 border-emerald-700 rounded p-2.5">
              <TrendingUp className="w-4 h-4 shrink-0" />{successMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="w-4 h-4 text-muted-foreground" /></span>
              <input type="text" placeholder="Cari siswa/NIS..." value={search} onChange={(e) => setSearch(e.target.value)} className="nb-input pl-9" />
            </div>
            <Combobox options={[{ value: '0', label: 'Semua Bulan' }, ...BULAN_OPTS]} value={String(bulan)} onValueChange={(v) => setBulan(Number(v))} placeholder="Bulan" className="w-full" triggerClassName="nb-input text-sm" />
            <Combobox options={Array.from({ length: 5 }, (_, i) => ({ value: String(new Date().getFullYear() - 2 + i), label: String(new Date().getFullYear() - 2 + i) }))} value={String(tahun)} onValueChange={(v) => setTahun(Number(v))} placeholder="Tahun" className="w-full" triggerClassName="nb-input text-sm" />
            <Combobox options={STATUS_OPTS} value={status} onValueChange={(v) => setStatus(v)} placeholder="Status" className="w-full" triggerClassName="nb-input text-sm" />
          </div>

          <div className="nb-table-wrapper bg-card">
            {loading ? (
              <div className="h-40 bg-muted animate-pulse border-2 border-nb-ink rounded" />
            ) : tagihanList.length === 0 ? (
              <div className="text-center py-12 bg-card border-2 border-nb-ink rounded">
                <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-heading font-bold text-muted-foreground">Tidak Ada Tagihan SPP</p>
                <p className="text-sm text-muted-foreground mt-1">Generate SPP bulanan terlebih dahulu.</p>
              </div>
            ) : (
              <table className="nb-table">
                <thead>
                  <tr>
                    <th>Siswa</th>
                    <th>Kelas</th>
                    <th>Bulan</th>
                    <th>Nominal</th>
                    <th className="hidden md:table-cell">Diskon</th>
                    <th>Terbayar</th>
                    <th>Status</th>
                    <th className="w-24 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {tagihanList.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <p className="font-heading font-bold text-sm">{t.siswa?.nama ?? '-'}</p>
                        <p className="text-sm text-muted-foreground">{t.siswa?.nis ?? ''}</p>
                      </td>
                      <td>
                        <span className="bg-amber-100 border border-nb-ink/20 px-1.5 py-0.5 rounded text-sm font-heading font-semibold">
                          {t.siswa?.kelasRef ? `${t.siswa.kelasRef.tingkatRef?.nama ? t.siswa.kelasRef.tingkatRef.nama + ' ' : ''}${t.siswa.kelasRef.nama}` : '-'}
                        </span>
                      </td>
                      <td className="font-heading font-semibold text-sm">{bulanNama(t.tagihan?.bulan)} {t.tagihan?.tahun}</td>
                      <td className="font-mono font-bold text-sm">{rp(t.nominal)}</td>
                      <td className="hidden md:table-cell font-mono text-sm text-muted-foreground">{t.diskon > 0 ? `-${rp(t.diskon)}` : '-'}</td>
                      <td className="font-mono font-semibold text-sm text-emerald-700">{rp(t.sudahDibayar)}</td>
                      <td>{statusBadge(t.status)}</td>
                      <td>
                        <div className="flex items-center justify-center">
                          <ActionMenu items={[
                            { label: 'Detail SPP', icon: <Eye className="w-3.5 h-3.5" />, onClick: () => window.location.href = `/spp/${t.id}` },
                            ...(t.status !== 'lunas' && t.status !== 'dibebaskan' ? [{ label: 'Bayar', icon: <DollarSign className="w-3.5 h-3.5 text-emerald-700" />, onClick: () => openBayarModal(t), variant: 'success' as const }] : []),
                          ]} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{total} tagihan</span>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="nb-btn nb-btn-secondary px-2 py-1 cursor-pointer disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm font-heading font-bold">{page}/{totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="nb-btn nb-btn-secondary px-2 py-1 cursor-pointer disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB: SETTING */}
      {activeTab === 'setting' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => openSettingModal(null)} className="nb-btn nb-btn-primary cursor-pointer shrink-0">
              <Plus className="w-4 h-4" />Tambah Setting
            </button>
          </div>

          {settingLoading ? (
            <div className="h-40 bg-muted animate-pulse border-2 border-nb-ink rounded" />
          ) : settingList.length === 0 ? (
            <div className="text-center py-12 bg-card border-2 border-nb-ink rounded">
              <Settings className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-heading font-bold text-muted-foreground">Belum Ada Setting SPP</p>
              <p className="text-sm text-muted-foreground mt-1">Tambah setting nominal per tingkat dan tahun ajaran untuk generate SPP.</p>
            </div>
          ) : (
            <div className="nb-table-wrapper bg-card">
              <table className="nb-table">
                <thead>
                  <tr>
                    <th>Tingkat</th>
                    <th>Nominal SPP</th>
                    <th>Tahun Ajaran</th>
                    <th className="hidden md:table-cell">Keterangan</th>
                    <th className="w-24 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {settingList.map((s) => (
                    <tr key={s.id}>
                      <td><span className="font-heading font-bold text-sm">{s.tingkatRef?.nama || s.tingkatId || '-'}</span></td>
                      <td className="font-mono font-bold text-sm">{rp(s.nominal)}</td>
                      <td className="text-sm">{s.tahunAjaran}</td>
                      <td className="hidden md:table-cell text-sm text-muted-foreground">{s.keterangan || '-'}</td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          {canManage && (
                            <>
                              <button onClick={() => openSettingModal(s)} className="p-1.5 hover:bg-muted-foreground/10 rounded cursor-pointer"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => setConfirmDeleteSetting({ message: `Hapus setting SPP tingkat "${s.tingkatRef?.nama || s.tingkatId}"?`, onConfirm: async () => { await deleteSppSetting({ data: { id: s.id } }); fetchSettings(); setConfirmDeleteSetting(null) } })} className="p-1.5 hover:bg-rose-100 rounded cursor-pointer"><Trash2 className="w-4 h-4 text-rose-600" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* TAB: RINGKASAN */}
      {activeTab === 'ringkasan' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Combobox options={BULAN_OPTS} value={String(ringBulan)} onValueChange={(v) => setRingBulan(Number(v))} placeholder="Bulan" className="w-full" triggerClassName="nb-input text-sm" />
            <Combobox options={Array.from({ length: 5 }, (_, i) => ({ value: String(new Date().getFullYear() - 2 + i), label: String(new Date().getFullYear() - 2 + i) }))} value={String(ringTahun)} onValueChange={(v) => setRingTahun(Number(v))} placeholder="Tahun" className="w-full" triggerClassName="nb-input text-sm" />
          </div>

          {ringkasanLoading ? (
            <div className="h-40 bg-muted animate-pulse border-2 border-nb-ink rounded" />
          ) : ringkasan ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-card border-2 border-nb-ink rounded p-3">
                  <div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Total Tagihan</span></div>
                  <p className="text-lg font-heading font-bold">{ringkasan.total}</p>
                </div>
                <div className="bg-card border-2 border-nb-ink rounded p-3">
                  <div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-emerald-600" /><span className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Lunas</span></div>
                  <p className="text-lg font-heading font-bold text-emerald-700">{ringkasan.lunas}</p>
                </div>
                <div className="bg-card border-2 border-nb-ink rounded p-3">
                  <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-amber-600" /><span className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Cicil</span></div>
                  <p className="text-lg font-heading font-bold text-amber-700">{ringkasan.cicil}</p>
                </div>
                <div className="bg-card border-2 border-nb-ink rounded p-3">
                  <div className="flex items-center gap-2 mb-1"><AlertCircle className="w-4 h-4 text-rose-600" /><span className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Terbit</span></div>
                  <p className="text-lg font-heading font-bold text-rose-700">{ringkasan.terbit}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-card border-2 border-nb-ink rounded p-3">
                  <div className="flex items-center gap-2 mb-1"><Ban className="w-4 h-4 text-blue-600" /><span className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Dibebaskan</span></div>
                  <p className="text-lg font-heading font-bold text-blue-700">{ringkasan.dibebaskan}</p>
                </div>
                <div className="bg-card border-2 border-nb-ink rounded p-3">
                  <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-emerald-600" /><span className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Total Terkumpul</span></div>
                  <p className="text-lg font-heading font-bold text-emerald-700">{rp(ringkasan.totalTerkumpul)}</p>
                </div>
                <div className="bg-card border-2 border-nb-ink rounded p-3">
                  <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Total Nominal</span></div>
                  <p className="text-lg font-heading font-bold">{rp(ringkasan.totalNominal)}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-card border-2 border-nb-ink rounded">
              <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-heading font-bold text-muted-foreground">Pilih bulan dan tahun untuk melihat ringkasan</p>
            </div>
          )}
        </>
      )}

      {/* TAB: LAPORAN */}
      {activeTab === 'laporan' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Combobox options={[{ value: '0', label: 'Pilih Bulan' }, ...BULAN_OPTS]} value={String(laporanBulan)} onValueChange={(v) => setLaporanBulan(Number(v))} placeholder="Bulan" className="w-full" triggerClassName="nb-input text-sm" />
            <Combobox options={Array.from({ length: 5 }, (_, i) => ({ value: String(new Date().getFullYear() - 2 + i), label: String(new Date().getFullYear() - 2 + i) }))} value={String(laporanTahun)} onValueChange={(v) => setLaporanTahun(Number(v))} placeholder="Tahun" className="w-full" triggerClassName="nb-input text-sm" />
          </div>

          <div className="flex gap-1 p-1 bg-card border-2 border-nb-ink rounded w-fit">
            <button onClick={() => setLaporanTab('perkelas')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${laporanTab === 'perkelas' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
              Per Kelas
            </button>
            <button onClick={() => setLaporanTab('summary')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${laporanTab === 'summary' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
              Summary
            </button>
            <button onClick={() => setLaporanTab('detailsiswa')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${laporanTab === 'detailsiswa' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
              Detail Siswa
            </button>
          </div>

          {laporanLoading ? (
            <div className="h-40 bg-muted animate-pulse border-2 border-nb-ink rounded" />
          ) : laporanError ? (
            <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm rounded">{laporanError}</div>
          ) : laporanTab === 'perkelas' ? (
            <>
              {laporanByKelas.length === 0 ? (
                <div className="text-center py-12 bg-card border-2 border-nb-ink rounded">
                  <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-heading font-bold text-muted-foreground">Tidak ada data untuk periode ini</p>
                </div>
              ) : (
                <>
                  <div className="nb-table-wrapper bg-card">
                    <table className="nb-table">
                      <thead>
                        <tr>
                          <th>Kelas</th>
                          <th>Tingkat</th>
                          <th>Siswa</th>
                          <th className="text-right">Nominal</th>
                          <th className="text-right">Diskon</th>
                          <th className="text-right">Terkumpul</th>
                          <th className="text-right">Sisa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {laporanByKelas.map((d: any) => (
                          <tr key={d.kelasId}>
                            <td className="font-heading font-bold text-sm">{d.kelasNama}</td>
                            <td className="text-sm">{d.tingkatNama || '-'}</td>
                            <td className="text-sm">{d.totalSiswa}</td>
                            <td className="text-right text-sm">{rp(d.totalNominal)}</td>
                            <td className="text-right text-sm text-blue-600">{rp(d.totalDiskon)}</td>
                            <td className="text-right text-sm text-emerald-700 font-heading font-bold">{rp(d.totalTerkumpul)}</td>
                            <td className="text-right text-sm text-rose-700 font-heading font-bold">{rp(d.totalSisa)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-card border-2 border-nb-ink rounded" style={{ height: '600px' }}>
                    <div className="p-3 border-b-2 border-nb-ink flex items-center justify-between shrink-0">
                      <h3 className="font-heading font-bold text-sm">Preview Laporan Per Kelas</h3>
                    </div>
                    <div style={{ height: '555px' }}>
                      <Suspense fallback={<div className="flex items-center justify-center h-full bg-muted"><p className="text-sm font-heading font-bold text-muted-foreground">Loading...</p></div>}>
                        <PDFViewer width="100%" height="100%" showToolbar={true} style={{ border: 'none' }}>
                          <SppLaporanPerKelasPDF data={laporanByKelas} bulan={laporanBulan} tahun={laporanTahun} pengaturan={pengaturan || undefined} />
                        </PDFViewer>
                      </Suspense>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : laporanTab === 'summary' ? (
            <>
              {laporanSummary ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-card border-2 border-nb-ink rounded p-3">
                      <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Total Siswa</p>
                      <p className="text-lg font-heading font-bold mt-0.5">{laporanSummary.totalSiswa}</p>
                    </div>
                    <div className="bg-card border-2 border-nb-ink rounded p-3">
                      <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Total Nominal</p>
                      <p className="text-lg font-heading font-bold mt-0.5">{rp(laporanSummary.totalNominal)}</p>
                    </div>
                    <div className="bg-card border-2 border-nb-ink rounded p-3">
                      <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Diskon</p>
                      <p className="text-lg font-heading font-bold mt-0.5 text-blue-700">{rp(laporanSummary.totalDiskon)}</p>
                    </div>
                    <div className="bg-card border-2 border-nb-ink rounded p-3">
                      <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Terkumpul</p>
                      <p className="text-lg font-heading font-bold mt-0.5 text-emerald-700">{rp(laporanSummary.totalTerkumpul)}</p>
                    </div>
                    <div className="bg-card border-2 border-nb-ink rounded p-3">
                      <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Sisa</p>
                      <p className="text-lg font-heading font-bold mt-0.5 text-rose-700">{rp(laporanSummary.totalSisa)}</p>
                    </div>
                  </div>
                  <div className="bg-card border-2 border-nb-ink rounded" style={{ height: '600px' }}>
                    <div className="p-3 border-b-2 border-nb-ink flex items-center justify-between shrink-0">
                      <h3 className="font-heading font-bold text-sm">Preview Summary Report</h3>
                    </div>
                    <div style={{ height: '555px' }}>
                      <Suspense fallback={<div className="flex items-center justify-center h-full bg-muted"><p className="text-sm font-heading font-bold text-muted-foreground">Loading...</p></div>}>
                        <PDFViewer width="100%" height="100%" showToolbar={true} style={{ border: 'none' }}>
                          <SppLaporanSummaryPDF data={laporanSummary} bulan={laporanBulan} tahun={laporanTahun} pengaturan={pengaturan || undefined} />
                        </PDFViewer>
                      </Suspense>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 bg-card border-2 border-nb-ink rounded">
                  <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-heading font-bold text-muted-foreground">Tidak ada data untuk periode ini</p>
                </div>
              )}
            </>
          ) : laporanTab === 'detailsiswa' ? (
            <>
              {laporanDetailSiswa.length === 0 ? (
                <div className="text-center py-12 bg-card border-2 border-nb-ink rounded">
                  <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-heading font-bold text-muted-foreground">Tidak ada data untuk periode ini</p>
                </div>
              ) : (
                <>
                  {laporanDetailSiswa.map((tingkat: any) => (
                    <div key={tingkat.tingkatId} className="mb-4">
                      <div className="bg-primary/10 border-2 border-nb-ink rounded-t px-4 py-2 font-heading font-bold text-sm">
                        {tingkat.tingkatNama ? `Tingkat ${tingkat.tingkatNama}` : 'Tanpa Tingkat'} — {tingkat.kelasGroups.reduce((s: number, k: any) => s + k.siswa.length, 0)} siswa
                      </div>
                      {tingkat.kelasGroups.map((kelas: any) => (
                        <div key={kelas.kelasId} className="bg-card border-x-2 border-b-2 border-nb-ink last:rounded-b">
                          <div className="px-4 py-2 bg-secondary/30 border-b-2 border-nb-ink font-heading font-semibold text-sm text-muted-foreground italic">
                            {kelas.kelasNama} — {kelas.siswa.length} siswa
                          </div>
                          <div className="overflow-x-auto">
                            <table className="nb-table">
                              <thead>
                                <tr>
                                  <th>No</th><th>Nama</th><th>NIS</th>
                                  <th className="text-right">Nominal</th><th className="text-right">Diskon</th>
                                  <th className="text-right">Dibayar</th><th className="text-right">Sisa</th>
                                  <th className="text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {kelas.siswa.map((sw: any, i: number) => (
                                  <tr key={sw.siswaId}>
                                    <td className="text-sm">{i + 1}</td>
                                    <td className="font-heading font-bold text-sm">{sw.nama}</td>
                                    <td className="text-sm text-muted-foreground">{sw.nis || '-'}</td>
                                    <td className="text-right text-sm">{rp(sw.nominal)}</td>
                                    <td className="text-right text-sm text-blue-600">{sw.diskon > 0 ? rp(sw.diskon) : '-'}</td>
                                    <td className="text-right text-sm text-emerald-700 font-heading font-bold">{sw.sudahDibayar > 0 ? rp(sw.sudahDibayar) : '-'}</td>
                                    <td className="text-right text-sm text-rose-700 font-heading font-bold">{rp(sw.sisa)}</td>
                                    <td className="text-center text-sm capitalize">{sw.status}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="bg-card border-2 border-nb-ink rounded" style={{ height: '600px' }}>
                    <div className="p-3 border-b-2 border-nb-ink flex items-center justify-between shrink-0">
                      <h3 className="font-heading font-bold text-sm">Preview Laporan Detail Siswa</h3>
                    </div>
                    <div style={{ height: '555px' }}>
                      <Suspense fallback={<div className="flex items-center justify-center h-full bg-muted"><p className="text-sm font-heading font-bold text-muted-foreground">Loading...</p></div>}>
                        <PDFViewer width="100%" height="100%" showToolbar={true} style={{ border: 'none' }}>
                          <SppLaporanDetailSiswaPDF data={laporanDetailSiswa} bulan={laporanBulan} tahun={laporanTahun} pengaturan={pengaturan || undefined} />
                        </PDFViewer>
                      </Suspense>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-card border-2 border-nb-ink rounded">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-heading font-bold text-muted-foreground">Pilih laporan</p>
            </div>
          )}
        </>
      )}

      {/* MODAL: BAYAR */}
      {isBayarModalOpen && selectedTagihan && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-md flex flex-col max-h-[85dvh]">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Catat Pembayaran SPP</h3>
              <button onClick={() => setIsBayarModalOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleBayarSubmit} className="p-4 flex-1 min-h-0 overflow-y-auto space-y-3">
              {errorMsg && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{errorMsg}</div>}
              {successMsg && <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border-2 border-emerald-700 rounded p-2.5"><TrendingUp className="w-4 h-4 shrink-0" />{successMsg}</div>}
              <div className="bg-secondary/30 border-2 border-nb-ink rounded p-3 text-sm space-y-1">
                <div>Siswa: <span className="font-heading font-bold">{selectedTagihan.siswa?.nama}</span></div>
                <div>Periode: <span className="font-heading font-bold">{bulanNama(selectedTagihan.tagihan?.bulan)} {selectedTagihan.tagihan?.tahun}</span></div>
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
                  <Combobox options={METODE_OPTS} value={bayarForm.metode} onValueChange={(v) => setBayarForm({ ...bayarForm, metode: v as any })} className="w-full" triggerClassName="nb-input" />
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
              <button type="button" onClick={() => setIsBayarModalOpen(false)} className="nb-btn nb-btn-secondary cursor-pointer">Batal</button>
              <button onClick={handleBayarSubmit} className="nb-btn nb-btn-primary cursor-pointer">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GENERATE SPP */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-md flex flex-col max-h-[85dvh]">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Generate SPP Bulanan</h3>
              <button onClick={() => setIsGenerateModalOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleGenerateSubmit} className="p-4 flex-1 min-h-0 overflow-y-auto space-y-3">
              {errorMsg && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{errorMsg}</div>}
              {successMsg && <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border-2 border-emerald-700 rounded p-2.5"><TrendingUp className="w-4 h-4 shrink-0" />{successMsg}</div>}
              <p className="text-sm text-muted-foreground">Buat tagihan SPP untuk semua siswa aktif berdasarkan nominal setting per tingkat.</p>
              {!hasSppSettings && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border-2 border-amber-700 rounded p-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Belum ada setting SPP untuk tahun ajaran <strong>{generateForm.tahun}/{generateForm.tahun + 1}</strong>. Tambah setting di tab Setting terlebih dahulu agar nominal SPP terisi otomatis.</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Bulan</label>
                  <Combobox options={BULAN_OPTS} value={String(generateForm.bulan)} onValueChange={(v) => setGenerateForm({ ...generateForm, bulan: Number(v) })} className="w-full" triggerClassName="nb-input" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tahun</label>
                  <Combobox options={Array.from({ length: 3 }, (_, i) => ({ value: String(new Date().getFullYear() + i), label: String(new Date().getFullYear() + i) }))} value={String(generateForm.tahun)} onValueChange={(v) => {
                    const tahun = Number(v)
                    setGenerateForm({ ...generateForm, tahun })
                    const ta = `${tahun}/${tahun + 1}`
                    checkSppSettingExists({ data: { unitId: unitId!, tahunAjaran: ta } }).then(setHasSppSettings).catch(() => setHasSppSettings(false))
                  }} className="w-full" triggerClassName="nb-input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Batas Waktu</label>
                <input type="date" required value={generateForm.dueDate} onChange={(e) => setGenerateForm({ ...generateForm, dueDate: e.target.value })} className="nb-input" />
              </div>
            </form>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex gap-3 justify-end bg-card rounded-b-lg">
              <button type="button" onClick={() => setIsGenerateModalOpen(false)} className="nb-btn nb-btn-secondary cursor-pointer">Batal</button>
              <button onClick={handleGenerateSubmit} disabled={!hasSppSettings || actionLoading} className="nb-btn nb-btn-primary cursor-pointer disabled:opacity-40">{actionLoading ? 'Menyimpan...' : 'Generate'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SETTING */}
      {settingModal && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-md flex flex-col max-h-[85dvh]">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">{editSetting ? 'Edit' : 'Tambah'} Setting SPP</h3>
              <button onClick={() => setSettingModal(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSettingSubmit} className="p-4 flex-1 min-h-0 overflow-y-auto space-y-3">
              {settingError && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{settingError}</div>}
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tingkat</label>
                <Combobox
                  options={[{ value: '__none', label: 'Pilih tingkat...' }, ...tingkatOptions]}
                  value={settingForm.tingkatId || '__none'}
                  onValueChange={(v) => setSettingForm({ ...settingForm, tingkatId: v === '__none' ? '' : v })}
                  placeholder="Pilih tingkat"
                  searchPlaceholder="Cari tingkat..."
                  className="w-full"
                  triggerClassName="nb-input"
                />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nominal SPP (Rp)</label>
                <input type="number" min={1} required value={settingForm.nominal || ''} onChange={(e) => setSettingForm({ ...settingForm, nominal: Number(e.target.value) })} className="nb-input" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tahun Ajaran</label>
                <Combobox
                  options={taList.map((t: any) => ({ value: t.nama, label: `${t.nama}${t.aktif ? ' (Aktif)' : ''}` }))}
                  value={settingForm.tahunAjaran}
                  onValueChange={(v) => setSettingForm({ ...settingForm, tahunAjaran: v })}
                  placeholder="Pilih tahun ajaran"
                  className="w-full"
                  triggerClassName="nb-input"
                />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Keterangan</label>
                <textarea value={settingForm.keterangan} onChange={(e) => setSettingForm({ ...settingForm, keterangan: e.target.value })} className="nb-input" rows={2} />
              </div>
            </form>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex gap-3 justify-end bg-card rounded-b-lg">
              <button type="button" onClick={() => setSettingModal(false)} className="nb-btn nb-btn-secondary cursor-pointer">Batal</button>
              <button onClick={handleSettingSubmit} disabled={settingActionLoading} className="nb-btn nb-btn-primary cursor-pointer">{settingActionLoading ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL SPP */}
      {detailModal && detailSs && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-lg flex flex-col max-h-[85dvh]">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Detail SPP Siswa</h3>
              <button onClick={() => setDetailModal(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 flex-1 min-h-0 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Siswa:</span> <span className="font-heading font-bold">{detailSs.siswa?.nama}</span></div>
                <div><span className="text-muted-foreground">NIS:</span> <span className="font-heading font-bold">{detailSs.siswa?.nis || '-'}</span></div>
                <div><span className="text-muted-foreground">Periode:</span> <span className="font-heading font-bold">{bulanNama(detailSs.tagihan?.bulan)} {detailSs.tagihan?.tahun}</span></div>
                <div><span className="text-muted-foreground">Status:</span> {statusBadge(detailSs.status)}</div>
              </div>
              <div className="flex flex-wrap justify-between items-center bg-secondary/30 border-2 border-nb-ink rounded p-3 text-sm font-heading font-bold gap-x-4 gap-y-1">
                <span>Nominal: {rp(detailSs.nominal)}</span>
                {detailSs.diskon > 0 && <span className="text-blue-600">Beasiswa: -{rp(detailSs.diskon)}</span>}
                <span>Dibayar: <span className="text-emerald-700">{rp(detailSs.sudahDibayar)}</span></span>
                <span>Sisa: <span className="text-primary">{rp(detailSs.nominal - (detailSs.diskon || 0) - detailSs.sudahDibayar)}</span></span>
              </div>

              {detailSs.pembayarans?.length > 0 && (
                <div>
                  <p className="text-sm font-heading font-bold uppercase tracking-wider mb-2">Riwayat Pembayaran</p>
                  <div className="space-y-1">
                    {detailSs.pembayarans.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between bg-secondary/20 border border-nb-ink/30 rounded px-3 py-2 text-sm">
                        <div className="flex flex-col gap-0.5">
                          <span>{p.tanggalBayar} {p.createdAt ? new Date(p.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''} — {p.metode}</span>
                          {p.catatan && <span className="text-sm text-muted-foreground">{p.catatan}</span>}
                        </div>
                        <span className="font-heading font-bold text-emerald-700">{rp(p.jumlahBayar)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!detailSs.pembayarans || detailSs.pembayarans.length === 0) && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <p>Belum ada pembayaran</p>
                </div>
              )}
            </div>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex justify-end bg-card rounded-b-lg">
              <button onClick={() => setDetailModal(false)} className="nb-btn nb-btn-primary cursor-pointer">Tutup</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!confirmDeleteSetting} onClose={() => setConfirmDeleteSetting(null)} onConfirm={() => confirmDeleteSetting?.onConfirm()} title="Konfirmasi" message={confirmDeleteSetting?.message || ''} />
      <ConfirmDialog open={!!confirmDeleteSpp} onClose={() => setConfirmDeleteSpp(null)} onConfirm={() => confirmDeleteSpp?.onConfirm()} title="Konfirmasi" message={confirmDeleteSpp?.message || ''} />
    </div>
  )
}
