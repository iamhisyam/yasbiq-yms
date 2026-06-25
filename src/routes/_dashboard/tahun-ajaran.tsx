import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { useUnit } from '#/lib/unit-context'
import {
  getTahunAjaranList,
  createTahunAjaran,
  updateTahunAjaran,
  deleteTahunAjaran,
} from '#/server/tahun-ajaran'
import { useState, useEffect } from 'react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

export const Route = createFileRoute('/_dashboard/tahun-ajaran')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'admin_yayasan' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: TahunAjaranPage,
})

function TahunAjaranPage() {
  const { activeUnit } = useUnit()

  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ nama: '', tanggalMulai: '', tanggalSelesai: '' })
  const [createError, setCreateError] = useState('')

  const [editItem, setEditItem] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({ nama: '', tanggalMulai: '', tanggalSelesai: '', aktif: true })
  const [editError, setEditError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{message: string; onConfirm: () => void} | null>(null)

  const fetchData = () => {
    if (!activeUnit) return
    setLoading(true)
    setFetchError('')
    getTahunAjaranList({ data: { unitId: activeUnit.id } })
      .then(setList)
      .catch((err: any) => setFetchError(err.message || 'Gagal memuat data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [activeUnit])

  const totalPages = Math.ceil(list.length / pageSize) || 1
  const paginated = list.slice((page - 1) * pageSize, page * pageSize)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeUnit) return
    setCreateError('')
    try {
      await createTahunAjaran({ data: { unitId: activeUnit.id, ...createForm } })
      setIsCreateOpen(false)
      setCreateForm({ nama: '', tanggalMulai: '', tanggalSelesai: '' })
      fetchData()
    } catch (err: any) {
      setCreateError(err.message || 'Gagal membuat tahun ajaran')
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editItem) return
    setEditError('')
    try {
      await updateTahunAjaran({ data: { id: editItem.id, ...editForm } })
      setEditItem(null)
      fetchData()
    } catch (err: any) {
      setEditError(err.message || 'Gagal mengupdate tahun ajaran')
    }
  }

  const handleToggleAktif = async (item: any) => {
    try {
      await updateTahunAjaran({ data: { id: item.id, aktif: !item.aktif } })
      fetchData()
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status')
    }
  }

  const handleDelete = (id: string, nama: string) => {
    setConfirmDelete({
      message: `Yakin ingin menghapus tahun ajaran "${nama}"?`,
      onConfirm: async () => {
        try {
          await deleteTahunAjaran({ data: { id } })
          fetchData()
          setConfirmDelete(null)
        } catch (err: any) {
          alert(err.message || 'Gagal menghapus tahun ajaran')
        }
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">Tahun Ajaran</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola tahun ajaran untuk unit {activeUnit?.nama}.
          </p>
        </div>
        <button
          onClick={() => {
            setCreateForm({ nama: '', tanggalMulai: '', tanggalSelesai: '' })
            setCreateError('')
            setIsCreateOpen(true)
          }}
          className="nb-btn nb-btn-primary cursor-pointer w-full md:w-auto justify-center"
        >
          <Plus className="w-4 h-4" /> Tambah Tahun Ajaran
        </button>
      </div>

      {fetchError && (
        <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> <span>{fetchError}</span>
          <button onClick={fetchData} className="ml-auto text-sm underline font-bold cursor-pointer">Coba Lagi</button>
        </div>
      )}

      <div className="nb-table-wrapper bg-card">
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted rounded border-2 border-nb-ink" />)}
          </div>
        ) : (
          <>
              <table className="nb-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Periode</th>
                    <th>Status</th>
                    <th className="hidden md:table-cell">Dibuat</th>
                    <th className="w-[120px]">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((ta) => (
                    <tr key={ta.id} className={!ta.aktif ? 'opacity-60' : ''}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-secondary border-2 border-nb-ink rounded flex items-center justify-center shrink-0">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <span className="font-heading font-bold text-sm">{ta.nama}</span>
                        </div>
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {new Date(ta.tanggalMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' — '}
                        {new Date(ta.tanggalSelesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        {ta.aktif ? (
                          <span className="inline-flex items-center gap-1 text-sm font-heading font-semibold bg-emerald-100 border border-emerald-800 text-emerald-800 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sm font-heading font-semibold bg-amber-100 border border-amber-800 text-amber-800 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" /> Tidak Aktif
                          </span>
                        )}
                      </td>
                      <td className="hidden md:table-cell text-sm text-muted-foreground">
                        {new Date(ta.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditItem(ta)
                              setEditForm({ nama: ta.nama, tanggalMulai: ta.tanggalMulai, tanggalSelesai: ta.tanggalSelesai, aktif: ta.aktif })
                              setEditError('')
                            }}
                            className="p-1.5 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleAktif(ta)}
                            className={`p-1.5 border-2 border-nb-ink rounded cursor-pointer ${ta.aktif ? 'bg-card hover:bg-amber-100' : 'bg-card hover:bg-emerald-100'}`}
                            title={ta.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                          >
                            {ta.aktif ? <XCircle className="w-3.5 h-3.5 text-amber-600" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          </button>
                          <button
                            onClick={() => handleDelete(ta.id, ta.nama)}
                            className="p-1.5 bg-card border-2 border-nb-ink rounded hover:bg-rose-100 cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                        Belum ada tahun ajaran untuk unit ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

            {totalPages > 1 && (
              <div className="p-4 border-t-2 border-nb-ink flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{list.length} tahun ajaran</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="nb-btn nb-btn-secondary px-2 py-1 text-sm disabled:opacity-30 cursor-pointer">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setPage(p)}
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
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-sm md:mx-4 shadow-lg">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Tambah Tahun Ajaran</h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-4 md:p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> <span>{createError}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama Tahun Ajaran</label>
                <input type="text" required value={createForm.nama} onChange={(e) => setCreateForm({ ...createForm, nama: e.target.value })} className="nb-input" placeholder="e.g. 2025/2026" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tanggal Mulai</label>
                  <input type="date" required value={createForm.tanggalMulai} onChange={(e) => setCreateForm({ ...createForm, tanggalMulai: e.target.value })} className="nb-input" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tanggal Selesai</label>
                  <input type="date" required value={createForm.tanggalSelesai} onChange={(e) => setCreateForm({ ...createForm, tanggalSelesai: e.target.value })} className="nb-input" />
                </div>
              </div>
              <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="submit" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete?.onConfirm()}
        message={confirmDelete?.message || ''}
        loading={false}
      />

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-sm md:mx-4 shadow-lg">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Edit Tahun Ajaran</h3>
              <button onClick={() => setEditItem(null)} className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-4 md:p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> <span>{editError}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama Tahun Ajaran</label>
                <input type="text" required value={editForm.nama} onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })} className="nb-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tanggal Mulai</label>
                  <input type="date" required value={editForm.tanggalMulai} onChange={(e) => setEditForm({ ...editForm, tanggalMulai: e.target.value })} className="nb-input" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tanggal Selesai</label>
                  <input type="date" required value={editForm.tanggalSelesai} onChange={(e) => setEditForm({ ...editForm, tanggalSelesai: e.target.value })} className="nb-input" />
                </div>
              </div>
              <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setEditItem(null)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="submit" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
