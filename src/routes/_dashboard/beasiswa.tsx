import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { useUnit } from '#/lib/unit-context'
import {
  getBeasiswaList, createBeasiswa, updateBeasiswa, toggleBeasiswa,
  getSiswaBeasiswaList, assignBeasiswa, removeBeasiswa,
} from '#/server/beasiswa'
import { getSiswaList } from '#/server/siswa'
import { getTahunAjaranList } from '#/server/tahun-ajaran'
import { useState, useEffect } from 'react'
import { GraduationCap, Plus, Pencil, X, AlertCircle, Check, Search, Users } from 'lucide-react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { Combobox } from '#/components/ui/combobox'

export const Route = createFileRoute('/_dashboard/beasiswa')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'admin_yayasan' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: BeasiswaPage,
})

function BeasiswaPage() {
  const { activeUnit, yayasanFilterUnitId, units } = useUnit()
  const [formUnitId, setFormUnitId] = useState('')

  const [list, setList] = useState<any[]>([])
  const [assignList, setAssignList] = useState<any[]>([])
  const [siswaList, setSiswaList] = useState<any[]>([])
  const [taList, setTaList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'program' | 'assign'>('program')
  const [modalOpen, setModalOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    nama: '', tipe: 'potongan' as string, jenisPotongan: 'persen' as string,
    besaranPotongan: 0, keterangan: '',
  })
  const [assignData, setAssignData] = useState({ siswaIds: [] as string[], beasiswaId: '', tahunAjaran: '', keterangan: '' })
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [searchSiswa, setSearchSiswa] = useState('')

  const TIPE_LABEL: Record<string, string> = { potongan: 'Potongan', gratis: 'Gratis / Bebas' }
  const JENIS_LABEL: Record<string, string> = { persen: 'Persen (%)', nominal: 'Nominal (Rp)' }

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      getBeasiswaList({ data: { unitId: yayasanFilterUnitId } }),
      getSiswaBeasiswaList({ data: { unitId: yayasanFilterUnitId } }),
    ])
      .then(([beasiswaData, assignData]) => {
        setList(beasiswaData)
        setAssignList(assignData)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [yayasanFilterUnitId])

  const openModal = (item: any | null) => {
    setEditItem(item)
    setFormError('')
    setFormUnitId(item ? item.unitId || '' : yayasanFilterUnitId === 'all' ? '' : yayasanFilterUnitId)
    if (item) {
      setFormData({
        nama: item.nama,
        tipe: item.tipe,
        jenisPotongan: item.jenisPotongan || 'persen',
        besaranPotongan: item.besaranPotongan || 0,
        keterangan: item.keterangan || '',
      })
    } else {
      setFormData({ nama: '', tipe: 'potongan', jenisPotongan: 'persen', besaranPotongan: 0, keterangan: '' })
    }
    setModalOpen(true)
  }

  const openAssignModal = () => {
    setAssignModalOpen(true)
    setFormError('')
    setSearchSiswa('')
    setAssignData({ siswaIds: [], beasiswaId: '', tahunAjaran: '', keterangan: '' })
    const unitIdForSiswa = yayasanFilterUnitId === 'all' ? (activeUnit?.id || units[0]?.id || '') : yayasanFilterUnitId
    if (unitIdForSiswa) {
      getSiswaList({ data: { unitId: unitIdForSiswa, pageSize: 100 } }).then((res) => setSiswaList(res.data || [])).catch(() => {})
      getTahunAjaranList({ data: { unitId: unitIdForSiswa } }).then(setTaList).catch(() => {})
    }
  }

  const handleSave = async () => {
    setFormError('')
    if (!formData.nama.trim()) { setFormError('Nama beasiswa wajib diisi'); return }
    if (formData.tipe === 'potongan' && (!formData.besaranPotongan || formData.besaranPotongan <= 0)) {
      setFormError('Besaran potongan wajib diisi ( > 0 )'); return
    }
    if (formData.tipe === 'potongan' && formData.jenisPotongan === 'persen' && formData.besaranPotongan > 100) {
      setFormError('Persentase tidak boleh lebih dari 100%'); return
    }
    setActionLoading(true)
    try {
      const unitId = formUnitId || (yayasanFilterUnitId === 'all' ? (activeUnit?.id || units[0]?.id || '') : yayasanFilterUnitId)
      if (editItem) {
        await updateBeasiswa({ data: { id: editItem.id, unitId: formUnitId || undefined, nama: formData.nama, tipe: formData.tipe as 'potongan' | 'gratis', jenisPotongan: formData.tipe === 'gratis' ? null : formData.jenisPotongan as 'persen' | 'nominal', besaranPotongan: formData.tipe === 'gratis' ? null : formData.besaranPotongan, keterangan: formData.keterangan } })
      } else {
        if (!unitId) { setFormError('Pilih unit'); setActionLoading(false); return }
        await createBeasiswa({ data: { unitId, nama: formData.nama, tipe: formData.tipe as 'potongan' | 'gratis', jenisPotongan: formData.tipe === 'gratis' ? null : formData.jenisPotongan as 'persen' | 'nominal', besaranPotongan: formData.tipe === 'gratis' ? null : formData.besaranPotongan, keterangan: formData.keterangan } })
      }
      setModalOpen(false)
      fetchData()
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan')
    } finally { setActionLoading(false) }
  }

  const handleToggle = (item: any) => {
    setConfirmDelete({
      message: item.aktif ? 'Nonaktifkan beasiswa ini?' : 'Aktifkan beasiswa ini?',
      onConfirm: async () => {
        await toggleBeasiswa({ data: { id: item.id } })
        fetchData()
      },
    })
  }

  const handleAssign = async () => {
    if (!assignData.siswaIds.length || !assignData.beasiswaId || !assignData.tahunAjaran) {
      setFormError('Semua field wajib diisi')
      return
    }
    setActionLoading(true)
    setFormError('')
    try {
      const unitId = yayasanFilterUnitId === 'all' ? (activeUnit?.id || units[0]?.id || '') : yayasanFilterUnitId
      await assignBeasiswa({ data: { unitId, ...assignData, keterangan: assignData.keterangan || null } })
      setAssignModalOpen(false)
    setAssignData({ siswaIds: [], beasiswaId: '', tahunAjaran: '', keterangan: '' })
      fetchData()
    } catch (err: any) {
      setFormError(err.message || 'Gagal assign')
    } finally { setActionLoading(false) }
  }

  const handleRemoveAssign = (id: string) => {
    setConfirmDelete({
      message: 'Hapus beasiswa dari siswa ini?',
      onConfirm: async () => { await removeBeasiswa({ data: { id } }); fetchData() },
    })
  }

  const filteredSiswa = searchSiswa.trim()
    ? siswaList.filter((s: any) => s.nama.toLowerCase().includes(searchSiswa.toLowerCase()) || s.nis?.includes(searchSiswa))
    : []

  return (
    <div className="space-y-6">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">Beasiswa</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola program beasiswa dan penugasan ke siswa.
          </p>
        </div>
        {activeTab === 'program' && (
          <button onClick={() => openModal(null)} className="nb-btn nb-btn-primary cursor-pointer shrink-0">
            <Plus className="w-4 h-4" /> Tambah Beasiswa
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-card border-2 border-nb-ink rounded w-fit">
        <button onClick={() => setActiveTab('program')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${activeTab === 'program' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          Program Beasiswa
        </button>
        <button onClick={() => setActiveTab('assign')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${activeTab === 'assign' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          Penugasan Siswa
        </button>
      </div>

      {activeTab === 'program' && (
        <>
          {loading ? (
            <div className="h-40 bg-muted animate-pulse border-2 border-nb-ink rounded" />
          ) : list.length === 0 ? (
            <div className="text-center py-12 bg-card border-2 border-nb-ink rounded">
              <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-heading font-bold text-muted-foreground">Belum Ada Program Beasiswa</p>
              <p className="text-sm text-muted-foreground mt-1">Buat program beasiswa untuk memberikan potongan SPP</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {list.map((item) => (
                <div key={item.id} className={`bg-card border-2 border-nb-ink rounded p-4 ${!item.aktif ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-lavender-100 border-2 border-nb-ink rounded flex items-center justify-center shrink-0">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-heading font-bold text-sm truncate">{item.nama}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.unit?.nama && <span className="mr-1">{item.unit.nama} · </span>}
                          {TIPE_LABEL[item.tipe] || item.tipe}
                          {item.tipe === 'potongan' && ` — ${item.jenisPotongan === 'persen' ? `${item.besaranPotongan}%` : `Rp${item.besaranPotongan?.toLocaleString('id-ID')}`}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-sm px-2 py-0.5 rounded border font-heading font-bold ${item.aktif ? 'bg-emerald-100 border-emerald-800 text-emerald-800' : 'bg-rose-100 border-rose-800 text-rose-800'}`}>
                        {item.aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  </div>
                  {item.keterangan && (
                    <p className="text-sm text-muted-foreground mt-2">{item.keterangan}</p>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-nb-ink/30">
                    <span className="text-sm font-heading font-bold text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" /> {item.siswaCount} Siswa
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => openModal(item)} className="p-1.5 hover:bg-muted-foreground/10 rounded cursor-pointer" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggle(item)} className="p-1.5 hover:bg-muted-foreground/10 rounded cursor-pointer" title={item.aktif ? 'Nonaktifkan' : 'Aktifkan'}>
                        {item.aktif ? <X className="w-4 h-4 text-rose-600" /> : <Check className="w-4 h-4 text-emerald-600" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'assign' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => openAssignModal()} className="nb-btn nb-btn-primary cursor-pointer shrink-0">
              <Plus className="w-4 h-4" /> Assign Beasiswa
            </button>
          </div>

          <div className="nb-table-wrapper bg-card">
            <table className="nb-table">
              <thead>
                <tr>
                  <th>Siswa</th>
                  <th className="hidden md:table-cell">NIS</th>
                  <th>Beasiswa</th>
                  <th className="hidden md:table-cell">Tahun Ajaran</th>
                  <th className="w-20 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {assignList.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-muted-foreground text-sm py-8">Belum ada penugasan beasiswa</td></tr>
                ) : (
                  assignList.map((a: any) => (
                    <tr key={a.id}>
                      <td className="font-heading font-bold text-sm">{a.siswa?.nama || '-'}</td>
                      <td className="hidden md:table-cell text-sm text-muted-foreground">{a.siswa?.nis || '-'}</td>
                      <td className="text-sm">
                        <span className="font-heading font-bold">{a.beasiswa?.nama || '-'}</span>
                        <span className="text-sm text-muted-foreground ml-1">({a.beasiswa?.tipe})</span>
                      </td>
                      <td className="hidden md:table-cell text-sm">{a.tahunAjaran}</td>
                      <td className="text-center">
                        <button onClick={() => handleRemoveAssign(a.id)} className="p-1 hover:bg-rose-100 rounded cursor-pointer" title="Hapus">
                          <X className="w-4 h-4 text-rose-600" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal Create/Edit Beasiswa */}
      {modalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-md flex flex-col max-h-[85dvh]">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">{editItem ? 'Edit Beasiswa' : 'Tambah Beasiswa'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 flex-1 min-h-0 overflow-y-auto space-y-3">
              {formError && (
                <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}

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

              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama Beasiswa</label>
                <input value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} className="nb-input" placeholder="Contoh: Beasiswa Prestasi" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tipe</label>
                <Combobox
                  options={[{ value: 'potongan', label: 'Potongan Biaya' }, { value: 'gratis', label: 'Gratis / Bebas SPP' }]}
                  value={formData.tipe}
                  onValueChange={(v) => setFormData({ ...formData, tipe: v, jenisPotongan: v === 'gratis' ? '' : 'persen', besaranPotongan: v === 'gratis' ? 0 : formData.besaranPotongan })}
                  placeholder="Pilih tipe"
                  className="w-full"
                  triggerClassName="nb-input"
                />
              </div>
              {formData.tipe === 'potongan' && (
                <>
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Jenis Potongan</label>
                    <Combobox
                      options={[{ value: 'persen', label: 'Persen (%)' }, { value: 'nominal', label: 'Nominal (Rp)' }]}
                      value={formData.jenisPotongan}
                      onValueChange={(v) => setFormData({ ...formData, jenisPotongan: v })}
                      placeholder="Pilih jenis"
                      className="w-full"
                      triggerClassName="nb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">
                      Besaran Potongan {formData.jenisPotongan === 'persen' ? '(%)' : '(Rp)'}
                    </label>
                    <input
                      type="number" min={1} max={formData.jenisPotongan === 'persen' ? 100 : undefined}
                      value={formData.besaranPotongan || ''}
                      onChange={(e) => setFormData({ ...formData, besaranPotongan: Number(e.target.value) })}
                      className="nb-input"
                      placeholder={formData.jenisPotongan === 'persen' ? 'Contoh: 50' : 'Contoh: 150000'}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Keterangan (opsional)</label>
                <textarea value={formData.keterangan} onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })} className="nb-input" rows={2} />
              </div>
            </div>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex gap-3 justify-end bg-card rounded-b-lg">
              <button onClick={() => setModalOpen(false)} className="nb-btn nb-btn-secondary cursor-pointer">Batal</button>
              <button onClick={handleSave} disabled={actionLoading} className="nb-btn nb-btn-primary cursor-pointer">{actionLoading ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Assign Beasiswa */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-lg flex flex-col max-h-[85dvh]">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Assign Beasiswa ke Siswa</h3>
              <button onClick={() => setAssignModalOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 flex-1 min-h-0 overflow-y-auto space-y-4">
              {formError && (
                <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Program Beasiswa</label>
                <Combobox
                  options={list.filter((b) => b.aktif).map((b) => ({ value: b.id, label: `${b.nama} (${TIPE_LABEL[b.tipe]})` }))}
                  value={assignData.beasiswaId}
                  onValueChange={(v) => setAssignData({ ...assignData, beasiswaId: v })}
                  placeholder="Pilih beasiswa"
                  className="w-full"
                  triggerClassName="nb-input"
                />
              </div>

              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tahun Ajaran</label>
                <Combobox
                  options={taList.map((ta: any) => ({ value: ta.nama, label: ta.nama }))}
                  value={assignData.tahunAjaran}
                  onValueChange={(v) => setAssignData({ ...assignData, tahunAjaran: v })}
                  placeholder="Pilih tahun ajaran"
                  className="w-full"
                  triggerClassName="nb-input"
                />
              </div>

              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Keterangan (opsional)</label>
                <input value={assignData.keterangan} onChange={(e) => setAssignData({ ...assignData, keterangan: e.target.value })} className="nb-input" placeholder="Catatan..." />
              </div>

              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">
                  Pilih Siswa {assignData.siswaIds.length > 0 && <span className="font-normal text-muted-foreground">({assignData.siswaIds.length} dipilih)</span>}
                </label>

                {assignData.siswaIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {assignData.siswaIds.map((id) => {
                      const s = siswaList.find((s: any) => s.id === id)
                      return s ? (
                        <span key={id} className="inline-flex items-center gap-1 text-xs font-heading font-semibold bg-blue-100 border border-blue-300 rounded px-2 py-1">
                          {s.nama}
                          <button onClick={() => setAssignData({ ...assignData, siswaIds: assignData.siswaIds.filter((i) => i !== id) })} className="hover:text-rose-600 cursor-pointer">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ) : null
                    })}
                  </div>
                )}

                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input value={searchSiswa} onChange={(e) => setSearchSiswa(e.target.value)} className="nb-input pl-8" placeholder="Cari nama atau NIS..." />
                </div>

                {searchSiswa.trim() && (
                  <div className="max-h-48 overflow-y-auto border-2 border-nb-ink rounded">
                    {filteredSiswa.length === 0 ? (
                      <div className="p-3 text-sm text-center text-muted-foreground">Siswa tidak ditemukan</div>
                    ) : (
                      filteredSiswa.map((s: any) => {
                        const isSelected = assignData.siswaIds.includes(s.id)
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setAssignData({
                                ...assignData,
                                siswaIds: isSelected
                                  ? assignData.siswaIds.filter((i) => i !== s.id)
                                  : [...assignData.siswaIds, s.id],
                              })
                            }}
                            className={`w-full text-left px-3 py-2 text-sm font-heading font-semibold flex items-center gap-3 border-b border-nb-ink last:border-b-0 hover:bg-secondary/40 ${isSelected ? 'bg-secondary/70' : ''}`}
                          >
                            <span className={`w-4 h-4 border-2 rounded flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </span>
                            <span className="truncate flex-1">{s.nama}</span>
                            <span className="text-sm text-muted-foreground shrink-0">{s.nis}</span>
                          </button>
                        )
                      })
                    )}
                  </div>
                )}

                {!searchSiswa.trim() && assignData.siswaIds.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">Ketik nama atau NIS untuk mencari dan memilih siswa</p>
                )}
              </div>
            </div>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex gap-3 justify-end bg-card rounded-b-lg">
              <button onClick={() => setAssignModalOpen(false)} className="nb-btn nb-btn-secondary cursor-pointer">Batal</button>
              <button onClick={handleAssign} disabled={actionLoading} className="nb-btn nb-btn-primary cursor-pointer">{actionLoading ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => { confirmDelete?.onConfirm(); setConfirmDelete(null) }}
        title="Konfirmasi"
        message={confirmDelete?.message || ''}
      />
    </div>
  )
}