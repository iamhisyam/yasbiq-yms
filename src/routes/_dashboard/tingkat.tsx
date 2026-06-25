import { createFileRoute } from '@tanstack/react-router'
import { useUnit } from '#/lib/unit-context'
import { getTingkatList, createTingkat, updateTingkat, deleteTingkat } from '#/server/tingkat'
import { useState, useEffect } from 'react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import {
  Layers, Plus, Pencil, Trash2, X, AlertCircle,
} from 'lucide-react'

export const Route = createFileRoute('/_dashboard/tingkat')({
  component: TingkatPage,
})

function TingkatPage() {
  const { activeUnit } = useUnit()
  const canManage = activeUnit?.role === 'admin_yayasan' || activeUnit?.role === 'super_admin'
  const unitId = activeUnit?.id
  if (!unitId) return null

  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState({ nama: '', kode: '', urutan: 0, keterangan: '' })
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const fetchData = () => {
    if (!unitId) return
    setLoading(true)
    getTingkatList({ data: { unitId } }).then(setList).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [unitId])

  const openModal = (item: any | null) => {
    setEditItem(item); setError('')
    setForm(item ? { nama: item.nama, kode: item.kode || '', urutan: item.urutan || 0, keterangan: item.keterangan || '' } : { nama: '', kode: '', urutan: 0, keterangan: '' })
    setModal(true)
  }

  const handleSubmit = async () => {
    if (!form.nama.trim()) { setError('Nama wajib diisi'); return }
    setActionLoading(true); setError('')
    try {
      if (editItem) {
        await updateTingkat({ data: { id: editItem.id, ...form, keterangan: form.keterangan || undefined, kode: form.kode || undefined } })
      } else {
        await createTingkat({ data: { unitId, ...form, keterangan: form.keterangan || undefined, kode: form.kode || undefined } })
      }
      setModal(false); fetchData()
    } catch (err: any) { setError(err.message) } finally { setActionLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">Master Tingkat</h2>
          <p className="text-sm text-muted-foreground mt-1">Kelola tingkat/ jenjang pendidikan (TK, SD, SMP, 7, 8, 9, X, XI, XII, dll).</p>
        </div>
      </div>

      {canManage && (
        <div className="flex justify-end">
          <button onClick={() => openModal(null)} className="nb-btn nb-btn-primary cursor-pointer shrink-0">
            <Plus className="w-4 h-4" /> Tambah Tingkat
          </button>
        </div>
      )}

      {loading ? (
        <div className="h-40 bg-muted animate-pulse border-2 border-nb-ink rounded" />
      ) : list.length === 0 ? (
        <div className="text-center py-12 bg-card border-2 border-nb-ink rounded">
          <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-heading font-bold text-muted-foreground">Belum Ada Tingkat</p>
          <p className="text-sm text-muted-foreground mt-1">Tambah tingkat untuk digunakan di Kelas dan Setting SPP.</p>
        </div>
      ) : (
        <div className="nb-table-wrapper bg-card">
          <table className="nb-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Kode</th>
                <th>Urutan</th>
                <th className="hidden md:table-cell">Keterangan</th>
                {canManage && <th className="w-24 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id}>
                  <td className="font-heading font-bold text-sm">{item.nama}</td>
                  <td className="text-sm text-muted-foreground">{item.kode || '-'}</td>
                  <td className="text-sm">{item.urutan || 0}</td>
                  <td className="hidden md:table-cell text-sm text-muted-foreground">{item.keterangan || '-'}</td>
                  {canManage && (
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openModal(item)} className="p-1.5 hover:bg-muted-foreground/10 rounded cursor-pointer"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setConfirmDelete({ message: `Hapus tingkat "${item.nama}"?`, onConfirm: async () => { await deleteTingkat({ data: { id: item.id } }); setConfirmDelete(null); fetchData() } })} className="p-1.5 hover:bg-rose-100 rounded cursor-pointer"><Trash2 className="w-4 h-4 text-rose-600" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-md flex flex-col max-h-[85dvh]">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">{editItem ? 'Edit' : 'Tambah'} Tingkat</h3>
              <button onClick={() => setModal(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {error && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama</label>
                <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="nb-input" placeholder="Contoh: TK, 7, X" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Kode (opsional)</label>
                  <input value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })} className="nb-input" placeholder="Singkatan" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Urutan</label>
                  <input type="number" min={0} value={form.urutan} onChange={(e) => setForm({ ...form, urutan: Number(e.target.value) || 0 })} className="nb-input" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Keterangan</label>
                <textarea value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} className="nb-input" rows={2} />
              </div>
            </div>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex gap-3 justify-end bg-card rounded-b-lg">
              <button onClick={() => setModal(false)} className="nb-btn nb-btn-secondary cursor-pointer">Batal</button>
              <button onClick={handleSubmit} disabled={actionLoading} className="nb-btn nb-btn-primary cursor-pointer">{actionLoading ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => { confirmDelete?.onConfirm(); setConfirmDelete(null) }} title="Konfirmasi" message={confirmDelete?.message || ''} />
    </div>
  )
}
