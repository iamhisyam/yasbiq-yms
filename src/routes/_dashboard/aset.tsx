import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { useUnit } from '#/lib/unit-context'
import { Combobox } from '#/components/ui/combobox'
import {
  getAsetList, createAset, updateAset, deleteAset,
  getRingkasanAset, getLaporanAsetCoretax,
} from '#/server/aset'
import { useState, useEffect, lazy, Suspense } from 'react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import {
  Plus, Pencil, Trash2, X, AlertCircle, ChevronLeft, ChevronRight,
  Search, Building2, FileText,
} from 'lucide-react'

const PDFViewer = lazy(() =>
  import('@react-pdf/renderer').then((mod) => ({ default: mod.PDFViewer })),
)
import { LaporanAsetPDF } from '#/components/laporan-aset-pdf'

export const Route = createFileRoute('/_dashboard/aset')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'admin_yayasan' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: AsetPage,
})

function rp(n: number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n) }

const KATEGORI_OPTS = [
  { value: '', label: 'Semua Kategori' },
  { value: 'tanah', label: 'Tanah' },
  { value: 'gedung', label: 'Gedung' },
  { value: 'kendaraan', label: 'Kendaraan' },
  { value: 'peralatan', label: 'Peralatan' },
  { value: 'inventaris', label: 'Inventaris' },
  { value: 'lainnya', label: 'Lainnya' },
]

const KATEGORI_COLOR: Record<string, string> = {
  tanah: 'bg-amber-100 text-amber-800 border-amber-800',
  gedung: 'bg-blue-100 text-blue-800 border-blue-800',
  kendaraan: 'bg-purple-100 text-purple-800 border-purple-800',
  peralatan: 'bg-cyan-100 text-cyan-800 border-cyan-800',
  inventaris: 'bg-emerald-100 text-emerald-800 border-emerald-800',
  lainnya: 'bg-gray-100 text-gray-800 border-gray-800',
}

function AsetPage() {
  const { activeUnit, yayasanFilterUnitId, units } = useUnit()

  const [list, setList] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 15

  const [ringkasan, setRingkasan] = useState<any>(null)
  const [laporan, setLaporan] = useState<any>(null)
  const [laporanTahun, setLaporanTahun] = useState(new Date().getFullYear())
  const [showLaporan, setShowLaporan] = useState(false)

  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [formUnitId, setFormUnitId] = useState('')
  const [form, setForm] = useState({
    kodeAset: '', nama: '', kategori: 'lainnya', tanggalPerolehan: '',
    hargaPerolehan: 0, masaManfaat: '', metodePenyusutan: 'garis_lurus',
    nilaiResidu: 0, lokasi: '', keterangan: '', status: 'aktif',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      getAsetList({ data: { unitId: yayasanFilterUnitId, search: search || undefined, kategori: filterKategori || undefined, status: filterStatus || undefined, page, pageSize } }),
      getRingkasanAset({ data: { unitId: yayasanFilterUnitId } }),
    ]).then(([d, r]) => { setList(d.data); setTotal(d.total); setRingkasan(r) }).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [yayasanFilterUnitId, page, search, filterKategori, filterStatus])

  const openModal = (item: any | null) => {
    setEditItem(item); setError('')
    setFormUnitId(item ? item.unitId || '' : yayasanFilterUnitId === 'all' ? '' : yayasanFilterUnitId)
    setForm(item ? {
      kodeAset: item.kodeAset || '', nama: item.nama,
      kategori: item.kategori, tanggalPerolehan: item.tanggalPerolehan || '',
      hargaPerolehan: item.hargaPerolehan, masaManfaat: String(item.masaManfaat || ''),
      metodePenyusutan: item.metodePenyusutan || 'garis_lurus',
      nilaiResidu: item.nilaiResidu || 0, lokasi: item.lokasi || '',
      keterangan: item.keterangan || '', status: item.status || 'aktif',
    } : {
      kodeAset: '', nama: '', kategori: 'lainnya', tanggalPerolehan: new Date().toISOString().split('T')[0],
      hargaPerolehan: 0, masaManfaat: '', metodePenyusutan: 'garis_lurus',
      nilaiResidu: 0, lokasi: '', keterangan: '', status: 'aktif',
    })
    setModal(true)
  }

  const handleSubmit = async () => {
    if (!form.nama.trim()) { setError('Nama aset wajib diisi'); return }
    if (!form.tanggalPerolehan) { setError('Tanggal perolehan wajib diisi'); return }
    if (!form.hargaPerolehan || form.hargaPerolehan <= 0) { setError('Harga perolehan wajib diisi'); return }
    if (!formUnitId) { setError('Pilih unit'); return }
    setSaving(true); setError('')
    try {
      const data = {
        ...form,
        kodeAset: form.kodeAset || undefined,
        masaManfaat: form.masaManfaat ? Number(form.masaManfaat) : undefined,
        lokasi: form.lokasi || undefined,
        keterangan: form.keterangan || undefined,
        hargaPerolehan: Number(form.hargaPerolehan),
        nilaiResidu: Number(form.nilaiResidu),
        kategori: form.kategori as any,
        metodePenyusutan: form.metodePenyusutan as any,
        status: form.status as any,
      }
      if (editItem) {
        const r = await updateAset({ data: { id: editItem.id, data: { ...data, unitId: formUnitId || undefined } } })
        setList((prev) => prev.map((a) => a.id === r.id ? r : a))
      } else {
        const r = await createAset({ data: { unitId: formUnitId, ...data } })
        setList((prev) => [r, ...prev])
        setTotal((prev) => prev + 1)
      }
      setModal(false); fetchData()
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  const fetchLaporan = async () => {
    try {
      const r = await getLaporanAsetCoretax({ data: { unitId: yayasanFilterUnitId, tahunPajak: laporanTahun } })
      setLaporan(r); setShowLaporan(true)
    } catch (err: any) { alert(err.message) }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <div className="nb-page-header flex items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="nb-page-title">Manajemen Aset Tetap</h2>
          <p className="text-sm text-muted-foreground mt-1">Kelola aset tetap yayasan (tanah, gedung, kendaraan, peralatan, inventaris) — format sesuai Coretax SPT Tahunan PPh Badan.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLaporan} className="nb-btn nb-btn-secondary cursor-pointer shrink-0">
            <FileText className="w-4 h-4" /> Laporan Coretax
          </button>
          <button onClick={() => openModal(null)} className="nb-btn nb-btn-primary cursor-pointer shrink-0">
            <Plus className="w-4 h-4" /> Tambah Aset
          </button>
        </div>
      </div>

      {/* Ringkasan */}
      {ringkasan && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card border-2 border-nb-ink rounded p-3">
            <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Total Aset</p>
            <p className="text-lg font-heading font-bold mt-0.5">{ringkasan.totalAset} item</p>
          </div>
          <div className="bg-card border-2 border-nb-ink rounded p-3">
            <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Harga Perolehan</p>
            <p className="text-lg font-heading font-bold mt-0.5">{rp(ringkasan.totalHarga)}</p>
          </div>
          <div className="bg-card border-2 border-nb-ink rounded p-3">
            <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Akum. Penyusutan</p>
            <p className="text-lg font-heading font-bold mt-0.5 text-rose-700">{rp(ringkasan.totalPenyusutan)}</p>
          </div>
          <div className="bg-card border-2 border-nb-ink rounded p-3">
            <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Nilai Buku</p>
            <p className="text-lg font-heading font-bold mt-0.5 text-emerald-700">{rp(ringkasan.totalNilaiBuku)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="w-4 h-4 text-muted-foreground" /></span>
          <input type="text" placeholder="Cari nama/kode aset..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="nb-input pl-9" />
        </div>
        <Combobox
          options={KATEGORI_OPTS}
          value={filterKategori}
          onValueChange={(v) => { setFilterKategori(v); setPage(1) }}
          triggerClassName="nb-input text-sm"
          className="w-full"
          placeholder="Pilih..."
          searchPlaceholder="Cari..."
          emptyMessage="Tidak ada data"
        />
        <Combobox
          options={[
            { value: '', label: 'Semua Status' },
            { value: 'aktif', label: 'Aktif' },
            { value: 'dijual', label: 'Dijual' },
            { value: 'dihapuskan', label: 'Dihapuskan' },
          ]}
          value={filterStatus}
          onValueChange={(v) => { setFilterStatus(v); setPage(1) }}
          triggerClassName="nb-input text-sm"
          className="w-full"
          placeholder="Pilih..."
          searchPlaceholder="Cari..."
          emptyMessage="Tidak ada data"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="h-40 bg-muted animate-pulse border-2 border-nb-ink rounded" />
      ) : list.length === 0 ? (
        <div className="text-center py-12 bg-card border-2 border-nb-ink rounded">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-heading font-bold text-muted-foreground">Belum Ada Aset Tetap</p>
          <p className="text-sm text-muted-foreground mt-1">Tambah aset tetap untuk melengkapi laporan Neraca dan SPT Tahunan.</p>
        </div>
      ) : (
        <div className="nb-table-wrapper bg-card">
          <table className="nb-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama</th>
                <th>Unit</th>
                <th>Kategori</th>
                <th className="hidden md:table-cell">Tgl. Perolehan</th>
                <th className="text-right">Harga Perolehan</th>
                <th className="hidden md:table-cell text-right">Akum. Penyusutan</th>
                <th className="text-right">Nilai Buku</th>
                <th className="w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="text-sm font-mono text-muted-foreground">{a.kodeAset || '-'}</td>
                  <td className="font-heading font-bold text-sm">{a.nama}</td>
                  <td className="text-sm">{a.unit?.nama || '-'}</td>
                  <td>
                    <span className={`text-sm px-2 py-0.5 rounded border font-heading font-bold ${KATEGORI_COLOR[a.kategori] || ''}`}>
                      {a.kategori}
                    </span>
                  </td>
                  <td className="hidden md:table-cell text-sm">{a.tanggalPerolehan || '-'}</td>
                  <td className="text-right text-sm">{rp(a.hargaPerolehan)}</td>
                  <td className="hidden md:table-cell text-right text-sm text-rose-600">{rp(a.akumulasiPenyusutan)}</td>
                  <td className="text-right text-sm font-heading font-bold">{rp(a.hargaPerolehan - a.akumulasiPenyusutan)}</td>
                  <td>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openModal(a)} className="p-1.5 hover:bg-muted-foreground/10 rounded cursor-pointer"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setConfirmDelete({ message: `Hapus aset "${a.nama}"?`, onConfirm: async () => { await deleteAset({ data: { id: a.id } }); setConfirmDelete(null); fetchData() } })} className="p-1.5 hover:bg-rose-100 rounded cursor-pointer"><Trash2 className="w-4 h-4 text-rose-600" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{total} aset</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="nb-btn nb-btn-secondary px-2 py-1 cursor-pointer disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-heading font-bold">{page}/{totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="nb-btn nb-btn-secondary px-2 py-1 cursor-pointer disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Laporan Coretax Modal */}
      {showLaporan && laporan && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-5xl flex flex-col" style={{ height: '90dvh' }}>
            <div className="p-3 border-b-2 border-nb-ink flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="font-heading font-bold text-sm">Laporan Aset Tetap — Coretax SPT Tahunan PPh Badan</h3>
                <div className="flex items-center gap-1">
                  <label className="text-sm font-heading font-bold">Tahun Pajak:</label>
                  <input type="number" value={laporanTahun} onChange={(e) => setLaporanTahun(Number(e.target.value))} className="nb-input w-20 text-sm h-7 py-1" />
                  <button onClick={fetchLaporan} className="text-sm font-heading font-bold text-primary hover:underline cursor-pointer">Terapkan</button>
                </div>
              </div>
              <button onClick={() => setShowLaporan(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
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
                  <LaporanAsetPDF data={laporan} />
                </PDFViewer>
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit */}
      {modal && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-lg flex flex-col max-h-[90dvh]">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">{editItem ? 'Edit' : 'Tambah'} Aset Tetap</h3>
              <button onClick={() => setModal(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 flex-1 min-h-0 overflow-y-auto space-y-3">
              {error && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Unit</label>
                <Combobox
                  options={[{ value: '', label: 'Pilih Unit...' }, ...units.map((u: any) => ({ value: u.id, label: `${u.nama} (${u.jenjang})` }))]}
                  value={formUnitId}
                    onValueChange={setFormUnitId}
                    triggerClassName="nb-input"
                    className="w-full"
                  />
                </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Kode Aset</label>
                  <input value={form.kodeAset} onChange={(e) => setForm({ ...form, kodeAset: e.target.value })} className="nb-input" placeholder="e.g. TN-001, GD-001" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Kategori</label>
                  <Combobox
                    options={KATEGORI_OPTS.filter((o) => o.value)}
                    value={form.kategori}
                    onValueChange={(v) => setForm({ ...form, kategori: v })}
                    triggerClassName="nb-input text-sm"
                    className="w-full"
                    placeholder="Pilih..."
                    searchPlaceholder="Cari..."
                    emptyMessage="Tidak ada data"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama Aset</label>
                <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="nb-input" placeholder="Nama aset" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tanggal Perolehan</label>
                  <input type="date" value={form.tanggalPerolehan} onChange={(e) => setForm({ ...form, tanggalPerolehan: e.target.value })} className="nb-input" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Harga Perolehan (Rp)</label>
                  <input type="number" min={0} value={form.hargaPerolehan || ''} onChange={(e) => setForm({ ...form, hargaPerolehan: Number(e.target.value) || 0 })} className="nb-input" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Masa Manfaat (thn)</label>
                  <input type="number" min={0} value={form.masaManfaat} onChange={(e) => setForm({ ...form, masaManfaat: e.target.value })} className="nb-input" placeholder="e.g. 20" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Metode Penyusutan</label>
                  <Combobox
                    options={[
                      { value: 'garis_lurus', label: 'Garis Lurus' },
                      { value: 'saldo_menurun', label: 'Saldo Menurun' },
                    ]}
                    value={form.metodePenyusutan}
                    onValueChange={(v) => setForm({ ...form, metodePenyusutan: v })}
                    triggerClassName="nb-input text-sm"
                    className="w-full"
                    placeholder="Pilih..."
                    searchPlaceholder="Cari..."
                    emptyMessage="Tidak ada data"
                  />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nilai Residu (Rp)</label>
                  <input type="number" min={0} value={form.nilaiResidu || ''} onChange={(e) => setForm({ ...form, nilaiResidu: Number(e.target.value) || 0 })} className="nb-input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Lokasi</label>
                  <input value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} className="nb-input" placeholder="Lokasi aset" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Status</label>
                  <Combobox
                    options={[
                      { value: 'aktif', label: 'Aktif' },
                      { value: 'dijual', label: 'Dijual' },
                      { value: 'dihapuskan', label: 'Dihapuskan' },
                    ]}
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                    triggerClassName="nb-input text-sm"
                    className="w-full"
                    placeholder="Pilih..."
                    searchPlaceholder="Cari..."
                    emptyMessage="Tidak ada data"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Keterangan</label>
                <textarea value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} className="nb-input" rows={2} />
              </div>
            </div>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex gap-3 justify-end bg-card rounded-b-lg">
              <button onClick={() => setModal(false)} className="nb-btn nb-btn-secondary cursor-pointer">Batal</button>
              <button onClick={handleSubmit} disabled={saving} className="nb-btn nb-btn-primary cursor-pointer">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => { confirmDelete?.onConfirm(); setConfirmDelete(null) }} title="Konfirmasi" message={confirmDelete?.message || ''} />
    </div>
  )
}
