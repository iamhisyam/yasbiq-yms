import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { getVendorList, createVendor, updateVendor } from '#/server/keuangan'
import { useState, useEffect } from 'react'
import { Plus, Pencil, X, AlertCircle } from 'lucide-react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { Combobox } from '#/components/ui/combobox'

export const Route = createFileRoute('/_dashboard/vendor')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'super_admin' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: VendorPage,
})

function VendorPage() {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTipe, setFilterTipe] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({ nama: '', tipe: 'vendor' as string, npwp: '', kontak: '', telepon: '', email: '', alamat: '', keterangan: '' })
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const TIPE_LABEL: Record<string, string> = { vendor: 'Vendor', supplier: 'Supplier', customer: 'Customer', lainnya: 'Lainnya' }

  const fetchData = () => {
    setLoading(true)
    getVendorList({ data: { tipe: (filterTipe || undefined) as any } }).then(setList).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [filterTipe])

  const openModal = (item: any) => {
    setEditItem(item)
    setFormData(item ? { nama: item.nama, tipe: item.tipe, npwp: item.npwp || '', kontak: item.kontak || '', telepon: item.telepon || '', email: item.email || '', alamat: item.alamat || '', keterangan: item.keterangan || '' } : { nama: '', tipe: 'vendor', npwp: '', kontak: '', telepon: '', email: '', alamat: '', keterangan: '' })
    setFormError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    try {
      if (editItem) {
        await updateVendor({ data: { id: editItem.id, nama: formData.nama, tipe: formData.tipe as any, npwp: formData.npwp || undefined, kontak: formData.kontak || undefined, telepon: formData.telepon || undefined, email: formData.email || undefined, alamat: formData.alamat || undefined, keterangan: formData.keterangan || undefined } })
      } else {
        await createVendor({ data: { nama: formData.nama, tipe: formData.tipe as any, npwp: formData.npwp || undefined, kontak: formData.kontak || undefined, telepon: formData.telepon || undefined, email: formData.email || undefined, alamat: formData.alamat || undefined, keterangan: formData.keterangan || undefined } })
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
          <h2 className="nb-page-title">Vendor & Mitra</h2>
          <p className="text-sm text-muted-foreground mt-1">Kelola data vendor, supplier, dan mitra yayasan.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Combobox
            options={[{value: '', label: 'Semua Tipe'}, ...Object.entries(TIPE_LABEL).map(([v, l]) => ({value: v, label: l}))]}
            value={filterTipe}
            onValueChange={(v) => setFilterTipe(v)}
            className="w-auto"
            triggerClassName="nb-input text-sm"
            placeholder="Pilih..."
            searchPlaceholder="Cari..."
            emptyMessage="Tidak ada data"
          />
        </div>
        <button onClick={() => openModal(null)} className="nb-btn nb-btn-primary text-sm cursor-pointer w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4" /> Tambah Baru
        </button>
      </div>

      <div className="nb-table-wrapper bg-card">
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1,2,3].map((i) => <div key={i} className="h-12 bg-muted rounded border-2 border-nb-ink" />)}
          </div>
        ) : (
          <table className="nb-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Tipe</th>
                <th>NPWP</th>
                <th>Kontak</th>
                <th className="w-[80px]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.map((v: any) => (
                <tr key={v.id}>
                  <td className="font-heading font-bold text-sm">{v.nama}</td>
                  <td><span className="text-sm uppercase border px-1 py-0.5 rounded-sm font-heading font-semibold">{TIPE_LABEL[v.tipe] || v.tipe}</span></td>
                  <td className="text-sm text-muted-foreground">{v.npwp || '-'}</td>
                  <td className="text-sm text-muted-foreground">{v.kontak || v.telepon || v.email || '-'}</td>
                  <td>
                    <button onClick={() => openModal(v)} className="p-1.5 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">Belum ada data</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-md md:mx-4 shadow-lg max-h-[90dvh] flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">{editItem ? 'Edit' : 'Tambah'} Vendor</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 overflow-y-auto">
              {formError && <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{formError}</span></div>}

              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Nama</label>
                <input type="text" required value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} className="nb-input" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Tipe</label>
                <Combobox
                  options={Object.entries(TIPE_LABEL).map(([v, l]) => ({value: v, label: l}))}
                  value={formData.tipe}
                  onValueChange={(v) => setFormData({...formData, tipe: v})}
                  className="w-full"
                  triggerClassName="nb-input text-sm"
                  placeholder="Pilih..."
                  searchPlaceholder="Cari..."
                  emptyMessage="Tidak ada data"
                />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">NPWP</label>
                <input type="text" value={formData.npwp} onChange={(e) => setFormData({...formData, npwp: e.target.value})} className="nb-input" placeholder="xx.xxx.xxx.x-xxx.xxx" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase">Kontak</label>
                  <input type="text" value={formData.kontak} onChange={(e) => setFormData({...formData, kontak: e.target.value})} className="nb-input" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase">Telepon</label>
                  <input type="text" value={formData.telepon} onChange={(e) => setFormData({...formData, telepon: e.target.value})} className="nb-input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="nb-input" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Alamat</label>
                <textarea value={formData.alamat} onChange={(e) => setFormData({...formData, alamat: e.target.value})} className="nb-input" rows={2} />
              </div>

              <div className="border-t-2 border-nb-ink pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="submit" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">{editItem ? 'Simpan' : 'Tambah'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} onConfirm={() => confirmDelete?.onConfirm()} message={confirmDelete?.message || ''} />
    </div>
  )
}