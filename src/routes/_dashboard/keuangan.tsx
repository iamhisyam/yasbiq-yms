import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { useUnit } from '#/lib/unit-context'
import { rp, BULAN_NAMES } from '#/lib/format'
import {
  getTransaksiList, createTransaksi, updateTransaksi, getRingkasanKas, getKategoriList, deleteTransaksi,
  getBankAccountList, getVendorList, getHutangPiutangList, createVendor, getBankRekonsiliasi,
  exportTransaksiExcel,
} from '#/server/keuangan'
import { useState, useEffect } from 'react'
import {
  Plus, ArrowUpRight, ArrowDownRight, X, AlertCircle, Pencil,
  ChevronLeft, ChevronRight, Wallet, Trash2, CheckCircle2, Building2, Tag,
  ArrowUp, ArrowDown, HelpCircle,
} from 'lucide-react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { Combobox } from '#/components/ui/combobox'

export const Route = createFileRoute('/_dashboard/keuangan')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'operator' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: KeuanganPage,
})

function KeuanganPage() {
  const { activeUnit } = useUnit()

  return (
    <div className="space-y-6">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">Manajemen Keuangan</h2>
          <p className="text-sm text-muted-foreground mt-1">Kelola kas, bank, hutang piutang, dan vendor.</p>
        </div>
      </div>

      <KasTab unitId={activeUnit?.id} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// KAS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function KasTab({ unitId }: { unitId?: string }) {
  if (!unitId) return null

  const [list, setList] = useState<any[]>([])
  const [kategoriList, setKategoriList] = useState<any[]>([])
  const [bankList, setBankList] = useState<any[]>([])
  const [vendorList, setVendorList] = useState<any[]>([])
  const [hpList, setHpList] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [rekonsiliasi, setRekonsiliasi] = useState<any>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [tipe, setTipe] = useState<'pemasukan' | 'pengeluaran' | ''>('')
  const { activeUnit } = useUnit()
  const userRole = activeUnit?.role
  const canManage = userRole === 'admin_yayasan' || userRole === 'super_admin'

  const [refType, setRefType] = useState('')
  const [kategoriId, setKategoriId] = useState('')
  const [bankFilter, setBankFilter] = useState('')
  const [tglMulai, setTglMulai] = useState('')
  const [tglAkhir, setTglAkhir] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [sortBy, setSortBy] = useState<'tanggal' | 'jumlah' | 'tipe' | 'keterangan'>('tanggal')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [formError, setFormError] = useState('')
  const [fetchError, setFetchError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [formData, setFormData] = useState({
    tipe: 'pemasukan' as 'pemasukan' | 'pengeluaran',
    jumlah: 0,
    kategoriId: '',
    bankAccountId: '',
    vendorId: '',
    hutangPiutangId: '',
    keterangan: '',
    tanggal: new Date().toISOString().split('T')[0],
    referensi: '',
  })

  const [showFilters, setShowFilters] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [quickVendor, setQuickVendor] = useState(false)
  const [quickVendorForm, setQuickVendorForm] = useState({ nama: '', tipe: 'vendor', kontak: '', telepon: '' })
  const [quickVendorError, setQuickVendorError] = useState('')
  const [quickVendorLoading, setQuickVendorLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const { base64, fileName } = await exportTransaksiExcel({
        data: {
          unitId,
          tipe: (tipe || undefined) as any,
          refType: (refType || undefined) as any,
          kategoriId: kategoriId || undefined,
          bankAccountId: bankFilter || undefined,
          tanggalMulai: tglMulai || undefined,
          tanggalAkhir: tglAkhir || undefined,
          sortBy,
          sortDir,
        },
      })
      const binaryStr = atob(base64)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setFetchError(err.message || 'Gagal mengekspor data')
    } finally {
      setExportLoading(false)
    }
  }

  const fetchData = () => {
    if (!unitId) return
    setLoading(true)
    Promise.all([
      getTransaksiList({ data: { unitId, tipe: (tipe || undefined) as any, refType: (refType || undefined) as any, kategoriId: kategoriId || undefined, bankAccountId: bankFilter || undefined, tanggalMulai: tglMulai || undefined, tanggalAkhir: tglAkhir || undefined, page, pageSize, sortBy, sortDir } }),
      getKategoriList({ data: {} }),
      getBankAccountList({ data: { unitId } }),
      getVendorList({ data: {} }),
      getHutangPiutangList({ data: { unitId } }),
      getRingkasanKas({ data: { unitId, bankAccountId: bankFilter || undefined, tanggalMulai: tglMulai || undefined, tanggalAkhir: tglAkhir || undefined } }),
      getBankRekonsiliasi({ data: { unitId } }),
    ]).then(([trans, kat, bank, ven, hp, ring, rek]) => {
      setList(trans.data)
      setTotal(trans.total)
      setKategoriList(kat)
      setBankList(bank)
      setVendorList(ven)
      setHpList(hp)
      setSummary(ring)
      setRekonsiliasi(rek)
    }).catch((err) => { setFetchError(err.message || 'Gagal memuat data') }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [unitId, tipe, refType, kategoriId, bankFilter, tglMulai, tglAkhir, page, sortBy, sortDir])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSuccessMsg('')
    try {
      if (editItem) {
        const updates: any = { keterangan: formData.keterangan, tanggal: formData.tanggal, bankAccountId: formData.bankAccountId || undefined }
        if (editItem.refType === 'kas' || !editItem.refType) {
          updates.jumlah = formData.jumlah
          updates.tipe = formData.tipe
          updates.hutangPiutangId = formData.hutangPiutangId || undefined
          updates.vendorId = formData.vendorId || undefined
        }
        updates.kategoriId = formData.kategoriId || undefined
        updates.referensi = formData.referensi || undefined
        await updateTransaksi({ data: { id: editItem.id, data: updates } })
      } else {
        await createTransaksi({ data: { ...formData, unitId, jumlah: formData.jumlah, kategoriId: formData.kategoriId || undefined, bankAccountId: formData.bankAccountId || undefined, vendorId: formData.vendorId || undefined, hutangPiutangId: formData.hutangPiutangId || undefined, referensi: formData.referensi || undefined } })
      }
      setSuccessMsg(editItem ? 'Transaksi berhasil diubah' : 'Transaksi berhasil dicatat')
      setIsModalOpen(false)
      setEditItem(null)
      setFormData({ ...formData, jumlah: 0, kategoriId: '', bankAccountId: '', vendorId: '', hutangPiutangId: '', keterangan: '', referensi: '' })
      fetchData()
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan transaksi')
    }
  }

  const openEditModal = (item: any) => {
    setEditItem(item)
    setFormError('')
    setSuccessMsg('')
    setFormData({
      tipe: item.tipe,
      jumlah: item.jumlah,
      kategoriId: item.kategoriId || '',
      bankAccountId: item.bankAccountId || '',
      vendorId: item.vendorId || '',
      hutangPiutangId: item.hutangPiutangId || '',
      keterangan: item.keterangan || '',
      tanggal: item.tanggal || new Date().toISOString().split('T')[0],
      referensi: item.referensi || '',
    })
    setIsModalOpen(true)
  }

  const totalPages = Math.ceil(total / pageSize)
  const filteredKategori = kategoriList.filter((k) => !formData.tipe || k.tipe === formData.tipe)
  const filteredHp = hpList.filter((h) => h.status !== 'lunas' && h.tipe === (formData.tipe === 'pengeluaran' ? 'hutang' : 'piutang'))

  const formatDateTime = (tgl: string, createdAt: string | Date | null) => {
    const d = new Date(createdAt || tgl)
    if (isNaN(d.getTime())) return tgl
    const tglNum = d.getDate()
    const bln = BULAN_NAMES[d.getMonth() + 1] || ''
    const thn = d.getFullYear()
    const jam = String(d.getHours()).padStart(2, '0')
    const menit = String(d.getMinutes()).padStart(2, '0')
    return `${tglNum} ${bln} ${thn}, ${jam}.${menit}`
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className={`grid grid-cols-2 gap-4 ${canManage ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          <div className="nb-card-flat bg-card">
            <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Saldo Kas</p>
              <p className="text-lg md:text-2xl font-heading font-black text-foreground mt-1">
                {rp(summary.saldo)}
              </p>
          </div>
          {canManage && (
            <div className="nb-card-flat bg-card">
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Saldo Bank</p>
              <p className="text-lg md:text-2xl font-heading font-black text-emerald-700 mt-1">
                {rp(summary.saldoBank)}
              </p>
            </div>
          )}
          <div className="nb-card-flat bg-card">
            <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Total Pemasukan</p>
              <p className="text-lg md:text-2xl font-heading font-black text-emerald-600 mt-1">
                {rp(summary.totalPemasukan)}
              </p>
            </div>
            <div className="nb-card-flat bg-card">
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Total Pengeluaran</p>
              <p className="text-lg md:text-2xl font-heading font-black text-rose-600 mt-1">
                {rp(summary.totalPengeluaran)}
              </p>
          </div>
        </div>
      )}

      {/* Bank Reconciliation */}
      {canManage && rekonsiliasi && !rekonsiliasi.seimbang && (
        <div className="p-3 bg-amber-50 border-2 border-amber-800 rounded text-sm">
          <div className="flex items-center justify-between">
            <span className="font-heading font-bold text-amber-800 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Rekonsiliasi Bank — Tidak Seimbang
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-sm font-heading font-bold text-amber-700 uppercase">Saldo Bank (sistem)</p>
              <p className="font-heading font-bold text-sm">{rp(rekonsiliasi.saldoBank)}</p>
            </div>
            <div>
              <p className="text-sm font-heading font-bold text-amber-700 uppercase">Saldo Jurnal (COA 1.1.01)</p>
              <p className="font-heading font-bold text-sm">{rp(rekonsiliasi.saldoJurnal)}</p>
            </div>
          </div>
          <div className="mt-1 pt-1 border-t border-amber-300">
            <p className="text-sm">
              <span className="font-heading font-bold">Selisih: {rp(rekonsiliasi.selisih)}</span>
              <span className="text-muted-foreground ml-2">
                → Bisa disebabkan: transaksi tanpa jurnal, jurnal tanpa update bank, atau edit/hapus transaksi yang tidak sinkron.
              </span>
            </p>
          </div>
        </div>
      )}
      {canManage && rekonsiliasi && rekonsiliasi.seimbang && (
        <div className="p-3 bg-emerald-50 border-2 border-emerald-800 rounded text-sm">
          <span className="font-heading font-bold text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Rekonsiliasi Bank — Seimbang
          </span>
          <span className="text-muted-foreground ml-6">Saldo Bank = Saldo Jurnal ({rp(rekonsiliasi.saldoBank)})</span>
        </div>
      )}

      {canManage && (
        <div className="flex items-center justify-end gap-2">
          <a href="/kategori" className="text-sm font-heading font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer">
            <Tag className="w-3.5 h-3.5" /> Kelola Kategori
          </a>
        </div>
      )}

      <div className="bg-card border-2 border-nb-ink rounded divide-y-2 divide-nb-ink">
        <button onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
          <span className="flex items-center gap-3">
            <svg className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="font-heading font-bold text-sm">Filter</span>
            {(() => {
              const activeCount = [tipe, refType && refType !== 'kas' ? refType : '', kategoriId, bankFilter, tglMulai, tglAkhir].filter(Boolean).length
              return activeCount > 0 ? (
                <span className="text-sm font-heading font-bold bg-nb-sage px-2 py-0.5 rounded border border-nb-ink">{activeCount} aktif</span>
              ) : null
            })()}
          </span>
          <span className="text-sm text-muted-foreground">
            {showFilters ? 'Sembunyikan' : 'Tampilkan'}
          </span>
        </button>
        {showFilters && (
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-heading font-bold mb-1.5 uppercase tracking-wider">Aliran</label>
                <Combobox
                  options={[
                    { value: '', label: 'Semua' },
                    { value: 'pemasukan', label: 'Pemasukan' },
                    { value: 'pengeluaran', label: 'Pengeluaran' },
                  ]}
                  value={tipe}
                  onValueChange={(v) => { setTipe(v as any); setPage(1) }}
                  placeholder="Semua"
                  searchPlaceholder="Cari..."
                  emptyMessage="Tidak ada data"
                  className="w-full"
                  triggerClassName="nb-input text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1.5 uppercase tracking-wider">Sumber</label>
                <Combobox
                  options={[
                    { value: '', label: 'Semua' },
                    { value: 'kas', label: 'Kas Manual' },
                    { value: 'spp', label: 'SPP' },
                    { value: 'gaji', label: 'Gaji' },
                    { value: 'penyusutan', label: 'Penyusutan' },
                    { value: 'penyesuaian', label: 'Penyesuaian' },
                    { value: 'penutup', label: 'Penutup' },
                    { value: 'dana', label: 'Dana' },
                  ]}
                  value={refType}
                  onValueChange={(v) => { setRefType(v); setPage(1) }}
                  placeholder="Semua"
                  searchPlaceholder="Cari..."
                  emptyMessage="Tidak ada data"
                  className="w-full"
                  triggerClassName="nb-input text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1.5 uppercase tracking-wider">Kategori</label>
                <Combobox
                  options={[
                    { value: '', label: 'Semua' },
                    ...(kategoriList.map((k) => ({ value: k.id, label: k.nama })) || []),
                  ]}
                  value={kategoriId}
                  onValueChange={(v) => { setKategoriId(v); setPage(1) }}
                  placeholder="Semua"
                  searchPlaceholder="Cari..."
                  emptyMessage="Tidak ada data"
                  className="w-full"
                  triggerClassName="nb-input text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1.5 uppercase tracking-wider">Bank</label>
                <Combobox
                  options={[
                    { value: '', label: 'Semua' },
                    ...(bankList.map((b) => ({ value: b.id, label: `${b.namaBank} — ${b.nomorRekening}` })) || []),
                  ]}
                  value={bankFilter}
                  onValueChange={(v) => { setBankFilter(v); setPage(1) }}
                  placeholder="Semua"
                  searchPlaceholder="Cari..."
                  emptyMessage="Tidak ada data"
                  className="w-full"
                  triggerClassName="nb-input text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1.5 uppercase tracking-wider">Dari</label>
                <input type="date" value={tglMulai} onChange={(e) => { setTglMulai(e.target.value); setPage(1) }} className="nb-input text-sm" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1.5 uppercase tracking-wider">Sampai</label>
                <input type="date" value={tglAkhir} onChange={(e) => { setTglAkhir(e.target.value); setPage(1) }} className="nb-input text-sm" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={() => setShowHelp(true)}
          className="nb-btn nb-btn-secondary cursor-pointer w-auto justify-center text-sm" title="Panduan Input Kas">
          <HelpCircle className="w-4 h-4" /> Bantuan
        </button>
        <button onClick={handleExport} disabled={exportLoading}
          className="nb-btn nb-btn-outline cursor-pointer w-auto justify-center text-sm">
          {exportLoading ? 'Mengexport...' : 'Export Excel'}
        </button>
        <button onClick={() => { setFormError(''); setSuccessMsg(''); setEditItem(null); setIsModalOpen(true); setFormData({ tipe: 'pemasukan', jumlah: 0, kategoriId: '', bankAccountId: '', vendorId: '', hutangPiutangId: '', keterangan: '', tanggal: new Date().toISOString().split('T')[0], referensi: '' }) }}
          className="nb-btn nb-btn-primary cursor-pointer w-full md:w-auto justify-center">
          <Plus className="w-4 h-4" /> Catat Transaksi
        </button>
      </div>

      {fetchError && (
        <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {fetchError}
          <button onClick={fetchData} className="ml-auto text-sm underline font-bold cursor-pointer">Coba Lagi</button>
        </div>
      )}

      {loading ? (
        <div className="h-40 bg-muted animate-pulse border-2 border-nb-ink rounded" />
      ) : list.length === 0 ? (
        <div className="text-center py-12 bg-card border-2 border-nb-ink rounded">
          <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-heading font-bold text-muted-foreground">Belum Ada Transaksi Kas</p>
        </div>
      ) : (
        <>
          <div className="nb-table-wrapper bg-card">
            <table className="nb-table">
              <thead>
                <tr>
                  <th className="cursor-pointer hover:bg-muted-foreground/10" onClick={() => { if (sortBy === 'tanggal') setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy('tanggal'); setSortDir('asc') } }}>
                    Tanggal {sortBy === 'tanggal' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 inline" /> : <ArrowDown className="w-3 h-3 inline" />) : ''}
                  </th>
                  <th className="cursor-pointer hover:bg-muted-foreground/10" onClick={() => { if (sortBy === 'keterangan') setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy('keterangan'); setSortDir('asc') } }}>
                    Keterangan {sortBy === 'keterangan' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 inline" /> : <ArrowDown className="w-3 h-3 inline" />) : ''}
                  </th>
                  <th className="hidden md:table-cell">Kategori</th>
                  <th className="hidden md:table-cell">Sumber</th>
                  <th className="hidden md:table-cell">Bank</th>
                  <th className="cursor-pointer hover:bg-muted-foreground/10" onClick={() => { if (sortBy === 'tipe') setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy('tipe'); setSortDir('asc') } }}>
                    Aliran {sortBy === 'tipe' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 inline" /> : <ArrowDown className="w-3 h-3 inline" />) : ''}
                  </th>
                  <th className="cursor-pointer hover:bg-muted-foreground/10 text-right" onClick={() => { if (sortBy === 'jumlah') setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy('jumlah'); setSortDir('asc') } }}>
                    Jumlah {sortBy === 'jumlah' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 inline" /> : <ArrowDown className="w-3 h-3 inline" />) : ''}
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id}>
                    <td className="text-sm font-mono whitespace-nowrap">{formatDateTime(t.tanggal, t.createdAt)}</td>
                    <td>
                      <p className="text-sm font-heading font-semibold">{t.keterangan}</p>
                      {t.referensi && (
                        <p className="text-sm text-muted-foreground">
                          Ref: {t.referensi.startsWith('spp/') ? (
                            <a href={`/spp/${t.referensi.replace('spp/', '')}`} className="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">Lihat Detail SPP</a>
                          ) : t.referensi.startsWith('tagihan/') ? (
                            <a href={`/tagihan/${t.referensi.replace('tagihan/', '')}`} className="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">Lihat Detail Tagihan</a>
                          ) : t.referensi}
                        </p>
                      )}
                      {t.siswa && (
                        <a href={`/siswa/${t.siswa.id}`} className="text-sm text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">
                          {t.siswa.nama} {t.siswa.nis ? `(${t.siswa.nis})` : ''}
                        </a>
                      )}
                      {t.vendor && <p className="text-sm text-nb-ink-soft">{t.vendor.nama}</p>}
                    </td>
                    <td className="hidden md:table-cell">
                      {t.kategori && <span className="text-sm font-heading font-semibold" style={{ color: t.kategori.warna }}>{t.kategori.nama}</span>}
                    </td>
                    <td className="hidden md:table-cell">
                      {t.refType && (
                        <span className={`text-sm font-heading font-bold px-1.5 py-0.5 border ${
                          t.refType === 'kas' ? 'bg-slate-100 border-slate-800 text-slate-800' :
                          t.refType === 'spp' ? 'bg-blue-100 border-blue-800 text-blue-800' :
                          t.refType === 'gaji' ? 'bg-amber-100 border-amber-800 text-amber-800' :
                          t.refType === 'penyusutan' ? 'bg-purple-100 border-purple-800 text-purple-800' :
                          t.refType === 'penyesuaian' ? 'bg-cyan-100 border-cyan-800 text-cyan-800' :
                          t.refType === 'penutup' ? 'bg-rose-100 border-rose-800 text-rose-800' :
                          t.refType === 'dana' ? 'bg-emerald-100 border-emerald-800 text-emerald-800' : ''
                        }`}>
                          {t.refType === 'kas' ? 'Kas' :
                           t.refType === 'spp' ? 'SPP' :
                           t.refType === 'gaji' ? 'Gaji' :
                           t.refType === 'penyusutan' ? 'Depresiasi' :
                           t.refType === 'penyesuaian' ? 'Penyesuaian' :
                           t.refType === 'penutup' ? 'Penutup' :
                           t.refType === 'dana' ? 'Dana' : t.refType}
                        </span>
                      )}
                    </td>
                    <td className="hidden md:table-cell text-sm">{t.bankAccount?.namaBank || '—'}</td>
                    <td>
                      <span className={`text-sm font-heading font-bold px-1.5 py-0.5 border ${
                        t.tipe === 'pemasukan' ? 'bg-emerald-100 border-emerald-800 text-emerald-800' : 'bg-rose-100 border-rose-800 text-rose-800'
                      }`}>
                        {t.tipe === 'pemasukan' ? 'Masuk' : 'Keluar'}
                      </span>
                    </td>
                    <td className={`font-heading font-black text-sm whitespace-nowrap ${t.tipe === 'pemasukan' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {t.tipe === 'pemasukan' ? '+' : '-'}{rp(t.jumlah)}
                    </td>
                    <td>
                      {canManage && (
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => openEditModal(t)}
                            className="p-1 hover:bg-blue-100 rounded cursor-pointer"><Pencil className="w-3 h-3 text-blue-600" /></button>
                          {t.refType === 'kas' && (
                            <button onClick={() => setConfirmDelete({ message: `Yakin ingin menghapus transaksi "${t.keterangan}"?`, onConfirm: async () => { try { await deleteTransaksi({ data: { id: t.id } }); setConfirmDelete(null); fetchData() } catch (e: any) { alert(e.message) } } })}
                              className="p-1 hover:bg-rose-100 rounded cursor-pointer"><Trash2 className="w-3 h-3 text-rose-600" /></button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && total > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-card border-2 border-nb-ink rounded p-4">
              <span className="text-sm text-muted-foreground">{list.length} dari {total} transaksi</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="nb-btn nb-btn-secondary px-2 py-1 disabled:opacity-40 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
                <span className="font-heading font-semibold text-sm flex items-center px-3 border-2 border-nb-ink rounded">{page} / {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                  className="nb-btn nb-btn-secondary px-2 py-1 disabled:opacity-40 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-lg md:mx-4 shadow-lg max-h-[90dvh] flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0 rounded-t-lg">
              <h3 className="font-heading font-bold text-sm">{editItem ? 'Edit Transaksi' : 'Catat Aliran Kas'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditItem(null) }} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
              {successMsg && (
                <div className="p-3 mb-4 bg-emerald-100 border-2 border-emerald-800 text-emerald-800 text-sm font-semibold rounded flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMsg}
                </div>
              )}
              {formError && (
                <div className="p-3 mb-4 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}
              <form id="kasForm" onSubmit={handleSubmit} className="space-y-4">
              {(!editItem || editItem.refType === 'kas' || !editItem.refType) ? (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setFormData({ ...formData, tipe: 'pemasukan', kategoriId: '' })}
                    className={`flex-1 py-2 text-sm font-heading font-bold border-2 border-nb-ink rounded cursor-pointer ${
                      formData.tipe === 'pemasukan' ? 'bg-emerald-100 text-emerald-800' : 'bg-card text-muted-foreground'
                    }`}><ArrowUpRight className="w-4 h-4 inline mr-1" /> Pemasukan</button>
                  <button type="button" onClick={() => setFormData({ ...formData, tipe: 'pengeluaran', kategoriId: '' })}
                    className={`flex-1 py-2 text-sm font-heading font-bold border-2 border-nb-ink rounded cursor-pointer ${
                      formData.tipe === 'pengeluaran' ? 'bg-rose-100 text-rose-800' : 'bg-card text-muted-foreground'
                    }`}><ArrowDownRight className="w-4 h-4 inline mr-1" /> Pengeluaran</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className={`flex-1 py-2 text-sm font-heading font-bold border-2 border-nb-ink rounded text-center ${
                    formData.tipe === 'pemasukan' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {formData.tipe === 'pemasukan' ? <><ArrowUpRight className="w-4 h-4 inline mr-1" /> Pemasukan</> : <><ArrowDownRight className="w-4 h-4 inline mr-1" /> Pengeluaran</>}
                  </div>
                </div>
              )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Jumlah (Rp)</label>
                    <input type="number" required value={formData.jumlah || ''}
                      onChange={(e) => setFormData({ ...formData, jumlah: parseInt(e.target.value) || 0 })}
                      className="nb-input" autoFocus
                      disabled={!!(editItem && editItem.refType && editItem.refType !== 'kas')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tanggal</label>
                    <input type="date" required value={formData.tanggal}
                      onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} className="nb-input" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Kategori</label>
                  <Combobox
                    options={filteredKategori.map((k) => ({ value: k.id, label: k.nama }))}
                    value={formData.kategoriId}
                    onValueChange={(v) => setFormData({ ...formData, kategoriId: v })}
                    placeholder="Pilih Kategori"
                    searchPlaceholder="Cari..."
                    emptyMessage="Tidak ada data"
                    className="w-full"
                    triggerClassName="nb-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Bank</label>
                    <Combobox
                      options={(bankList.filter((b) => b.aktif) || []).map((b) => ({ value: b.id, label: `${b.namaBank} — ${b.nomorRekening}` }))}
                      value={formData.bankAccountId}
                      onValueChange={(v) => setFormData({ ...formData, bankAccountId: v })}
                      placeholder="Pilih Bank"
                      searchPlaceholder="Cari..."
                      emptyMessage="Tidak ada data"
                      className="w-full"
                      triggerClassName="nb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Vendor</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Combobox
                          options={(vendorList.filter((v) => v.aktif) || []).map((v) => ({ value: v.id, label: v.nama }))}
                          value={formData.vendorId}
                          onValueChange={(v) => setFormData({ ...formData, vendorId: v })}
                          placeholder="Pilih Vendor"
                          searchPlaceholder="Cari..."
                          emptyMessage="Tidak ada data"
                          className="w-full"
                          triggerClassName="nb-input"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => { setQuickVendor(true); setQuickVendorForm({ nama: '', tipe: 'vendor', kontak: '', telepon: '' }); setQuickVendorError('') }}
                        className="p-2 bg-card border-2 border-nb-ink rounded hover:bg-secondary/50 cursor-pointer shrink-0"
                        title="Tambah Vendor Baru"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {(!editItem || editItem.refType === 'kas' || !editItem.refType) && (
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">
                    {formData.tipe === 'pengeluaran' ? 'Hutang' : 'Piutang'}
                  </label>
                  <Combobox
                    options={filteredHp.map((h) => ({ value: h.id, label: `${h.deskripsi} — ${rp(h.sisa)} (${h.vendor?.nama || h.pihak || '—'})` }))}
                    value={formData.hutangPiutangId}
                    onValueChange={(v) => setFormData({ ...formData, hutangPiutangId: v })}
                    placeholder="Tidak Terkait"
                    searchPlaceholder="Cari..."
                    emptyMessage="Tidak ada data"
                    className="w-full"
                    triggerClassName="nb-input"
                  />
                </div>
                )}

                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Keterangan</label>
                  <textarea required value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    className="nb-input h-16 resize-none" placeholder="Deskripsi transaksi" />
                </div>

                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">No. Referensi <span className="font-normal lowercase">(opsional)</span></label>
                  <input type="text" value={formData.referensi}
                    onChange={(e) => setFormData({ ...formData, referensi: e.target.value })}
                    className="nb-input" placeholder="Invoice / kuitansi" />
                </div>
              </form>
            </div>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-3 bg-card rounded-b-lg">
              <button type="button" onClick={() => { setIsModalOpen(false); setEditItem(null) }} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
              <button type="submit" form="kasForm" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Vendor */}
      {quickVendor && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-sm flex flex-col">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> Tambah Vendor Baru</h3>
              <button onClick={() => setQuickVendor(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {quickVendorError && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{quickVendorError}</div>}
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama Vendor</label>
                <input value={quickVendorForm.nama} onChange={(e) => setQuickVendorForm({ ...quickVendorForm, nama: e.target.value })} className="nb-input" placeholder="Nama vendor" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tipe</label>
                  <Combobox
                    options={[{value: 'vendor', label: 'Vendor'}, {value: 'supplier', label: 'Supplier'}, {value: 'customer', label: 'Customer'}, {value: 'lainnya', label: 'Lainnya'}]}
                    value={quickVendorForm.tipe}
                    onValueChange={(v) => setQuickVendorForm({ ...quickVendorForm, tipe: v })}
                    className="w-full"
                    triggerClassName="nb-input text-sm"
                    placeholder="Pilih..."
                    searchPlaceholder="Cari..."
                    emptyMessage="Tidak ada data"
                  />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Kontak</label>
                  <input value={quickVendorForm.kontak} onChange={(e) => setQuickVendorForm({ ...quickVendorForm, kontak: e.target.value })} className="nb-input" placeholder="Nama kontak" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Telepon</label>
                <input value={quickVendorForm.telepon} onChange={(e) => setQuickVendorForm({ ...quickVendorForm, telepon: e.target.value })} className="nb-input" placeholder="No. telepon" />
              </div>
            </div>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex gap-3 justify-end bg-card rounded-b-lg">
              <button onClick={() => setQuickVendor(false)} className="nb-btn nb-btn-secondary cursor-pointer">Batal</button>
              <button
                onClick={async () => {
                  if (!quickVendorForm.nama.trim()) { setQuickVendorError('Nama wajib diisi'); return }
                  if (!unitId) return
                  setQuickVendorLoading(true); setQuickVendorError('')
                  try {
                    const created = await createVendor({ data: { nama: quickVendorForm.nama.trim(), tipe: quickVendorForm.tipe as any, kontak: quickVendorForm.kontak || undefined, telepon: quickVendorForm.telepon || undefined } })
                    setFormData({ ...formData, vendorId: created.id })
                    setVendorList((prev: any[]) => [...prev, created])
                    setQuickVendor(false)
                  } catch (err: any) { setQuickVendorError(err.message) } finally { setQuickVendorLoading(false) }
                }}
                disabled={quickVendorLoading}
                className="nb-btn nb-btn-primary cursor-pointer"
              >
                {quickVendorLoading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-lg md:mx-4 shadow-lg max-h-[85dvh] flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2"><HelpCircle className="w-4 h-4" /> Panduan Input Kas</h3>
              <button onClick={() => setShowHelp(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto text-sm space-y-4">
              <div>
                <h4 className="font-heading font-bold text-sm mb-2">Cara Input Transaksi</h4>
                <div className="space-y-2 text-muted-foreground leading-relaxed">
                  <p><span className="font-heading font-bold text-foreground">1.</span> Pilih <b>tipe</b>: <span className="text-emerald-700 font-heading font-bold">Pemasukan</span> atau <span className="text-rose-700 font-heading font-bold">Pengeluaran</span></p>
                  <p><span className="font-heading font-bold text-foreground">2.</span> Isi <b>jumlah</b> (Rp) — angka bulat, minimal Rp 1</p>
                  <p><span className="font-heading font-bold text-foreground">3.</span> Pilih <b>Kategori</b> — ini menentukan akun COA yang dipakai untuk jurnal. Contoh: "Penerimaan SPP" → COA <code className="bg-secondary px-1 rounded">4.1.01 Pendapatan SPP</code></p>
                  <p><span className="font-heading font-bold text-foreground">4.</span> Pilih <b>Bank/Kas</b> (opsional) — jika dikosongkan, saldo bank tidak terpengaruh</p>
                  <p><span className="font-heading font-bold text-foreground">5.</span> Isi <b>Keterangan</b> — wajib diisi, minimal 1 karakter. Gunakan deskripsi jelas seperti "Pembayaran SPP Juni — Ahmad"</p>
                  <p><span className="font-heading font-bold text-foreground">6.</span> <b>Tanggal</b> otomatis hari ini, bisa diubah</p>
                  <p><span className="font-heading font-bold text-foreground">7.</span> Klik <b>Simpan</b></p>
                </div>
              </div>

              <div className="border-t-2 border-nb-ink pt-3">
                <h4 className="font-heading font-bold text-sm mb-2">Apa yang terjadi setelah Simpan?</h4>
                <div className="space-y-2 text-muted-foreground leading-relaxed">
                  <p>🔹 Transaksi tercatat di <b>tabel Kas</b> di halaman ini</p>
                  <p>🔹 Otomatis dibuat <b>Jurnal Double-Entry</b>:
                    <span className="block ml-4 mt-1 p-2 bg-secondary/30 border border-nb-ink rounded text-[11px] font-mono">
                      {`Pemasukan:  Debit Kas (1.1.01)  ·  Kredit Pendapatan (4.1.xx)`}<br/>
                      {`Pengeluaran: Debit Beban (5.1.xx) ·  Kredit Kas (1.1.01)`}
                    </span>
                  </p>
                  <p>🔹 Langsung muncul di <b>6 Laporan ISAK 35</b>:<br/>
                    <span className="ml-4">→ Laporan Posisi Keuangan</span><br/>
                    <span className="ml-4">→ Laporan Penghasilan Komprehensif</span><br/>
                    <span className="ml-4">→ Neraca Saldo (Trial Balance)</span><br/>
                    <span className="ml-4">→ Buku Besar</span><br/>
                    <span className="ml-4">→ Arus Kas</span><br/>
                    <span className="ml-4">→ Perubahan Aset Neto</span>
                  </p>
                </div>
              </div>

              <div className="border-t-2 border-nb-ink pt-3">
                <h4 className="font-heading font-bold text-sm mb-2">Tips</h4>
                <div className="space-y-1 text-muted-foreground leading-relaxed">
                  <p>🔹 <b>Mapping COA</b>: lihat halaman <b>System → Kategori</b> untuk mengatur kode COA per kategori</p>
                  <p>🔹 <b>Sort kolom</b>: klik header kolom (Tanggal, Jumlah, Aliran) untuk urutkan</p>
                  <p>🔹 <b>Filter</b>: gunakan dropdown di atas tabel untuk filter by tipe, kategori, bank, atau tanggal</p>
                  <p>🔹 <b>Transaksi terkunci</b>: transaksi dari SPP/Tagihan/Gaji/BOS tidak bisa dihapus manual — hapus dari menu sumbernya</p>
                  <p>🔹 <b>Jurnal selalu seimbang</b>: setiap transaksi menghasilkan Debit = Kredit, menjamin laporan selalu balance</p>
                </div>
              </div>
            </div>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex justify-end bg-card rounded-b-lg">
              <button onClick={() => setShowHelp(false)} className="nb-btn nb-btn-primary cursor-pointer text-sm">Mengerti</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={confirmDelete !== null} onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete?.onConfirm()} message={confirmDelete?.message || ''} />
    </div>
  )
}


