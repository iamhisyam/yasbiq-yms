import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession } from '#/server/auth'
import {
  getUnits,
  createUnit,
  updateUnit,
  toggleUnitActive,
  deleteUnit,
} from '#/server/unit'
import { useState, useEffect } from 'react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Power,
  PowerOff,
  School,
} from 'lucide-react'
import { Combobox } from '#/components/ui/combobox'

export const Route = createFileRoute('/_dashboard/unit')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    if (!(session.user as any).isSuperAdmin) throw redirect({ to: '/siswa' })
  },
  component: UnitPage,
})

const JENJANG_LABELS: Record<string, string> = {
  TK: 'TK',
  SD: 'SD',
  SMP: 'SMP',
  SMA: 'SMA',
  SMK: 'SMK',
  Lainnya: 'Lainnya',
}

function UnitPage() {
  const [units, setUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ nama: '', jenjang: 'SD' as string, alamat: '', telepon: '', kepalaUnit: '' })
  const [createError, setCreateError] = useState('')

  const [editUnit, setEditUnit] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({ nama: '', jenjang: '', alamat: '', telepon: '', kepalaUnit: '' })
  const [editError, setEditError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{message: string; onConfirm: () => void} | null>(null)

  const fetchUnits = () => {
    setLoading(true)
    getUnits()
      .then(setUnits)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUnits() }, [])

  const totalPages = Math.ceil(units.length / pageSize)
  const paginatedUnits = units.slice((page - 1) * pageSize, page * pageSize)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    try {
      await createUnit({ data: createForm as any })
      setIsCreateOpen(false)
      setCreateForm({ nama: '', jenjang: 'SD', alamat: '', telepon: '', kepalaUnit: '' })
      fetchUnits()
    } catch (err: any) {
      setCreateError(err.message || 'Gagal membuat unit')
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUnit) return
    setEditError('')
    try {
      await updateUnit({ data: { id: editUnit.id, ...editForm } as any })
      setEditUnit(null)
      fetchUnits()
    } catch (err: any) {
      setEditError(err.message || 'Gagal mengupdate unit')
    }
  }

  const handleToggleActive = async (id: string) => {
    try {
      await toggleUnitActive({ data: { id } })
      fetchUnits()
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status unit')
    }
  }

  const handleDelete = (id: string, nama: string) => {
    setConfirmDelete({
      message: `Yakin ingin menghapus unit "${nama}"? Semua data terkait akan ikut terhapus.`,
      onConfirm: async () => {
        try {
          await deleteUnit({ data: { id } })
          fetchUnits()
          setConfirmDelete(null)
        } catch (err: any) {
          alert(err.message || 'Gagal menghapus unit')
        }
      },
    })
  }

  const openEdit = (u: any) => {
    setEditUnit(u)
    setEditForm({ nama: u.nama, jenjang: u.jenjang, alamat: u.alamat || '', telepon: u.telepon || '', kepalaUnit: u.kepalaUnit || '' })
    setEditError('')
  }

  const activeUnits = units.filter((u) => u.aktif).length
  const inactiveUnits = units.filter((u) => !u.aktif).length

  return (
    <div className="space-y-6">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">Unit Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola unit sekolah di bawah naungan yayasan.
          </p>
        </div>
      </div>

      {/* Stats + Action */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="nb-stat-card bg-[#FFFDF5] [--accent-bar:var(--nb-sage)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 border-2 border-nb-ink rounded shadow-sm">
              <Building2 className="w-5 h-5 text-blue-800" />
            </div>
            <div>
              <span className="text-sm font-heading font-semibold text-muted-foreground uppercase">TOTAL UNIT</span>
              <h3 className="font-heading font-bold text-xl mt-0.5">{units.length} Unit</h3>
            </div>
          </div>
        </div>
        <div className="nb-stat-card bg-[#FFFDF5] [--accent-bar:var(--nb-marigold)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 border-2 border-nb-ink rounded shadow-sm">
              <School className="w-5 h-5 text-emerald-800" />
            </div>
            <div>
              <span className="text-sm font-heading font-semibold text-muted-foreground uppercase">AKTIF</span>
              <h3 className="font-heading font-bold text-xl mt-0.5">{activeUnits} Unit</h3>
            </div>
          </div>
        </div>
        <div className="nb-stat-card bg-[#FFFDF5] [--accent-bar:var(--nb-lavender)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 border-2 border-nb-ink rounded shadow-sm">
              <PowerOff className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <span className="text-sm font-heading font-semibold text-muted-foreground uppercase">NONAKTIF</span>
              <h3 className="font-heading font-bold text-xl mt-0.5">{inactiveUnits} Unit</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => {
            setCreateForm({ nama: '', jenjang: 'SD', alamat: '', telepon: '', kepalaUnit: '' })
            setCreateError('')
            setIsCreateOpen(true)
          }}
          className="nb-btn nb-btn-primary text-sm cursor-pointer w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" /> Tambah Unit Baru
        </button>
      </div>

      {/* Units Table */}
      <div className="nb-table-wrapper bg-card">
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted rounded border-2 border-nb-ink" />
            ))}
          </div>
        ) : (
          <>
              <table className="nb-table">
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Jenjang</th>
                    <th className="hidden md:table-cell">Kepala Unit</th>
                    <th className="hidden md:table-cell">Status</th>
                    <th className="w-[120px]">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUnits.map((u) => (
                    <tr key={u.id} className={!u.aktif ? 'opacity-60' : ''}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-secondary border-2 border-nb-ink rounded flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-heading font-bold text-sm text-foreground truncate">{u.nama}</p>
                            <p className="text-sm text-muted-foreground truncate hidden md:block">{u.alamat || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-sm uppercase bg-accent/40 border border-nb-ink/30 px-2 py-0.5 rounded font-heading font-semibold">
                          {JENJANG_LABELS[u.jenjang] || u.jenjang}
                        </span>
                      </td>
                      <td className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">{u.kepalaUnit || '-'}</span>
                      </td>
                      <td className="hidden md:table-cell">
                        {u.aktif ? (
                          <span className="text-sm font-heading font-semibold text-emerald-700 bg-emerald-100 border border-emerald-800 px-2 py-0.5 rounded-full">Aktif</span>
                        ) : (
                          <span className="text-sm font-heading font-semibold text-amber-700 bg-amber-100 border border-amber-800 px-2 py-0.5 rounded-full">Nonaktif</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(u)} className="p-1.5 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer" title="Edit unit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(u.id)}
                            className={`p-1.5 border-2 border-nb-ink rounded cursor-pointer ${u.aktif ? 'bg-card hover:bg-amber-100' : 'bg-card hover:bg-emerald-100'}`}
                            title={u.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                          >
                            {u.aktif ? <PowerOff className="w-3.5 h-3.5 text-amber-600" /> : <Power className="w-3.5 h-3.5 text-emerald-600" />}
                          </button>
                          <button onClick={() => handleDelete(u.id, u.nama)} className="p-1.5 bg-card border-2 border-nb-ink rounded hover:bg-rose-100 cursor-pointer" title="Hapus unit">
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedUnits.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                        Belum ada unit sekolah
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

            {totalPages > 1 && (
              <div className="p-4 border-t-2 border-nb-ink flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{units.length} unit total</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="nb-btn nb-btn-secondary px-2 py-1 text-sm disabled:opacity-30 cursor-pointer">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-2.5 py-1 border-2 border-nb-ink rounded text-sm font-heading font-bold cursor-pointer ${p === page ? 'bg-secondary shadow-none translate-y-0.5' : 'bg-card hover:bg-muted-foreground/10'}`}
                    >
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="nb-btn nb-btn-secondary px-2 py-1 text-sm disabled:opacity-30 cursor-pointer">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-md md:mx-4 shadow-lg max-h-[90dvh] flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Tambah Unit Baru</h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-4 md:p-6 space-y-4 overflow-y-auto">
              {createError && (
                <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> <span>{createError}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama Unit</label>
                <input type="text" required value={createForm.nama} onChange={(e) => setCreateForm({ ...createForm, nama: e.target.value })} className="nb-input" placeholder="e.g. SMA Annahl" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Jenjang</label>
                <Combobox
                  options={Object.entries(JENJANG_LABELS).map(([k, v]) => ({value: k, label: v}))}
                  value={createForm.jenjang}
                  onValueChange={(v) => setCreateForm({ ...createForm, jenjang: v })}
                  triggerClassName="nb-input"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Kepala Unit (Opsional)</label>
                <input type="text" value={createForm.kepalaUnit} onChange={(e) => setCreateForm({ ...createForm, kepalaUnit: e.target.value })} className="nb-input" placeholder="Nama kepala sekolah" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Alamat (Opsional)</label>
                <input type="text" value={createForm.alamat} onChange={(e) => setCreateForm({ ...createForm, alamat: e.target.value })} className="nb-input" placeholder="Jl. ..." />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Telepon (Opsional)</label>
                <input type="text" value={createForm.telepon} onChange={(e) => setCreateForm({ ...createForm, telepon: e.target.value })} className="nb-input" placeholder="021-..." />
              </div>
              <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="submit" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">Buat Unit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editUnit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-md md:mx-4 shadow-lg max-h-[90dvh] flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Edit Unit</h3>
              <button onClick={() => setEditUnit(null)} className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-4 md:p-6 space-y-4 overflow-y-auto">
              {editError && (
                <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> <span>{editError}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama Unit</label>
                <input type="text" required value={editForm.nama} onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })} className="nb-input" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Jenjang</label>
                <Combobox
                  options={Object.entries(JENJANG_LABELS).map(([k, v]) => ({value: k, label: v}))}
                  value={editForm.jenjang}
                  onValueChange={(v) => setEditForm({ ...editForm, jenjang: v })}
                  triggerClassName="nb-input"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Kepala Unit</label>
                <input type="text" value={editForm.kepalaUnit} onChange={(e) => setEditForm({ ...editForm, kepalaUnit: e.target.value })} className="nb-input" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Alamat</label>
                <input type="text" value={editForm.alamat} onChange={(e) => setEditForm({ ...editForm, alamat: e.target.value })} className="nb-input" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Telepon</label>
                <input type="text" value={editForm.telepon} onChange={(e) => setEditForm({ ...editForm, telepon: e.target.value })} className="nb-input" />
              </div>
              <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setEditUnit(null)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="submit" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) confirmDelete.onConfirm() }}
        message={confirmDelete?.message || ''}
      />
    </div>
  )
}
