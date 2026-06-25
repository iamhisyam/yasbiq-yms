import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { useUnit } from '#/lib/unit-context'
import {
  getKurikulumList,
  createKurikulum,
  updateKurikulum,
  deleteKurikulum,
  getAngkatanKurikulumList,
  upsertAngkatanKurikulum,
  deleteAngkatanKurikulum,
} from '#/server/kurikulum'
import { useState, useEffect } from 'react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Calendar,
  Layers,
} from 'lucide-react'
import { Combobox } from '#/components/ui/combobox'

export const Route = createFileRoute('/_dashboard/kurikulum')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'admin_yayasan' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: KurikulumPage,
})

function KurikulumPage() {
  const { activeUnit } = useUnit()

  const [kurikulumList, setKurikulumList] = useState<any[]>([])
  const [angkatanList, setAngkatanList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Kurikulum CRUD modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ nama: '', deskripsi: '' })
  const [createError, setCreateError] = useState('')

  const [editItem, setEditItem] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({ nama: '', deskripsi: '', aktif: true })
  const [editError, setEditError] = useState('')

  // Angkatan modal
  const [isAngkatanOpen, setIsAngkatanOpen] = useState(false)
  const [angkatanForm, setAngkatanForm] = useState({ tahun: new Date().getFullYear(), kurikulumId: '' })
  const [angkatanError, setAngkatanError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{message: string; onConfirm: () => void} | null>(null)

  const fetchData = () => {
    if (!activeUnit) return
    setLoading(true)
    setFetchError('')
    Promise.all([
      getKurikulumList({ data: { unitId: activeUnit.id } }),
      getAngkatanKurikulumList({ data: { unitId: activeUnit.id } }),
    ])
      .then(([kur, ang]) => {
        setKurikulumList(kur)
        setAngkatanList(ang)
      })
      .catch((err: any) => setFetchError(err.message || 'Gagal memuat data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [activeUnit])

  const totalPages = Math.ceil(kurikulumList.length / pageSize) || 1
  const paginated = kurikulumList.slice((page - 1) * pageSize, page * pageSize)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeUnit) return
    setCreateError('')
    try {
      await createKurikulum({ data: { unitId: activeUnit.id, ...createForm } })
      setIsCreateOpen(false)
      setCreateForm({ nama: '', deskripsi: '' })
      fetchData()
    } catch (err: any) {
      setCreateError(err.message || 'Gagal membuat kurikulum')
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editItem) return
    setEditError('')
    try {
      await updateKurikulum({ data: { id: editItem.id, ...editForm } })
      setEditItem(null)
      fetchData()
    } catch (err: any) {
      setEditError(err.message || 'Gagal mengupdate kurikulum')
    }
  }

  const handleToggleAktif = async (item: any) => {
    try {
      await updateKurikulum({ data: { id: item.id, aktif: !item.aktif } })
      fetchData()
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status')
    }
  }

  const handleDeleteKur = (id: string, nama: string) => {
    setConfirmDelete({
      message: `Yakin ingin menghapus kurikulum "${nama}"?`,
      onConfirm: async () => {
        try {
          await deleteKurikulum({ data: { id } })
          fetchData()
          setConfirmDelete(null)
        } catch (err: any) {
          alert(err.message || 'Gagal menghapus kurikulum')
        }
      },
    })
  }

  const handleUpsertAngkatan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeUnit) return
    setAngkatanError('')
    try {
      await upsertAngkatanKurikulum({ data: { unitId: activeUnit.id, ...angkatanForm } })
      setIsAngkatanOpen(false)
      setAngkatanForm({ tahun: new Date().getFullYear(), kurikulumId: '' })
      fetchData()
    } catch (err: any) {
      setAngkatanError(err.message || 'Gagal menyimpan')
    }
  }

  const handleDeleteAngkatan = (id: string, tahun: number) => {
    setConfirmDelete({
      message: `Yakin ingin menghapus assignment kurikulum untuk angkatan ${tahun}?`,
      onConfirm: async () => {
        try {
          await deleteAngkatanKurikulum({ data: { id } })
          fetchData()
          setConfirmDelete(null)
        } catch (err: any) {
          alert(err.message || 'Gagal menghapus')
        }
      },
    })
  }

  const getKurikulumNama = (id: string) => kurikulumList.find((k) => k.id === id)?.nama || '—'

  return (
    <div className="space-y-6">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">Kurikulum & Angkatan</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola kurikulum dan tentukan kurikulum per angkatan untuk unit {activeUnit?.nama}.
          </p>
        </div>
        <button
          onClick={() => {
            setCreateForm({ nama: '', deskripsi: '' })
            setCreateError('')
            setIsCreateOpen(true)
          }}
          className="nb-btn nb-btn-primary cursor-pointer w-full md:w-auto justify-center"
        >
          <Plus className="w-4 h-4" /> Tambah Kurikulum
        </button>
      </div>

      {fetchError && (
        <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> <span>{fetchError}</span>
          <button onClick={fetchData} className="ml-auto text-sm underline font-bold cursor-pointer">Coba Lagi</button>
        </div>
      )}

      {/* ─── Section: Kurikulum ─────────────────────────────────── */}
      <div className="nb-table-wrapper bg-card">
        <div className="bg-secondary px-4 py-3 border-b-2 border-nb-ink flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          <h3 className="font-heading font-bold text-sm uppercase tracking-wider">Daftar Kurikulum</h3>
        </div>
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2].map((i) => <div key={i} className="h-14 bg-muted rounded border-2 border-nb-ink" />)}
          </div>
        ) : (
          <>
            <table className="nb-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Deskripsi</th>
                    <th>Status</th>
                    <th className="w-[100px]">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((k) => (
                    <tr key={k.id} className={!k.aktif ? 'opacity-60' : ''}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-secondary border-2 border-nb-ink rounded flex items-center justify-center shrink-0">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <span className="font-heading font-bold text-sm">{k.nama}</span>
                        </div>
                      </td>
                      <td className="text-sm text-muted-foreground max-w-[200px] truncate">{k.deskripsi || '—'}</td>
                      <td>
                        {k.aktif ? (
                          <span className="inline-flex items-center gap-1 text-sm font-heading font-semibold bg-emerald-100 border border-emerald-800 text-emerald-800 px-2 py-0.5 rounded-full">
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sm font-heading font-semibold bg-amber-100 border border-amber-800 text-amber-800 px-2 py-0.5 rounded-full">
                            Tidak Aktif
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditItem(k)
                              setEditForm({ nama: k.nama, deskripsi: k.deskripsi || '', aktif: k.aktif })
                              setEditError('')
                            }}
                            className="p-1.5 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleAktif(k)}
                            className="p-1.5 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"
                            title={k.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteKur(k.id, k.nama)}
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
                      <td colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                        Belum ada kurikulum. Tambahkan kurikulum baru.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            {totalPages > 1 && (
              <div className="p-4 border-t-2 border-nb-ink flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{kurikulumList.length} kurikulum</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                    className="nb-btn nb-btn-secondary px-2 py-1 text-sm disabled:opacity-30 cursor-pointer">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`px-2.5 py-1 border-2 border-nb-ink rounded text-sm font-heading font-bold cursor-pointer ${p === page ? 'bg-secondary shadow-none' : 'bg-card hover:bg-muted-foreground/10'}`}
                    >{p}</button>
                  ))}
                  <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                    className="nb-btn nb-btn-secondary px-2 py-1 text-sm disabled:opacity-30 cursor-pointer">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Section: Angkatan Kurikulum ────────────────────────── */}
      <div className="nb-table-wrapper bg-card">
        <div className="bg-secondary px-4 py-3 border-b-2 border-nb-ink flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <h3 className="font-heading font-bold text-sm uppercase tracking-wider">Kurikulum per Angkatan</h3>
          </div>
          <button
            onClick={() => {
              setAngkatanForm({ tahun: new Date().getFullYear(), kurikulumId: kurikulumList.find((k) => k.aktif)?.id || '' })
              setAngkatanError('')
              setIsAngkatanOpen(true)
            }}
            className="nb-btn nb-btn-primary text-sm py-1.5 px-3 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Atur Angkatan
          </button>
        </div>
        {loading ? (
          <div className="p-8 h-24 animate-pulse bg-muted/30 rounded" />
        ) : (
          <table className="nb-table">
              <thead>
                <tr>
                  <th>Angkatan (Tahun Masuk)</th>
                  <th>Kurikulum</th>
                  <th className="w-[80px]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {angkatanList.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-sm text-muted-foreground">
                      Belum ada pengaturan kurikulum per angkatan.
                    </td>
                  </tr>
                ) : (
                  angkatanList.map((a) => (
                    <tr key={a.id}>
                      <td className="font-heading font-bold text-sm">{a.tahun}</td>
                      <td>
                        <span className="bg-blue-100 border border-blue-800 text-blue-800 px-2 py-0.5 rounded text-[11px] font-heading font-semibold">
                          {a.kurikulum?.nama || '—'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDeleteAngkatan(a.id, a.tahun)}
                          className="p-1.5 bg-card border-2 border-nb-ink rounded hover:bg-rose-100 cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
        )}
      </div>

      {/* ─── Create Kurikulum Modal ─────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-sm md:mx-4 shadow-lg">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Tambah Kurikulum</h3>
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
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama Kurikulum</label>
                <input type="text" required value={createForm.nama} onChange={(e) => setCreateForm({ ...createForm, nama: e.target.value })} className="nb-input" placeholder="e.g. Kurikulum Merdeka" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Deskripsi <span className="font-normal lowercase">(opsional)</span></label>
                <textarea value={createForm.deskripsi} onChange={(e) => setCreateForm({ ...createForm, deskripsi: e.target.value })} className="nb-input h-20 resize-none" placeholder="Keterangan singkat..." />
              </div>
              <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="submit" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Edit Kurikulum Modal ───────────────────────────────── */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-sm md:mx-4 shadow-lg">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Edit Kurikulum</h3>
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
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama Kurikulum</label>
                <input type="text" required value={editForm.nama} onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })} className="nb-input" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Deskripsi <span className="font-normal lowercase">(opsional)</span></label>
                <textarea value={editForm.deskripsi} onChange={(e) => setEditForm({ ...editForm, deskripsi: e.target.value })} className="nb-input h-20 resize-none" placeholder="Keterangan singkat..." />
              </div>
              <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setEditItem(null)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="submit" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Angkatan Modal ─────────────────────────────────────── */}
      {isAngkatanOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-sm md:mx-4 shadow-lg">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Atur Kurikulum Angkatan</h3>
              <button onClick={() => setIsAngkatanOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpsertAngkatan} className="p-4 md:p-6 space-y-4">
              {angkatanError && (
                <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> <span>{angkatanError}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Angkatan (Tahun Masuk)</label>
                <input type="number" required min={1900} max={2100} value={angkatanForm.tahun}
                  onChange={(e) => setAngkatanForm({ ...angkatanForm, tahun: parseInt(e.target.value) || new Date().getFullYear() })}
                  className="nb-input" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Kurikulum</label>
                <Combobox
                  options={[{value: '', label: 'Pilih Kurikulum'}, ...kurikulumList.filter((k) => k.aktif).map((k) => ({value: k.id, label: k.nama}))]}
                  value={angkatanForm.kurikulumId}
                  onValueChange={(v) => setAngkatanForm({ ...angkatanForm, kurikulumId: v })}
                  triggerClassName="nb-input"
                  className="w-full"
                />
                {kurikulumList.filter((k) => k.aktif).length === 0 && (
                  <p className="text-sm text-amber-700 mt-1">Tidak ada kurikulum aktif. Buat kurikulum terlebih dahulu.</p>
                )}
              </div>
              <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setIsAngkatanOpen(false)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
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
      />
    </div>
  )
}
