import { createFileRoute, redirect, useNavigate, Link } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { useUnit } from '#/lib/unit-context'
import {
  getTagihanList, getTagihanSiswaList, createTagihan, updateTagihan,
  publishTagihanToClass, bayarTagihan, deleteTagihan,
  getRingkasanTagihan, getTingkatList,
} from '#/server/tagihan'
import { getSiswaList } from '#/server/siswa'
import { getTahunAjaranList } from '#/server/tahun-ajaran'
import { getYayasanPengaturan } from '#/server/pengaturan'
import { getBankAccountList } from '#/server/keuangan'
import { useState, useEffect, lazy, Suspense } from 'react'
import {
  Plus, FileText, DollarSign, X, AlertCircle, ChevronLeft, ChevronRight,
  Receipt, Trash2, Send, Eye, Pencil, Users, Printer, TrendingUp,
} from 'lucide-react'
import { Combobox } from '#/components/ui/combobox'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { ActionMenu } from '#/components/ui/action-menu'
import { TagihanPDF } from '#/components/tagihan-pdf'

const PDFViewer = lazy(() =>
  import('@react-pdf/renderer').then((mod) => ({ default: mod.PDFViewer })),
)

export const Route = createFileRoute('/_dashboard/tagihan')({
  beforeLoad: async ({ location }) => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'operator' } })
    if (!allowed) throw redirect({ to: '/siswa' })

    const s = new URLSearchParams(location.search).get('s')
    if (s) throw redirect({ to: '/tagihan/$id', params: { id: s } })
  },
  component: TagihanPage,
})

const STATUS_OPTS = [
  { value: 'draft', label: 'Draft' }, { value: 'terbit', label: 'Terbit' },
  { value: 'cicil', label: 'Cicil' }, { value: 'lunas', label: 'Lunas' }, { value: 'dibebaskan', label: 'Dibebaskan' },
]

const METODE_OPTS = [
  { value: 'tunai', label: 'Tunai' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' },
  { value: 'lainnya', label: 'Lainnya' },
]

function rp(n: number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n) }

function TagihanPage() {
  const navigate = useNavigate()
  const { activeUnit } = useUnit()
  const unitId = activeUnit?.id
  const canManage = activeUnit?.role === 'admin_yayasan' || activeUnit?.role === 'super_admin'
  if (!unitId) return null

  const [activeTab, setActiveTab] = useState<'template' | 'siswa'>('template')

  // Template
  const [tmplList, setTmplList] = useState<any[]>([])
  const [tmplTotal, setTmplTotal] = useState(0)
  const [tmplLoading, setTmplLoading] = useState(true)
  const [filterTmplStatus, setFilterTmplStatus] = useState('')
  const [filterTmplTa, setFilterTmplTa] = useState('')

  // Per-siswa
  const [siswaTagihanList, setSiswaTagihanList] = useState<any[]>([])
  const [siswaTagihanTotal, setSiswaTagihanTotal] = useState(0)
  const [siswaLoading, setSiswaLoading] = useState(true)
  const [filterSsStatus, setFilterSsStatus] = useState('')
  const [filterSsSiswa, setFilterSsSiswa] = useState('')
  const [filterSsTmpl, setFilterSsTmpl] = useState('')
  const [filterSsSearch, setFilterSsSearch] = useState('')

  // Shared
  const [ringkasan, setRingkasan] = useState<any>(null)
  const [siswaList, setSiswaList] = useState<any[]>([])
  const [taList, setTaList] = useState<any[]>([])
  const [tingkatList, setTingkatList] = useState<any[]>([])
  const [pengaturan, setPengaturan] = useState<Record<string, string> | null>(null)
  const [bankAccountList, setBankAccountList] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [ssPage, setSsPage] = useState(1)
  const pageSize = 15

  // Modals
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editTmpl, setEditTmpl] = useState<any>(null)
  const [publishModal, setPublishModal] = useState(false)
  const [selectedTmpl, setSelectedTmpl] = useState<any>(null)
  const [publishTingkatIds, setPublishTingkatIds] = useState<string[]>([])
  const [bayarModal, setBayarModal] = useState(false)
  const [selectedSs, setSelectedSs] = useState<any>(null)
  const [previewModal, setPreviewModal] = useState(false)
  const [previewTmpl, setPreviewTmpl] = useState<any>(null)

  // Form
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({ tahunAjaran: '', judul: '', dueDate: '', keterangan: '' })
  const [formItems, setFormItems] = useState([{ nama: '', qty: 1, hargaSatuan: 0, diskon: 0 }])
  const [bayarForm, setBayarForm] = useState({ jumlahBayar: 0, tanggalBayar: new Date().toISOString().split('T')[0], metode: 'tunai', catatan: '', bankAccountId: '' })
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // ─── Data Fetching ─────────────────────────────────────────────────────

  const fetchTingkat = () => { if (unitId) getTingkatList({ data: { unitId } }).then(setTingkatList).catch(console.error) }

  const fetchTmpl = () => {
    if (!unitId) return; setTmplLoading(true)
    Promise.all([
      getTagihanList({ data: { unitId, status: filterTmplStatus || undefined, tahunAjaran: filterTmplTa || undefined, page, pageSize } }),
      getRingkasanTagihan({ data: { unitId } }),
    ]).then(([d, r]) => { setTmplList(d.data); setTmplTotal(d.total); setRingkasan(r) }).catch(console.error).finally(() => setTmplLoading(false))
  }

  const fetchSs = () => {
    if (!unitId) return; setSiswaLoading(true)
    Promise.all([
      getTagihanSiswaList({ data: { unitId, status: filterSsStatus || undefined, siswaId: filterSsSiswa || undefined, tagihanId: filterSsTmpl || undefined, search: filterSsSearch || undefined, page: ssPage, pageSize } }),
      getSiswaList({ data: { unitId, pageSize: 100 } }),
      getTahunAjaranList({ data: { unitId } }),
    ]).then(([d, s, t]) => { setSiswaTagihanList(d.data); setSiswaTagihanTotal(d.total); setSiswaList(s.data || []); setTaList(t) }).catch(console.error).finally(() => setSiswaLoading(false))
  }

  useEffect(() => {
    if (!unitId) return
    fetchTingkat(); fetchTmpl(); fetchSs()
    getYayasanPengaturan().then(setPengaturan).catch(console.error)
    getBankAccountList({ data: { unitId } }).then(setBankAccountList).catch(console.error)
  }, [unitId])

  useEffect(() => { if (unitId) fetchTmpl() }, [unitId, page, filterTmplStatus, filterTmplTa])
  useEffect(() => { if (unitId) fetchSs() }, [unitId, ssPage, filterSsStatus, filterSsSiswa, filterSsTmpl, filterSsSearch])

  // ─── Template ───────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({ tahunAjaran: '', judul: '', dueDate: '', keterangan: '' })
    setFormItems([{ nama: '', qty: 1, hargaSatuan: 0, diskon: 0 }])
  }

  const addItem = () => setFormItems([...formItems, { nama: '', qty: 1, hargaSatuan: 0, diskon: 0 }])
  const removeItem = (idx: number) => { if (formItems.length > 1) setFormItems(formItems.filter((_, i) => i !== idx)) }
  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...formItems]
    updated[idx] = { ...updated[idx], [field]: value }
    setFormItems(updated)
  }
  const itemSubtotal = (it: typeof formItems[0]) => Math.max((it.qty * it.hargaSatuan) - it.diskon, 0)

  const handleCreate = async () => {
    setFormError('')
    if (!formData.tahunAjaran) { setFormError('Pilih tahun ajaran'); return }
    const valid = formItems.filter((i) => i.nama.trim() && i.qty > 0 && i.hargaSatuan > 0)
    if (valid.length === 0) { setFormError('Minimal 1 item valid'); return }
    setActionLoading(true)
    try {
      await createTagihan({ data: { unitId, ...formData, items: valid.map((it) => ({ nama: it.nama, qty: it.qty, hargaSatuan: it.hargaSatuan, diskon: it.diskon })) } })
      setCreateModal(false); resetForm(); fetchTmpl()
    } catch (err: any) { setFormError(err.message) } finally { setActionLoading(false) }
  }

  const openEdit = (t: any) => {
    setEditTmpl(t); setFormError('')
    setFormData({ tahunAjaran: t.tahunAjaran, judul: t.judul || '', dueDate: t.dueDate || '', keterangan: t.keterangan || '' })
    setFormItems(t.items?.length ? t.items.map((it: any) => ({ nama: it.nama, qty: it.qty, hargaSatuan: it.hargaSatuan, diskon: it.diskon || 0 })) : [{ nama: '', qty: 1, hargaSatuan: 0, diskon: 0 }])
    setEditModal(true)
  }

  const handleEdit = async () => {
    if (!editTmpl) return
    setFormError('')
    if (!formData.tahunAjaran) { setFormError('Pilih tahun ajaran'); return }
    const valid = formItems.filter((i) => i.nama.trim() && i.qty > 0 && i.hargaSatuan > 0)
    if (valid.length === 0) { setFormError('Minimal 1 item valid'); return }
    setActionLoading(true)
    try {
      await updateTagihan({ data: { id: editTmpl.id, ...formData, items: valid.map((it) => ({ nama: it.nama, qty: it.qty, hargaSatuan: it.hargaSatuan, diskon: it.diskon })) } })
      setEditModal(false); setEditTmpl(null); fetchTmpl()
    } catch (err: any) { setFormError(err.message) } finally { setActionLoading(false) }
  }

  const handlePublish = async () => {
    if (!selectedTmpl || publishTingkatIds.length === 0) { setFormError('Pilih minimal 1 tingkat'); return }
    setActionLoading(true); setFormError('')
    try {
      await publishTagihanToClass({ data: { tagihanId: selectedTmpl.id, tingkatIds: publishTingkatIds } })
      setPublishModal(false); setSelectedTmpl(null); setPublishTingkatIds([]); fetchTmpl()
    } catch (err: any) { setFormError(err.message) } finally { setActionLoading(false) }
  }

  // ─── Bayar ──────────────────────────────────────────────────────────────

  const [successMsg, setSuccessMsg] = useState('')

  const openBayar = (item: any) => {
    const sisa = item.nominal - (item.diskon || 0) - item.sudahDibayar
    if (sisa <= 0) return
    setSelectedSs(item); setFormError(''); setSuccessMsg('')
    setBayarForm({ jumlahBayar: sisa, tanggalBayar: new Date().toISOString().split('T')[0], metode: 'tunai', catatan: '', bankAccountId: '' })
    setBayarModal(true)
  }

  const handleBayarSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSs || bayarForm.jumlahBayar <= 0) { setFormError('Jumlah bayar harus positif'); return }
    const sisa = selectedSs.nominal - (selectedSs.diskon || 0) - selectedSs.sudahDibayar
    if (bayarForm.jumlahBayar > sisa) { setFormError(`Maksimal Rp${sisa.toLocaleString('id-ID')}`); return }
    setActionLoading(true); setFormError(''); setSuccessMsg('')
    try {
      await bayarTagihan({ data: { tagihanSiswaId: selectedSs.id, jumlahBayar: bayarForm.jumlahBayar, tanggalBayar: bayarForm.tanggalBayar, metode: bayarForm.metode as any, catatan: bayarForm.catatan || undefined, bankAccountId: bayarForm.bankAccountId || undefined } })
      setSuccessMsg('Pembayaran berhasil dicatat!')
      setTimeout(() => { setBayarModal(false); setSelectedSs(null); fetchSs() }, 1000)
    } catch (err: any) { setFormError(err.message) } finally { setActionLoading(false) }
  }

  const tmplTotalPages = Math.ceil(tmplTotal / pageSize)
  const ssTotalPages = Math.ceil(siswaTagihanTotal / pageSize)

  const statusBadge = (status: string) => {
    const m: Record<string, string> = {
      draft: 'bg-gray-100 border-gray-600 text-gray-600',
      terbit: 'bg-amber-100 border-amber-800 text-amber-800',
      cicil: 'bg-yellow-100 border-yellow-800 text-yellow-800',
      lunas: 'bg-emerald-100 border-emerald-800 text-emerald-800',
      dibebaskan: 'bg-blue-100 border-blue-800 text-blue-800',
    }
    return `text-sm px-2 py-0.5 rounded border font-heading font-bold ${m[status] || ''}`
  }

  return (
    <div className="space-y-6">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">Tagihan Lainnya</h2>
          <p className="text-sm text-muted-foreground mt-1">Buat template tagihan multi-item dan terbitkan per kelas. Untuk SPP, gunakan menu Manajemen SPP.</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-card border-2 border-nb-ink rounded w-fit">
        <button onClick={() => setActiveTab('template')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${activeTab === 'template' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <FileText className="w-3.5 h-3.5 inline mr-1.5" />Template Tagihan
        </button>
        <button onClick={() => setActiveTab('siswa')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${activeTab === 'siswa' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <Users className="w-3.5 h-3.5 inline mr-1.5" />Per-Siswa
        </button>
      </div>

      {/* ═══════════════ TAB: TEMPLATE ═══════════════ */}
      {activeTab === 'template' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => {
              const activeTa = taList.find((t: any) => t.aktif)
              resetForm()
              setFormData((prev) => ({ ...prev, tahunAjaran: activeTa?.nama || '' }))
              setCreateModal(true); setFormError('')
            }} className="nb-btn nb-btn-primary cursor-pointer shrink-0">
              <Plus className="w-4 h-4" /> Buat Template
            </button>
          </div>

          {ringkasan && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-card border-2 border-nb-ink rounded p-3">
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Total Tagihan</p>
                <p className="text-lg font-heading font-bold mt-0.5">{ringkasan.total || 0}</p>
              </div>
              <div className="bg-card border-2 border-nb-ink rounded p-3">
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Sisa Tagihan</p>
                <p className="text-lg font-heading font-bold mt-0.5">{rp(ringkasan.totalSisa || 0)}</p>
              </div>
              <div className="bg-card border-2 border-nb-ink rounded p-3">
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Terkumpul</p>
                <p className="text-lg font-heading font-bold mt-0.5 text-emerald-700">{rp(ringkasan.totalTerkumpul || 0)}</p>
              </div>
              <div className="bg-card border-2 border-nb-ink rounded p-3">
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Cicil</p>
                <p className="text-lg font-heading font-bold mt-0.5 text-amber-700">{ringkasan.cicil || 0}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Combobox options={[{ value: '', label: 'Semua Status' }, ...STATUS_OPTS]} value={filterTmplStatus} onValueChange={(v) => setFilterTmplStatus(v)} placeholder="Semua Status" className="w-full" triggerClassName="nb-input text-sm" />
            <Combobox options={[{ value: '', label: 'Semua TA' }, ...taList.map((t: any) => ({ value: t.nama, label: `${t.nama}${t.aktif ? ' (Aktif)' : ''}` }))]} value={filterTmplTa} onValueChange={(v) => setFilterTmplTa(v)} placeholder="Semua TA" className="w-full" triggerClassName="nb-input text-sm" />
          </div>

          {tmplLoading ? (
            <div className="h-40 bg-muted animate-pulse border-2 border-nb-ink rounded" />
          ) : tmplList.length === 0 ? (
            <div className="text-center py-12 bg-card border-2 border-nb-ink rounded">
              <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-heading font-bold text-muted-foreground">Belum Ada Template Tagihan</p>
              <p className="text-sm text-muted-foreground mt-1">Buat template, lalu terbitkan ke kelas</p>
            </div>
          ) : (
            <div className="nb-table-wrapper bg-card">
              <table className="nb-table">
                <thead>
                  <tr>
                    <th>Judul</th>
                    <th className="hidden md:table-cell">TA</th>
                    <th className="hidden md:table-cell">Item</th>
                    <th>Total</th>
                    <th className="hidden md:table-cell">Siswa</th>
                    <th>Status</th>
                    <th className="w-32 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {tmplList.map((t) => (
                    <tr key={t.id}>
                      <td className="font-heading font-bold text-sm">{t.judul || '-'}</td>
                      <td className="hidden md:table-cell text-sm">{t.tahunAjaran}</td>
                      <td className="hidden md:table-cell text-sm text-muted-foreground">{t.items?.length || 0}</td>
                      <td className="font-heading font-bold text-sm">Rp{t.nominal.toLocaleString('id-ID')}</td>
                      <td className="hidden md:table-cell text-sm">{t.siswaCount || 0} siswa</td>
                      <td><span className={statusBadge(t.status)}>{t.status}</span></td>
                      <td>
                        <div className="flex items-center justify-center">
                          <ActionMenu items={[
                            ...(t.status === 'draft' && canManage ? [
                              { label: 'Edit Draft', icon: <Pencil className="w-3.5 h-3.5 text-amber-700" />, onClick: () => openEdit(t), variant: 'warning' as const },
                              { label: 'Terbitkan', icon: <Send className="w-3.5 h-3.5 text-blue-700" />, onClick: () => { setSelectedTmpl(t); setPublishTingkatIds([]); setFormError(''); setPublishModal(true) } },
                              { label: 'Hapus', icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />, onClick: () => setConfirmDelete({ message: `Hapus template "${t.judul || t.tahunAjaran}"?`, onConfirm: async () => { await deleteTagihan({ data: { id: t.id } }); fetchTmpl() } }), variant: 'danger' as const },
                            ] : []),
                            { label: 'Preview PDF', icon: <Printer className="w-3.5 h-3.5" />, onClick: () => { setPreviewTmpl(t); setPreviewModal(true) } },
                          ]} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tmplTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{tmplTotal} template</span>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="nb-btn nb-btn-secondary px-2 py-1 cursor-pointer disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm font-heading font-bold">{page}/{tmplTotalPages}</span>
                <button disabled={page >= tmplTotalPages} onClick={() => setPage(page + 1)} className="nb-btn nb-btn-secondary px-2 py-1 cursor-pointer disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════ TAB: PER-SISWA ═══════════════ */}
      {activeTab === 'siswa' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Cari</label>
              <input type="text" placeholder="Nama/NIS..." value={filterSsSearch} onChange={(e) => setFilterSsSearch(e.target.value)} className="nb-input" />
            </div>
            <Combobox options={[{ value: '', label: 'Semua Status' }, ...STATUS_OPTS.filter(o => o.value !== 'draft')]} value={filterSsStatus} onValueChange={(v) => setFilterSsStatus(v)} placeholder="Semua Status" className="w-full" triggerClassName="nb-input text-sm" />
            <Combobox options={[{ value: '', label: 'Semua Siswa' }, ...siswaList.map((s: any) => ({ value: s.id, label: s.nama }))]} value={filterSsSiswa} onValueChange={(v) => setFilterSsSiswa(v)} placeholder="Semua Siswa" className="w-full" triggerClassName="nb-input text-sm" />
            <Combobox options={[{ value: '', label: 'Semua Template' }, ...tmplList.map((t: any) => ({ value: t.id, label: t.judul || t.tahunAjaran }))]} value={filterSsTmpl} onValueChange={(v) => setFilterSsTmpl(v)} placeholder="Semua Template" className="w-full" triggerClassName="nb-input text-sm" />
          </div>

          {siswaLoading ? (
            <div className="h-40 bg-muted animate-pulse border-2 border-nb-ink rounded" />
          ) : siswaTagihanList.length === 0 ? (
            <div className="text-center py-12 bg-card border-2 border-nb-ink rounded">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-heading font-bold text-muted-foreground">Belum Ada Tagihan Per-Siswa</p>
              <p className="text-sm text-muted-foreground mt-1">Terbitkan template ke kelas terlebih dahulu</p>
            </div>
          ) : (
            <div className="nb-table-wrapper bg-card">
              <table className="nb-table">
                <thead>
                  <tr>
                    <th>Siswa</th>
                    <th className="hidden md:table-cell">Template</th>
                    <th>Nominal</th>
                    <th className="hidden md:table-cell">Bea.</th>
                    <th>Dibayar</th>
                    <th>Sisa</th>
                    <th>Status</th>
                    <th className="w-24 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {siswaTagihanList.map((s: any) => {
                    const sisa = s.nominal - (s.diskon || 0) - s.sudahDibayar
                    return (
                      <tr key={s.id}>
                        <td>
                          <p className="font-heading font-bold text-sm">{s.siswa?.nama || '-'}</p>
                          <p className="text-sm text-muted-foreground">{s.siswa?.nis || ''}</p>
                        </td>
                        <td className="hidden md:table-cell text-sm">{s.tagihan?.judul || s.tagihan?.tahunAjaran || '-'}</td>
                        <td className="font-heading font-bold text-sm">{rp(s.nominal)}</td>
                        <td className="hidden md:table-cell text-sm text-muted-foreground">{s.diskon > 0 ? `-${rp(s.diskon)}` : '-'}</td>
                        <td className="text-sm">{s.sudahDibayar > 0 ? rp(s.sudahDibayar) : '-'}</td>
                        <td className="font-heading font-bold text-sm">{rp(sisa)}</td>
                        <td><span className={statusBadge(s.status)}>{s.status}</span></td>
                        <td>
                          <div className="flex items-center justify-center">
                            <ActionMenu items={[
                              { label: 'Detail', icon: <Eye className="w-3.5 h-3.5" />, onClick: () => navigate({ to: '/tagihan/$id', params: { id: s.id } }) },
                              ...(sisa > 0 && s.status !== 'dibebaskan' ? [{ label: 'Bayar', icon: <DollarSign className="w-3.5 h-3.5 text-emerald-700" />, onClick: () => openBayar(s), variant: 'success' as const }] : []),
                            ]} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {ssTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{siswaTagihanTotal} tagihan</span>
              <div className="flex items-center gap-2">
                <button disabled={ssPage <= 1} onClick={() => setSsPage(ssPage - 1)} className="nb-btn nb-btn-secondary px-2 py-1 cursor-pointer disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm font-heading font-bold">{ssPage}/{ssTotalPages}</span>
                <button disabled={ssPage >= ssTotalPages} onClick={() => setSsPage(ssPage + 1)} className="nb-btn nb-btn-secondary px-2 py-1 cursor-pointer disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════ MODAL: CREATE TEMPLATE ═══════════════ */}
      {createModal && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-2xl flex flex-col max-h-[85dvh]">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Buat Template Tagihan</h3>
              <button onClick={() => setCreateModal(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 flex-1 min-h-0 overflow-y-auto space-y-4">
              {formError && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{formError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tahun Ajaran</label>
                  <Combobox options={taList.map((t: any) => ({ value: t.nama, label: t.nama }))} value={formData.tahunAjaran} onValueChange={(v) => setFormData({ ...formData, tahunAjaran: v })} placeholder="Pilih TA" className="w-full" triggerClassName="nb-input" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Judul</label>
                  <input value={formData.judul} onChange={(e) => setFormData({ ...formData, judul: e.target.value })} className="nb-input" placeholder="Misal: Uang Pangkal" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Jatuh Tempo</label>
                <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="nb-input" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-heading font-bold uppercase tracking-wider">Item Tagihan</label>
                  <button onClick={addItem} className="text-sm font-heading font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer"><Plus className="w-3 h-3" />Tambah Item</button>
                </div>
                <div className="space-y-2">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-secondary/20 border-2 border-nb-ink rounded space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-heading font-bold text-muted-foreground">Item #{idx + 1}</span>
                        {formItems.length > 1 && <button onClick={() => removeItem(idx)} className="p-0.5 hover:bg-rose-100 rounded cursor-pointer"><X className="w-3.5 h-3.5 text-rose-600" /></button>}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <div className="col-span-2">
                          <input value={item.nama} onChange={(e) => updateItem(idx, 'nama', e.target.value)} className="nb-input text-[11px] h-8" placeholder="Nama item" />
                        </div>
                        <div>
                          <input type="number" min={1} value={item.qty} onChange={(e) => updateItem(idx, 'qty', Math.max(1, Number(e.target.value)))} className="nb-input text-[11px] h-8" placeholder="Qty" />
                        </div>
                        <div>
                          <input type="number" min={0} value={item.hargaSatuan || ''} onChange={(e) => updateItem(idx, 'hargaSatuan', Number(e.target.value))} className="nb-input text-[11px] h-8" placeholder="Harga" />
                        </div>
                        <div>
                          <input type="number" min={0} value={item.diskon || ''} onChange={(e) => updateItem(idx, 'diskon', Math.max(0, Number(e.target.value)))} className="nb-input text-[11px] h-8" placeholder="Diskon" />
                        </div>
                        <div className="flex items-end">
                          <div className="text-[11px] font-heading font-bold text-primary h-8 flex items-center">{rp(itemSubtotal(item))}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-3 pt-3 border-t-2 border-nb-ink/30 text-sm font-heading font-bold">
                  <span>Net: {rp(formItems.reduce((s, i) => s + itemSubtotal(i), 0))}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Keterangan</label>
                <textarea value={formData.keterangan} onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })} className="nb-input" rows={2} />
              </div>
            </div>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex gap-3 justify-end bg-card rounded-b-lg">
              <button onClick={() => setCreateModal(false)} className="nb-btn nb-btn-secondary cursor-pointer">Batal</button>
              <button onClick={handleCreate} disabled={actionLoading} className="nb-btn nb-btn-primary cursor-pointer">{actionLoading ? 'Menyimpan...' : 'Simpan Draft'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL: EDIT DRAFT ═══════════════ */}
      {editModal && editTmpl && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-2xl flex flex-col max-h-[85dvh]">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Edit Draft Tagihan</h3>
              <button onClick={() => setEditModal(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 flex-1 min-h-0 overflow-y-auto space-y-4">
              {formError && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{formError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tahun Ajaran</label>
                  <Combobox options={taList.map((t: any) => ({ value: t.nama, label: t.nama }))} value={formData.tahunAjaran} onValueChange={(v) => setFormData({ ...formData, tahunAjaran: v })} placeholder="Pilih TA" className="w-full" triggerClassName="nb-input" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Judul</label>
                  <input value={formData.judul} onChange={(e) => setFormData({ ...formData, judul: e.target.value })} className="nb-input" placeholder="Misal: Uang Pangkal" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Jatuh Tempo</label>
                <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="nb-input" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-heading font-bold uppercase tracking-wider">Item Tagihan</label>
                  <button onClick={addItem} className="text-sm font-heading font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer"><Plus className="w-3 h-3" />Tambah Item</button>
                </div>
                <div className="space-y-2">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-secondary/20 border-2 border-nb-ink rounded space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-heading font-bold text-muted-foreground">Item #{idx + 1}</span>
                        {formItems.length > 1 && <button onClick={() => removeItem(idx)} className="p-0.5 hover:bg-rose-100 rounded cursor-pointer"><X className="w-3.5 h-3.5 text-rose-600" /></button>}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <div className="col-span-2"><input value={item.nama} onChange={(e) => updateItem(idx, 'nama', e.target.value)} className="nb-input text-[11px] h-8" placeholder="Nama item" /></div>
                        <div><input type="number" min={1} value={item.qty} onChange={(e) => updateItem(idx, 'qty', Math.max(1, Number(e.target.value)))} className="nb-input text-[11px] h-8" placeholder="Qty" /></div>
                        <div><input type="number" min={0} value={item.hargaSatuan || ''} onChange={(e) => updateItem(idx, 'hargaSatuan', Number(e.target.value))} className="nb-input text-[11px] h-8" placeholder="Harga" /></div>
                        <div><input type="number" min={0} value={item.diskon || ''} onChange={(e) => updateItem(idx, 'diskon', Math.max(0, Number(e.target.value)))} className="nb-input text-[11px] h-8" placeholder="Diskon" /></div>
                        <div className="flex items-end"><div className="text-[11px] font-heading font-bold text-primary h-8 flex items-center">{rp(itemSubtotal(item))}</div></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-3 pt-3 border-t-2 border-nb-ink/30 text-sm font-heading font-bold">
                  <span>Net: {rp(formItems.reduce((s, i) => s + itemSubtotal(i), 0))}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Keterangan</label>
                <textarea value={formData.keterangan} onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })} className="nb-input" rows={2} />
              </div>
            </div>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex gap-3 justify-end bg-card rounded-b-lg">
              <button onClick={() => setEditModal(false)} className="nb-btn nb-btn-secondary cursor-pointer">Batal</button>
              <button onClick={handleEdit} disabled={actionLoading} className="nb-btn nb-btn-primary cursor-pointer">{actionLoading ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL: PUBLISH ═══════════════ */}
      {publishModal && selectedTmpl && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-md flex flex-col max-h-[85dvh]">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Terbitkan ke Tingkat</h3>
              <button onClick={() => setPublishModal(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 flex-1 min-h-0 overflow-y-auto space-y-3">
              {formError && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{formError}</div>}
              <div className="bg-secondary/30 border-2 border-nb-ink rounded p-3 text-sm space-y-1">
                <p className="font-heading font-bold">{selectedTmpl.judul || selectedTmpl.tahunAjaran}</p>
                <p className="text-muted-foreground">{rp(selectedTmpl.nominal)} — {selectedTmpl.items?.length || 0} item</p>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Pilih Tingkat</label>
                <div className="space-y-1 max-h-48 overflow-y-auto border-2 border-nb-ink rounded p-2 bg-card">
                  {tingkatList.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">Belum ada tingkat. Tambah di menu Master Tingkat.</p>
                  ) : (
                    <>
                      <label className="flex items-center gap-2 p-1.5 hover:bg-secondary/30 rounded cursor-pointer text-sm font-heading font-bold border-b border-nb-ink/20">
                        <input type="checkbox" checked={publishTingkatIds.length === tingkatList.length} onChange={(e) => setPublishTingkatIds(e.target.checked ? tingkatList.map((t: any) => t.id) : [])} className="accent-primary" />
                        Pilih Semua
                      </label>
                      {tingkatList.map((t: any) => (
                        <label key={t.id} className="flex items-center gap-2 p-1.5 hover:bg-secondary/30 rounded cursor-pointer text-sm">
                          <input type="checkbox" checked={publishTingkatIds.includes(t.id)} onChange={(e) => setPublishTingkatIds(e.target.checked ? [...publishTingkatIds, t.id] : publishTingkatIds.filter((id) => id !== t.id))} className="accent-primary" />
                          <span className="font-heading font-semibold">{t.nama}</span>
                          {t.kode && <span className="text-sm text-muted-foreground">({t.kode})</span>}
                        </label>
                      ))}
                    </>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Tagihan akan diterbitkan ke semua siswa aktif di {publishTingkatIds.length} tingkat terpilih.</p>
            </div>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex gap-3 justify-end bg-card rounded-b-lg">
              <button onClick={() => setPublishModal(false)} className="nb-btn nb-btn-secondary cursor-pointer">Batal</button>
              <button onClick={handlePublish} disabled={actionLoading || publishTingkatIds.length === 0} className="nb-btn nb-btn-primary cursor-pointer">{actionLoading ? 'Menerbitkan...' : `Terbitkan (${publishTingkatIds.length} tingkat)`}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL: BAYAR ═══════════════ */}
      {bayarModal && selectedSs && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-md flex flex-col max-h-[85dvh]">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Catat Pembayaran Tagihan</h3>
              <button onClick={() => setBayarModal(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleBayarSubmit} className="p-4 flex-1 min-h-0 overflow-y-auto space-y-3">
              {formError && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{formError}</div>}
              {successMsg && <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border-2 border-emerald-700 rounded p-2.5"><TrendingUp className="w-4 h-4 shrink-0" />{successMsg}</div>}
              <div className="bg-secondary/30 border-2 border-nb-ink rounded p-3 text-sm space-y-1">
                <div>Siswa: <span className="font-heading font-bold">{selectedSs.siswa?.nama}</span></div>
                <div>Tagihan: <span className="font-heading font-bold">{selectedSs.tagihan?.judul || selectedSs.tagihan?.tahunAjaran}</span></div>
                <div>Nominal: <span className="font-heading font-bold">{rp(selectedSs.nominal)}</span></div>
                {selectedSs.diskon > 0 && <div>Diskon: <span className="text-blue-700 font-heading font-bold">-{rp(selectedSs.diskon)}</span></div>}
                <div>Sisa: <span className="text-rose-700 font-heading font-bold">{rp(selectedSs.nominal - (selectedSs.diskon || 0) - selectedSs.sudahDibayar)}</span></div>
              </div>

              {selectedSs.pembayarans?.length > 0 && (
                <div>
                  <p className="text-sm font-heading font-bold uppercase tracking-wider mb-1.5">Riwayat Pembayaran</p>
                  <div className="space-y-1">
                    {selectedSs.pembayarans.map((p: any) => (
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
                <input type="number" required min={1} max={selectedSs.nominal - (selectedSs.diskon || 0) - selectedSs.sudahDibayar} value={bayarForm.jumlahBayar} onChange={(e) => setBayarForm({ ...bayarForm, jumlahBayar: Number(e.target.value) || 0 })} className="nb-input" />
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
              <button type="submit" disabled={actionLoading} className="nb-btn nb-btn-primary cursor-pointer">{actionLoading ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL: PREVIEW PDF ═══════════════ */}
      {previewModal && previewTmpl && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-5xl flex flex-col" style={{ height: '90dvh' }}>
            <div className="p-3 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Preview Tagihan PDF</h3>
              <button onClick={() => setPreviewModal(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 min-h-0 relative">
              <Suspense fallback={
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-heading font-bold text-muted-foreground">Loading PDF Viewer...</p>
                  </div>
                </div>
              }>
                <PDFViewer width="100%" height="100%" showToolbar={true} style={{ border: 'none' }}>
                  <TagihanPDF tmpl={previewTmpl} pengaturan={pengaturan || undefined} />
                </PDFViewer>
              </Suspense>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => { confirmDelete?.onConfirm(); setConfirmDelete(null) }} title="Konfirmasi" message={confirmDelete?.message || ''} />
    </div>
  )
}
