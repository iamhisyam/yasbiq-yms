import { createFileRoute, Link } from '@tanstack/react-router'
import { useUnit } from '#/lib/unit-context'
import {
  getKelasList, createKelas, updateKelas, deleteKelas,
  getWaliKelasOptions, getTingkatOptions,
} from '#/server/kelas'
import { useState, useEffect } from 'react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { Combobox } from '#/components/ui/combobox'
import { ActionMenu } from '#/components/ui/action-menu'
import {
  GraduationCap, Plus, Edit2, Trash2, X, Eye,
  ChevronLeft, ChevronRight, AlertCircle, User,
} from 'lucide-react'

export const Route = createFileRoute('/_dashboard/kelas')({
  component: KelasPage,
})

function KelasPage() {
  const { activeUnit } = useUnit()
  const canManage = activeUnit?.role === 'admin_yayasan' || activeUnit?.role === 'super_admin'

  const [kelasList, setKelasList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [waliOptions, setWaliOptions] = useState<any[]>([])
  const [tingkatOptions, setTingkatOptions] = useState<any[]>([])

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ nama: '', tingkatId: '', waliKelasId: '' })
  const [createError, setCreateError] = useState('')

  const [editKelas, setEditKelas] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({ nama: '', tingkatId: '' as string | undefined, waliKelasId: '' as string | null })
  const [editError, setEditError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{message: string; onConfirm: () => void} | null>(null)

  const fetchKelas = () => {
    if (!activeUnit) return
    setLoading(true); setFetchError('')
    getKelasList({ data: { unitId: activeUnit.id } })
      .then(setKelasList)
      .catch((err: any) => setFetchError(err.message || 'Gagal memuat data'))
      .finally(() => setLoading(false))
  }

  const fetchOptions = () => {
    if (!activeUnit) return
    getWaliKelasOptions({ data: { unitId: activeUnit.id } }).then(setWaliOptions).catch(console.error)
    getTingkatOptions({ data: { unitId: activeUnit.id } }).then(setTingkatOptions).catch(console.error)
  }

  useEffect(() => { fetchKelas(); fetchOptions() }, [activeUnit])

  const totalPages = Math.ceil(kelasList.length / pageSize) || 1
  const paginatedKelas = kelasList.slice((page - 1) * pageSize, page * pageSize)

  const waliComboOptions = [
    { value: '', label: 'Tanpa Wali Kelas' },
    ...waliOptions.map((p: any) => ({ value: p.id, label: `${p.nama}${p.nip ? ` (${p.nip})` : ''}` })),
  ]

  const tingkatComboOptions = [
    { value: '', label: 'Tanpa Tingkat' },
    ...tingkatOptions.map((t: any) => ({ value: t.id, label: t.nama })),
  ]

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeUnit) return
    setCreateError('')
    try {
      await createKelas({
        data: {
          unitId: activeUnit.id, nama: createForm.nama,
          tingkatId: createForm.tingkatId || undefined,
          waliKelasId: createForm.waliKelasId || undefined,
        },
      })
      setIsCreateOpen(false)
      setCreateForm({ nama: '', tingkatId: '', waliKelasId: '' })
      fetchKelas()
    } catch (err: any) { setCreateError(err.message || 'Gagal membuat kelas') }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editKelas) return
    setEditError('')
    try {
      await updateKelas({
        data: {
          id: editKelas.id, nama: editForm.nama,
          tingkatId: editForm.tingkatId || undefined,
          waliKelasId: editForm.waliKelasId || null,
        },
      })
      setEditKelas(null)
      fetchKelas()
    } catch (err: any) { setEditError(err.message || 'Gagal mengupdate kelas') }
  }

  const handleDelete = (id: string, nama: string) => {
    setConfirmDelete({
      message: `Yakin ingin menghapus kelas "${nama}"?`,
      onConfirm: async () => {
        try { await deleteKelas({ data: { id } }); fetchKelas(); setConfirmDelete(null) }
        catch (err: any) { alert(err.message || 'Gagal menghapus kelas') }
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">Manajemen Kelas</h2>
          <p className="text-sm text-muted-foreground mt-1">Kelola daftar kelas untuk unit {activeUnit?.nama}.</p>
        </div>
        {canManage && (
          <button onClick={() => { setCreateForm({ nama: '', tingkatId: '', waliKelasId: '' }); setCreateError(''); setIsCreateOpen(true) }} className="nb-btn nb-btn-primary cursor-pointer w-full md:w-auto justify-center">
            <Plus className="w-4 h-4" /> Tambah Kelas
          </button>
        )}
      </div>

      {fetchError && (
        <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> <span>{fetchError}</span>
          <button onClick={fetchKelas} className="ml-auto text-sm underline font-bold cursor-pointer">Coba Lagi</button>
        </div>
      )}

      <div className="nb-table-wrapper bg-card">
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded border-2 border-nb-ink" />)}
          </div>
        ) : (
          <>
            <table className="nb-table">
              <thead>
                <tr>
                  <th>Nama Kelas</th>
                  <th>Tingkat</th>
                  <th>Wali Kelas</th>
                  <th className="hidden md:table-cell">Dibuat</th>
                  {canManage && <th className="w-[100px]">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedKelas.map((k: any) => (
                  <tr key={k.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-secondary border-2 border-nb-ink rounded flex items-center justify-center shrink-0">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <span className="font-heading font-bold text-sm">{k.nama}</span>
                      </div>
                    </td>
                    <td>
                      {k.tingkatRef ? (
                        <span className="text-sm font-heading font-bold bg-secondary border border-nb-ink/30 px-2 py-0.5 rounded">{k.tingkatRef.nama}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">-</span>
                      )}
                    </td>
                    <td>
                      {k.waliKelas ? (
                        <span className="inline-flex items-center gap-1 text-sm font-heading font-semibold bg-blue-50 border border-blue-800 text-blue-800 px-2 py-0.5 rounded-full">
                          <User className="w-3 h-3" /> {k.waliKelas.nama}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Belum diisi</span>
                      )}
                    </td>
                    <td className="hidden md:table-cell text-sm text-muted-foreground">
                      {new Date(k.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                      <td>
                        <div className="flex items-center justify-center">
                          <ActionMenu items={[
                            { label: 'Detail Kelas', icon: <Eye className="w-3.5 h-3.5" />, onClick: () => window.location.href = `/kelas/${k.id}` },
                            ...(canManage ? [
                              { label: 'Edit', icon: <Edit2 className="w-3.5 h-3.5" />, onClick: () => { setEditKelas(k); setEditForm({ nama: k.nama, tingkatId: k.tingkatId || '', waliKelasId: k.waliKelasId || '' }); setEditError('') }, variant: 'warning' as const },
                              { label: 'Hapus', icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />, onClick: () => handleDelete(k.id, k.nama), variant: 'danger' as const },
                            ] : []),
                          ]} />
                        </div>
                      </td>
                  </tr>
                ))}
                {paginatedKelas.length === 0 && (
                  <tr><td colSpan={canManage ? 5 : 4} className="text-center py-8 text-sm text-muted-foreground">Belum ada kelas untuk unit ini.</td></tr>
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="p-4 border-t-2 border-nb-ink flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{kelasList.length} kelas total</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="nb-btn nb-btn-secondary px-2 py-1 text-sm disabled:opacity-30 cursor-pointer">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1 border-2 border-nb-ink rounded text-sm font-heading font-bold cursor-pointer ${p === page ? 'bg-secondary shadow-none translate-y-0.5' : 'bg-card hover:bg-muted-foreground/10'}`}>
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
              <h3 className="font-heading font-bold text-sm">Tambah Kelas</h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-4 md:p-6 space-y-4">
              {createError && <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /> <span>{createError}</span></div>}
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama Kelas</label>
                <input type="text" required value={createForm.nama} onChange={(e) => setCreateForm({ ...createForm, nama: e.target.value })} className="nb-input" placeholder="e.g. 7A, X IPA, TK-B" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tingkat</label>
                <Combobox options={tingkatComboOptions} value={createForm.tingkatId} onValueChange={(v) => setCreateForm({ ...createForm, tingkatId: v })} placeholder="Pilih tingkat" searchPlaceholder="Cari tingkat..." className="w-full" triggerClassName="nb-input" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Wali Kelas</label>
                <Combobox options={waliComboOptions} value={createForm.waliKelasId} onValueChange={(v) => setCreateForm({ ...createForm, waliKelasId: v })} placeholder="Pilih Wali Kelas" searchPlaceholder="Cari pegawai..." emptyMessage="Tidak ada pegawai" className="w-full" triggerClassName="nb-input" />
              </div>
              <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="submit" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editKelas && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-sm md:mx-4 shadow-lg">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Edit Kelas</h3>
              <button onClick={() => setEditKelas(null)} className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleEdit} className="p-4 md:p-6 space-y-4">
              {editError && <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /> <span>{editError}</span></div>}
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama Kelas</label>
                <input type="text" required value={editForm.nama} onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })} className="nb-input" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tingkat</label>
                <Combobox options={tingkatComboOptions} value={editForm.tingkatId || ''} onValueChange={(v) => setEditForm({ ...editForm, tingkatId: v })} placeholder="Pilih tingkat" searchPlaceholder="Cari tingkat..." className="w-full" triggerClassName="nb-input" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Wali Kelas</label>
                <Combobox options={waliComboOptions} value={editForm.waliKelasId || ''} onValueChange={(v) => setEditForm({ ...editForm, waliKelasId: v })} placeholder="Pilih Wali Kelas" searchPlaceholder="Cari pegawai..." emptyMessage="Tidak ada pegawai" className="w-full" triggerClassName="nb-input" />
              </div>
              <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setEditKelas(null)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="submit" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} onConfirm={() => confirmDelete?.onConfirm()} message={confirmDelete?.message || ''} />
    </div>
  )
}
