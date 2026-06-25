import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { useUnit } from '#/lib/unit-context'
import {
  getHutangPiutangList, createHutangPiutang, updateHutangPiutang, getRingkasanHutangPiutang,
  getVendorList,
} from '#/server/keuangan'
import { getPegawaiList } from '#/server/pegawai'
import { useState, useEffect } from 'react'
import { TrendingUp, Plus, BookOpen, Pencil, X, AlertCircle, FileText } from 'lucide-react'

import { Combobox } from '#/components/ui/combobox'

export const Route = createFileRoute('/_dashboard/hutang-piutang')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'admin_yayasan' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: HutangPage,
})

function formatRupiah(n: number) { return new Intl.NumberFormat('id-ID').format(n) }

function HutangPage() {
  const { activeUnit, yayasanFilterUnitId, units } = useUnit()

  const [list, setList] = useState<any[]>([])
  const [vendorList, setVendorList] = useState<any[]>([])
  const [pegawaiList, setPegawaiList] = useState<any[]>([])
  const [ringkasan, setRingkasan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filterTipe, setFilterTipe] = useState<'hutang' | 'piutang' | ''>('')
  const [filterStatus, setFilterStatus] = useState<'belum_lunas' | 'cicil' | 'lunas' | ''>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [formUnitId, setFormUnitId] = useState('')
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    tipe: 'hutang' as 'hutang' | 'piutang',
    jumlah: 0,
    vendorId: '',
    pegawaiId: '',
    pihak: '',
    deskripsi: '',
    tanggal: new Date().toISOString().split('T')[0],
    jatuhTempo: '',
    kategori: 'lainnya' as string,
    status: 'belum_lunas' as string,
  })

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      getHutangPiutangList({ data: { unitId: yayasanFilterUnitId, tipe: filterTipe || undefined, status: filterStatus || undefined } }),
      getVendorList({ data: {} }),
      getPegawaiList({ data: { unitId: yayasanFilterUnitId, page: 1, pageSize: 100 } }),
      getRingkasanHutangPiutang({ data: { unitId: yayasanFilterUnitId } }),
    ]).then(([hp, ven, peg, ring]) => { setList(hp); setVendorList(ven); setPegawaiList(peg.data); setRingkasan(ring) })
      .catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [yayasanFilterUnitId, filterTipe, filterStatus])

  const openModal = (item: any) => {
    setEditItem(item)
    setFormUnitId(item ? '' : yayasanFilterUnitId === 'all' ? '' : yayasanFilterUnitId)
    setFormData(item ? {
      tipe: item.tipe, jumlah: item.jumlah, vendorId: item.vendorId || '', pegawaiId: item.pegawaiId || '', pihak: item.pihak || '', deskripsi: item.deskripsi || '', tanggal: item.tanggal?.split('T')[0] || '', jatuhTempo: item.jatuhTempo?.split('T')[0] || '', kategori: item.kategori || 'lainnya', status: item.status || 'belum_lunas',
    } : {
      tipe: 'hutang', jumlah: 0, vendorId: '', pegawaiId: '', pihak: '', deskripsi: '', tanggal: new Date().toISOString().split('T')[0], jatuhTempo: '', kategori: 'lainnya', status: 'belum_lunas',
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!editItem && !formUnitId) { setFormError('Pilih unit'); return }
    try {
      if (editItem) {
        await updateHutangPiutang({ data: { id: editItem.id, jumlah: formData.jumlah, vendorId: formData.vendorId || undefined, pegawaiId: formData.pegawaiId || undefined, pihak: formData.pihak || undefined, deskripsi: formData.deskripsi, jatuhTempo: formData.jatuhTempo || undefined, kategori: formData.kategori as any, status: formData.status as any } })
      } else {
        await createHutangPiutang({ data: { unitId: formUnitId, tipe: formData.tipe, jumlah: formData.jumlah, vendorId: formData.vendorId || undefined, pegawaiId: formData.pegawaiId || undefined, pihak: formData.pihak || undefined, deskripsi: formData.deskripsi, tanggal: formData.tanggal, jatuhTempo: formData.jatuhTempo || undefined, kategori: formData.kategori as any } })
      }
      setModalOpen(false)
      fetchData()
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan')
    }
  }

  return (
    <div className="space-y-6">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">Hutang & Piutang</h2>
          <p className="text-sm text-muted-foreground mt-1">Catat dan pantau hutang usaha & piutang yayasan.</p>
        </div>
      </div>

      {/* Ringkasan */}
      {ringkasan && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="nb-stat-card bg-rose-50"><div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 border-2 border-rose-800 rounded shadow-sm"><TrendingUp className="w-5 h-5 text-rose-800" /></div>
            <div><span className="text-sm uppercase font-heading font-semibold text-muted-foreground">Total Hutang</span><h3 className="font-heading font-bold text-xl mt-0.5">{formatRupiah(ringkasan.totalHutang)}</h3></div>
          </div></div>
          <div className="nb-stat-card bg-blue-50"><div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 border-2 border-blue-800 rounded shadow-sm"><BookOpen className="w-5 h-5 text-blue-800" /></div>
            <div><span className="text-sm uppercase font-heading font-semibold text-muted-foreground">Total Piutang</span><h3 className="font-heading font-bold text-xl mt-0.5">{formatRupiah(ringkasan.totalPiutang)}</h3></div>
          </div></div>
          <div className="nb-stat-card bg-emerald-50"><div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 border-2 border-emerald-800 rounded shadow-sm"><FileText className="w-5 h-5 text-emerald-800" /></div>
            <div><span className="text-sm uppercase font-heading font-semibold text-muted-foreground">Saldo Bersih</span><h3 className="font-heading font-bold text-xl mt-0.5">{formatRupiah(ringkasan.totalPiutang - ringkasan.totalHutang)}</h3></div>
          </div></div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Combobox
            options={[
              { value: '', label: 'Semua Tipe' },
              { value: 'hutang', label: 'Hutang' },
              { value: 'piutang', label: 'Piutang' },
            ]}
            value={filterTipe}
            onValueChange={(v) => setFilterTipe(v as any)}
            triggerClassName="nb-input text-sm"
            className="w-auto"
            placeholder="Pilih..."
            searchPlaceholder="Cari..."
            emptyMessage="Tidak ada data"
          />
          <Combobox
            options={[
              { value: '', label: 'Semua Status' },
              { value: 'belum_lunas', label: 'Belum Lunas' },
              { value: 'cicil', label: 'Cicil' },
              { value: 'lunas', label: 'Lunas' },
            ]}
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as any)}
            triggerClassName="nb-input text-sm"
            className="w-auto"
            placeholder="Pilih..."
            searchPlaceholder="Cari..."
            emptyMessage="Tidak ada data"
          />
        </div>
        <button onClick={() => openModal(null)} className="nb-btn nb-btn-primary text-sm cursor-pointer w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4" /> Tambah Baru
        </button>
      </div>

      {/* Table */}
      <div className="nb-table-wrapper bg-card">
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1,2,3].map((i) => <div key={i} className="h-12 bg-muted rounded border-2 border-nb-ink" />)}
          </div>
        ) : (
          <table className="nb-table">
            <thead>
              <tr>
                <th>Pihak</th>
                <th>Unit</th>
                <th>Tipe</th>
                <th>Jumlah</th>
                <th>Sisa</th>
                <th>Status</th>
                <th>Jatuh Tempo</th>
                <th className="w-[80px]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item: any) => (
                <tr key={item.id}>
                  <td className="font-heading font-bold text-sm">{item.vendor?.nama || item.pegawai?.nama || item.pihak || '-'}</td>
                  <td className="text-sm text-muted-foreground">{item.unit?.nama || '-'}</td>
                  <td><span className={`text-sm uppercase font-heading font-bold px-1.5 py-0.5 rounded-sm border ${item.tipe === 'hutang' ? 'bg-rose-100 border-rose-800 text-rose-800' : 'bg-blue-100 border-blue-800 text-blue-800'}`}>{item.tipe}</span></td>
                  <td className="font-heading font-bold text-sm">{formatRupiah(item.jumlah)}</td>
                  <td className="font-heading font-bold text-sm">{item.sisa > 0 ? formatRupiah(item.sisa) : '-'}</td>
                  <td><span className={`text-sm px-1.5 py-0.5 rounded-sm font-heading font-semibold ${item.status === 'lunas' ? 'bg-emerald-100 text-emerald-800' : item.status === 'cicil' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>{item.status === 'belum_lunas' ? 'Belum Lunas' : item.status === 'cicil' ? 'Cicil' : 'Lunas'}</span></td>
                  <td className="text-sm text-muted-foreground">{item.jatuhTempo ? new Date(item.jatuhTempo).toLocaleDateString('id-ID') : '-'}</td>
                  <td>
                    <button onClick={() => openModal(item)} className="p-1.5 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-sm text-muted-foreground">Belum ada data</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-lg md:mx-4 shadow-lg max-h-[90dvh] flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">{editItem ? 'Edit' : 'Tambah'} Hutang/Piutang</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 overflow-y-auto">
              {formError && <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{formError}</span></div>}

              {!editItem && (
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase">Unit</label>
                  <Combobox
                    options={[{value: '', label: 'Pilih Unit...'}, ...units.map((u: any) => ({value: u.id, label: `${u.nama} (${u.jenjang})`}))]}
                    value={formUnitId}
                    onValueChange={setFormUnitId}
                    triggerClassName="nb-input"
                    className="w-full"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase">Tipe</label>
                  <Combobox
                    options={[
                      { value: 'hutang', label: 'Hutang' },
                      { value: 'piutang', label: 'Piutang' },
                    ]}
                    value={formData.tipe}
                    onValueChange={(v) => setFormData({...formData, tipe: v as any})}
                    triggerClassName="nb-input text-sm"
                    className="w-full"
                    placeholder="Pilih..."
                    searchPlaceholder="Cari..."
                    emptyMessage="Tidak ada data"
                  />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase">Jumlah</label>
                  <input type="number" required value={formData.jumlah} onChange={(e) => setFormData({...formData, jumlah: Number(e.target.value)})} className="nb-input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Kategori</label>
                <Combobox
                  options={[
                    { value: 'lainnya', label: 'Lainnya' },
                    { value: 'operasional', label: 'Operasional' },
                    { value: 'gedung', label: 'Gedung' },
                    { value: 'kendaraan', label: 'Kendaraan' },
                    { value: 'peralatan', label: 'Peralatan' },
                    { value: 'inventaris', label: 'Inventaris' },
                  ]}
                  value={formData.kategori}
                  onValueChange={(v) => setFormData({...formData, kategori: v})}
                  triggerClassName="nb-input text-sm"
                  className="w-full"
                  placeholder="Pilih..."
                  searchPlaceholder="Cari..."
                  emptyMessage="Tidak ada data"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase">Tanggal</label>
                  <input type="date" required value={formData.tanggal} onChange={(e) => setFormData({...formData, tanggal: e.target.value})} className="nb-input" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase">Jatuh Tempo</label>
                  <input type="date" value={formData.jatuhTempo} onChange={(e) => setFormData({...formData, jatuhTempo: e.target.value})} className="nb-input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Pihak (jika bukan Vendor/Pegawai)</label>
                <input type="text" value={formData.pihak} onChange={(e) => setFormData({...formData, pihak: e.target.value})} className="nb-input" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Vendor (opsional)</label>
                <Combobox
                  options={[{value: '', label: 'Pilih Vendor...'}, ...vendorList.map((v: any) => ({value: v.id, label: v.nama}))]}
                  value={formData.vendorId}
                  onValueChange={(v) => setFormData({...formData, vendorId: v, pegawaiId: ''})}
                  triggerClassName="nb-input"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Pegawai (opsional)</label>
                <Combobox
                  options={[{value: '', label: 'Pilih Pegawai...'}, ...pegawaiList.map((p: any) => ({value: p.id, label: p.nama}))]}
                  value={formData.pegawaiId}
                  onValueChange={(v) => setFormData({...formData, pegawaiId: v, vendorId: ''})}
                  triggerClassName="nb-input"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Deskripsi</label>
                <textarea value={formData.deskripsi} onChange={(e) => setFormData({...formData, deskripsi: e.target.value})} className="nb-input" rows={2} required />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Status</label>
                <Combobox
                  options={[
                    { value: 'belum_lunas', label: 'Belum Lunas' },
                    { value: 'cicil', label: 'Cicil' },
                    { value: 'lunas', label: 'Lunas' },
                  ]}
                  value={formData.status}
                  onValueChange={(v) => setFormData({...formData, status: v})}
                  triggerClassName="nb-input text-sm"
                  className="w-full"
                  placeholder="Pilih..."
                  searchPlaceholder="Cari..."
                  emptyMessage="Tidak ada data"
                />
              </div>

              <div className="border-t-2 border-nb-ink pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="submit" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">{editItem ? 'Simpan' : 'Tambah'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
