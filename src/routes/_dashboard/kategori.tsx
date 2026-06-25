import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  getKategoriList, createKategori, updateKategori, deleteKategori, getCoaList,
} from '#/server/keuangan'
import { useState, useEffect } from 'react'
import { getCurrentSession, requireRole } from '#/server/auth'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { Combobox } from '#/components/ui/combobox'
import { Tag, Plus, Pencil, Trash2, X, AlertCircle, Layers } from 'lucide-react'

export const Route = createFileRoute('/_dashboard/kategori')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'super_admin' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: KategoriPage,
})

function KategoriPage() {
  const [list, setList] = useState<any[]>([])
  const [coaList, setCoaList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTipe, setFilterTipe] = useState('')

  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState({ nama: '', tipe: 'pemasukan' as 'pemasukan' | 'pengeluaran', warna: '#6366f1', kodeCoretax: '', coaKode: '', keterangan: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      getKategoriList({ data: {} }),
      getCoaList(),
    ]).then(([kat, coa]) => { setList(kat); setCoaList(coa) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const coaOptions = form.tipe === 'pemasukan'
    ? coaList.filter((c: any) => c.tipe === 'pendapatan')
    : coaList.filter((c: any) => c.tipe === 'beban')

  const coaMap = Object.fromEntries(coaList.map((c: any) => [c.kode, c.nama]))

  const openModal = (item: any | null) => {
    setEditItem(item)
    setForm(item ? {
      nama: item.nama, tipe: item.tipe, warna: item.warna || '#6366f1',
      kodeCoretax: item.kodeCoretax || '', coaKode: item.coaKode || '',
      keterangan: item.keterangan || '',
    } : { nama: '', tipe: 'pemasukan', warna: '#6366f1', kodeCoretax: '', coaKode: '', keterangan: '' })
    setError('')
    setModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = { ...form, kodeCoretax: form.kodeCoretax || undefined, coaKode: form.coaKode || undefined, keterangan: form.keterangan || undefined }
      if (editItem) {
        await updateKategori({ data: { id: editItem.id, ...payload } })
      } else {
        await createKategori({ data: payload })
      }
      setModal(false)
      fetchData()
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string, nama: string) => {
    setConfirmDelete({ message: `Yakin hapus kategori "${nama}"?`, onConfirm: async () => {
      try { await deleteKategori({ data: { id } }); fetchData(); setConfirmDelete(null) } catch (err: any) { alert(err.message) }
    }})
  }

  const filtered = list.filter((k) => !filterTipe || k.tipe === filterTipe)
  const tipeList = [...new Set(list.map((k) => k.tipe))] as string[]

  return (
    <div className="space-y-6">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">Kategori Transaksi</h2>
          <p className="text-sm text-muted-foreground mt-1">Kelola kategori pemasukan dan pengeluaran untuk kas & pembukuan.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Combobox
            options={[{value: '', label: 'Semua Tipe'}, ...tipeList.map((t) => ({value: t, label: t.charAt(0).toUpperCase() + t.slice(1)}))]}
            value={filterTipe}
            onValueChange={(v) => setFilterTipe(v)}
            className="w-auto"
            triggerClassName="nb-input text-sm"
            placeholder="Pilih..."
            searchPlaceholder="Cari..."
            emptyMessage="Tidak ada data"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openModal(null)} className="nb-btn nb-btn-primary text-sm cursor-pointer">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      <div className="nb-table-wrapper bg-card">
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1,2,3].map((i) => <div key={i} className="h-10 bg-muted rounded border-2 border-nb-ink" />)}
          </div>
        ) : (
          <table className="nb-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Tipe</th>
                <th>Kode COA</th>
                <th>Coretax</th>
                <th className="w-[100px]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((k) => (
                <tr key={k.id}>
                  <td className="font-heading font-bold text-sm flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border border-nb-ink" style={{ backgroundColor: k.warna || '#6366f1' }} />
                    {k.nama}
                  </td>
                  <td><span className={`text-sm uppercase font-heading font-bold px-1.5 py-0.5 rounded-sm border ${k.tipe === 'pemasukan' ? 'bg-emerald-100 border-emerald-800 text-emerald-800' : 'bg-rose-100 border-rose-800 text-rose-800'}`}>{k.tipe}</span></td>
                  <td className="text-sm font-mono">{k.coaKode ? <span className="font-heading font-semibold">{k.coaKode} <span className="text-muted-foreground font-normal">{coaMap[k.coaKode] || ''}</span></span> : <span className="text-muted-foreground italic">—</span>}</td>
                  <td className="text-sm text-muted-foreground">{k.kodeCoretax || '-'}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openModal(k)} className="p-1.5 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(k.id, k.nama)} className="p-1.5 bg-card border-2 border-nb-ink rounded hover:bg-rose-100 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-rose-600" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">Belum ada kategori</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-md md:mx-4 shadow-lg max-h-[90dvh] flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">{editItem ? 'Edit' : 'Tambah'} Kategori</h3>
              <button onClick={() => setModal(false)} className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 overflow-y-auto">
              {error && <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span></div>}

              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Nama Kategori</label>
                <input type="text" required value={form.nama} onChange={(e) => setForm({...form, nama: e.target.value})} className="nb-input" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Tipe</label>
                <Combobox
                  options={[{value: 'pemasukan', label: 'Pemasukan'}, {value: 'pengeluaran', label: 'Pengeluaran'}]}
                  value={form.tipe}
                  onValueChange={(v) => setForm({...form, tipe: v as any, coaKode: ''})}
                  className="w-full"
                  triggerClassName="nb-input text-sm"
                  placeholder="Pilih..."
                  searchPlaceholder="Cari..."
                  emptyMessage="Tidak ada data"
                />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">
                  Kode COA <span className="font-normal text-muted-foreground">({form.tipe === 'pemasukan' ? 'Pendapatan' : 'Beban'})</span>
                </label>
                <Combobox
                  options={[{value: '', label: 'Auto (default)'}, ...coaOptions.map((c: any) => ({value: c.kode, label: `${c.kode} — ${c.nama}`}))]}
                  value={form.coaKode}
                  onValueChange={(v) => setForm({...form, coaKode: v})}
                  className="w-full"
                  triggerClassName="nb-input text-sm"
                  placeholder="Auto (default)"
                  searchPlaceholder="Cari kode COA..."
                  emptyMessage="COA tidak ditemukan — jalankan Seed Data Dummy"
                />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Kode Coretax</label>
                <input type="text" value={form.kodeCoretax} onChange={(e) => setForm({...form, kodeCoretax: e.target.value})} className="nb-input" placeholder="e.g. 411281" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Keterangan</label>
                <input type="text" value={form.keterangan} onChange={(e) => setForm({...form, keterangan: e.target.value})} className="nb-input" />
              </div>

              <div className="border-t-2 border-nb-ink pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setModal(false)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="submit" disabled={saving} className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">{saving ? 'Menyimpan...' : editItem ? 'Simpan' : 'Tambah'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} onConfirm={() => confirmDelete?.onConfirm()} message={confirmDelete?.message || ''} />
    </div>
  )
}