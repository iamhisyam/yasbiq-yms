import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { useUnit } from '#/lib/unit-context'
import {
  getPegawaiList, createPegawai, updatePegawai, deletePegawai,
  getMapelList, assignMapelToPegawai, unassignMapelFromPegawai,
} from '#/server/pegawai'
import { useState, useEffect, useRef } from 'react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import {
  Briefcase, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight,
  AlertCircle, Search, BookOpen, Eye, UserCheck, UserX, Upload, Download,
} from 'lucide-react'
import { Combobox } from '#/components/ui/combobox'
import { importPegawai, downloadTemplatePegawai } from '#/server/pegawai-import'


export const Route = createFileRoute('/_dashboard/pegawai')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'admin_yayasan' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: PegawaiPage,
})

const JABATAN_OPTIONS = [
  { value: 'guru_mapel', label: 'Guru Mapel' },
  { value: 'guru_kelas', label: 'Guru Kelas' },
  { value: 'kepala_sekolah', label: 'Kepala Sekolah' },
  { value: 'tata_usaha', label: 'Tata Usaha' },
  { value: 'bendahara', label: 'Bendahara' },
  { value: 'staff', label: 'Staff Lainnya' },
]

const STATUS_PEGAWAI_OPTIONS = [
  { value: 'pns', label: 'PNS' },
  { value: 'honorer', label: 'Honorer (GTT)' },
  { value: 'kontrak', label: 'Kontrak (PTK)' },
  { value: 'tetap', label: 'Tetap Yayasan' },
  { value: 'magang', label: 'Magang' },
]

function PegawaiPage() {
  const { activeUnit, yayasanFilterUnitId, units } = useUnit()
  const [formUnitId, setFormUnitId] = useState('')

  const [pegawaiList, setPegawaiList] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [search, setSearch] = useState('')
  const [filterJabatan, setFilterJabatan] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [mapelList, setMapelList] = useState<any[]>([])

  // CRUD modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [formData, setFormData] = useState<any>({
    nip: '', nama: '', jenisKelamin: 'L', tempatLahir: '', tanggalLahir: '',
    alamat: '', telepon: '', email: '', statusPegawai: 'honorer', jabatan: 'guru_mapel',
    tanggalMasuk: '', tanggalKeluar: '', pendidikanTerakhir: '', jurusan: '',
    bank: '', nomorRekening: '', gajiPokok: 0, statusPajak: '',
  })
  const [formError, setFormError] = useState('')

  // Mapel assignment modal
  const [mapelModal, setMapelModal] = useState<any>(null)
  const [mapelError, setMapelError] = useState('')

  // Import modal
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [importError, setImportError] = useState('')
  const [templateLoading, setTemplateLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmDelete, setConfirmDelete] = useState<{message: string; onConfirm: () => void} | null>(null)

  const fetchPegawai = () => {
    setLoading(true)
    setFetchError('')
    getPegawaiList({
      data: {
        unitId: yayasanFilterUnitId,
        search: search || undefined,
        jabatan: filterJabatan || undefined,
        status: filterStatus || undefined,
        page, pageSize,
      },
    })
      .then((res) => { setPegawaiList(res.data); setTotal(res.total) })
      .catch((err: any) => setFetchError(err.message || 'Gagal memuat data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPegawai() }, [yayasanFilterUnitId, search, filterJabatan, filterStatus, page])

  useEffect(() => {
    getMapelList({ data: { unitId: yayasanFilterUnitId } }).then(setMapelList).catch(() => {})
  }, [yayasanFilterUnitId])

  const totalPages = Math.ceil(total / pageSize) || 1

  const openModal = (p: any = null) => {
    setFormError('')
    if (p) {
      setEditItem(p)
      setFormUnitId(p.unitId || '')
      setFormData({
        nip: p.nip || '', nama: p.nama || '', jenisKelamin: p.jenisKelamin || 'L',
        tempatLahir: p.tempatLahir || '', tanggalLahir: p.tanggalLahir || '',
        alamat: p.alamat || '', telepon: p.telepon || '', email: p.email || '',
        statusPegawai: p.statusPegawai || 'honorer', jabatan: p.jabatan || 'guru_mapel',
        tanggalMasuk: p.tanggalMasuk || '', tanggalKeluar: p.tanggalKeluar || '',
        pendidikanTerakhir: p.pendidikanTerakhir || '', jurusan: p.jurusan || '',
        bank: p.bank || '', nomorRekening: p.nomorRekening || '', gajiPokok: p.gajiPokok || 0,
        statusPajak: p.statusPajak || '',
      })
    } else {
      setEditItem(null)
      setFormData({
        nip: '', nama: '', jenisKelamin: 'L', tempatLahir: '', tanggalLahir: '',
        alamat: '', telepon: '', email: '', statusPegawai: 'honorer', jabatan: 'guru_mapel',
        tanggalMasuk: '', tanggalKeluar: '', pendidikanTerakhir: '', jurusan: '',
        bank: '', nomorRekening: '', gajiPokok: 0, statusPajak: '',
      })
      setFormUnitId(yayasanFilterUnitId === 'all' ? '' : yayasanFilterUnitId)
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeUnit && !formUnitId) return
    setFormError('')
    try {
      if (editItem) {
        await updatePegawai({ data: { id: editItem.id, data: { ...formData, unitId: formUnitId || '' } } })
      } else {
        const unit = formUnitId || ''
        await createPegawai({ data: { unitId: unit, ...formData } })
      }
      setIsModalOpen(false)
      fetchPegawai()
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data')
    }
  }

  const handleDelete = (id: string, nama: string) => {
    setConfirmDelete({
      message: `Yakin ingin menghapus "${nama}"? Data terkait (penggajian) tidak akan terhapus.`,
      onConfirm: async () => {
        try {
          await deletePegawai({ data: { id } })
          fetchPegawai()
          setConfirmDelete(null)
        } catch (err: any) {
          alert(err.message || 'Gagal menghapus')
        }
      },
    })
  }

  const handleToggleAktif = async (p: any) => {
    try {
      await updatePegawai({ data: { id: p.id, data: { aktif: !p.aktif } } })
      fetchPegawai()
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status')
    }
  }

  const handleAssignMapel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mapelModal) return
    setMapelError('')
    try {
      const mapelId = mapelModal.selectedMapelId
      await assignMapelToPegawai({ data: { pegawaiId: mapelModal.id, mataPelajaranId: mapelId } })
      fetchPegawai()
      setMapelError('Berhasil ditambahkan')
    } catch (err: any) {
      setMapelError(err.message || 'Gagal')
    }
  }

  const handleUnassignMapel = async (id: string) => {
    try {
      await unassignMapelFromPegawai({ data: { id } })
      fetchPegawai()
    } catch (err: any) {
      alert(err.message || 'Gagal')
    }
  }

  const labelJabatan = (v: string) => JABATAN_OPTIONS.find((o) => o.value === v)?.label || v
  const labelStatusPegawai = (v: string) => STATUS_PEGAWAI_OPTIONS.find((o) => o.value === v)?.label || v

  return (
    <div className="space-y-6">
      <div className="nb-page-header flex items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="nb-page-title">Pegawai & Staff</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola data guru dan staff untuk akademik dan penggajian.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openModal(null)} className="nb-btn nb-btn-primary cursor-pointer w-full md:w-auto justify-center">
            <Plus className="w-4 h-4" /> Tambah Pegawai
          </button>
          <button
            onClick={() => {
              setIsImportOpen(true)
              setImportFile(null)
              setImportResult(null)
              setImportError('')
              setFormUnitId(yayasanFilterUnitId === 'all' ? '' : yayasanFilterUnitId)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
            className="nb-btn nb-btn-secondary cursor-pointer w-full md:w-auto justify-center"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> <span>{fetchError}</span>
          <button onClick={fetchPegawai} className="ml-auto text-sm underline font-bold cursor-pointer">Coba Lagi</button>
        </div>
      )}

      {/* Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-card border-2 border-nb-ink rounded">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-nb-ink-soft" />
          </span>
          <input type="text" placeholder="Cari nama pegawai..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="nb-input nb-input--icon" />
        </div>
        <div>
          <Combobox
            options={[{value: '', label: 'Semua Jabatan'}, ...JABATAN_OPTIONS]}
            value={filterJabatan}
            onValueChange={(v) => { setFilterJabatan(v); setPage(1) }}
            placeholder="Semua Jabatan"
            searchPlaceholder="Cari jabatan..."
            emptyMessage="Tidak ada data"
            className="w-full"
          />
        </div>
        <div>
          <Combobox
            options={[{value: '', label: 'Semua Status'}, {value: 'aktif', label: 'Aktif'}, {value: 'nonaktif', label: 'Nonaktif'}]}
            value={filterStatus}
            onValueChange={(v) => { setFilterStatus(v); setPage(1) }}
            placeholder="Semua Status"
            searchPlaceholder="Cari status..."
            emptyMessage="Tidak ada data"
            className="w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="nb-table-wrapper bg-card">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Memuat data...</div>
        ) : pegawaiList.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
            <h3 className="font-heading font-bold text-sm">Pegawai Tidak Ditemukan</h3>
            <p className="text-sm text-muted-foreground mt-1">Tambahkan pegawai baru atau sesuaikan filter.</p>
          </div>
        ) : (
          <table className="nb-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>NIP</th>
                <th>Unit</th>
                <th>Jabatan</th>
                <th>Mapel</th>
                <th className="hidden md:table-cell">Gaji Pokok</th>
                <th>Status</th>
                <th className="w-[140px]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pegawaiList.map((p) => (
                <tr key={p.id} className={!p.aktif ? 'opacity-60' : ''}>
                  <td>
                    <div className="font-heading font-bold text-sm">{p.nama}</div>
                    <div className="text-sm text-muted-foreground">{p.nip || '—'}</div>
                  </td>
                  <td className="font-mono text-sm">{p.nip || '—'}</td>
                  <td className="text-sm">{p.unit?.nama || p.unitId}</td>
                  <td><span className="text-sm font-heading font-semibold bg-secondary border border-nb-ink/30 px-1.5 py-0.5 rounded">{labelJabatan(p.jabatan)}</span></td>
                  <td>
                    <div className="flex flex-wrap gap-1 max-w-[160px]">
                      {p.mapelAssignments?.length > 0
                        ? p.mapelAssignments.map((ma: any) => (
                            <span key={ma.id} className="inline-flex items-center gap-1 bg-indigo-100 border border-indigo-800 text-indigo-800 px-1.5 py-0.5 rounded text-[11px] font-heading font-semibold">
                              {ma.mataPelajaran?.nama}
                              <button onClick={() => handleUnassignMapel(ma.id)}
                                className="hover:text-rose-700 cursor-pointer"><X className="w-2.5 h-2.5" /></button>
                            </span>
                          ))
                        : <span className="text-[11px] text-muted-foreground">—</span>}
                      <button onClick={() => { setMapelModal({...p, selectedMapelId: ''}); setMapelError('') }}
                        className="text-[11px] text-primary font-bold hover:underline cursor-pointer">+Mapel</button>
                    </div>
                  </td>
                  <td className="hidden md:table-cell font-heading font-semibold text-sm">
                    {p.gajiPokok ? `Rp${p.gajiPokok.toLocaleString('id-ID')}` : '—'}
                  </td>
                  <td>
                    <button onClick={() => handleToggleAktif(p)}
                      className={`text-sm font-heading font-semibold border px-2 py-0.5 rounded-full cursor-pointer ${
                        p.aktif ? 'bg-emerald-100 border-emerald-800 text-emerald-800' : 'bg-amber-100 border-amber-800 text-amber-800'
                      }`}>
                      {p.aktif ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <Link to="/pegawai/$id" params={{ id: p.id }} className="p-1.5 bg-sky-100 hover:bg-sky-200 border-2 border-nb-ink rounded cursor-pointer inline-flex" title="Detail Pegawai">
                        <Eye className="w-3.5 h-3.5 text-sky-800" />
                      </Link>
                      <button onClick={() => openModal(p)} className="p-1.5 bg-sky-100 hover:bg-sky-200 border-2 border-nb-ink rounded cursor-pointer" title="Edit">
                        <Edit2 className="w-3.5 h-3.5 text-sky-800" />
                      </button>
                      <button onClick={() => handleDelete(p.id, p.nama)} className="p-1.5 bg-rose-100 hover:bg-rose-200 border-2 border-nb-ink rounded cursor-pointer" title="Hapus">
                        <Trash2 className="w-3.5 h-3.5 text-rose-800" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-card border-2 border-nb-ink rounded p-4">
          <span className="text-sm text-muted-foreground">{pegawaiList.length} dari {total} pegawai</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
              className="nb-btn nb-btn-secondary px-2 py-1 disabled:opacity-40 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-heading font-semibold text-sm flex items-center px-3 border-2 border-nb-ink rounded">{page} / {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
              className="nb-btn nb-btn-secondary px-2 py-1 disabled:opacity-40 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-2xl md:mx-4 shadow-lg mx-auto max-h-[85dvh] flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0 rounded-t-lg">
              <h3 className="font-heading font-bold text-sm">{editItem ? 'Edit Pegawai' : 'Tambah Pegawai'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-4">
              <form id="pegawaiForm" onSubmit={handleSubmit}>
                {formError && (
                  <div className="p-3 mb-4 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> <span>{formError}</span>
                  </div>
                )}

                <div className="mb-3">
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Unit <span className="font-normal normal-case">(opsional)</span></label>
                    <Combobox
                      options={[{ value: '', label: 'Tanpa Unit (Yayasan)' }, ...units.map((u: any) => ({ value: u.id, label: u.nama }))]}
                      value={formUnitId}
                      onValueChange={(v) => setFormUnitId(v)}
                      placeholder="Tanpa Unit (Yayasan)"
                      searchPlaceholder="Cari unit..."
                      emptyMessage="Tidak ada data"
                      className="w-full"
                      triggerClassName="nb-input"
                    />
                  </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama Lengkap *</label>
                    <input type="text" required value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} className="nb-input" autoFocus />
                  </div>
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">NIP</label>
                    <input type="text" value={formData.nip} onChange={(e) => setFormData({ ...formData, nip: e.target.value })} className="nb-input" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Jenis Kelamin</label>
                    <Combobox
                      options={[{value: 'L', label: 'Laki-laki'}, {value: 'P', label: 'Perempuan'}]}
                      value={formData.jenisKelamin}
                      onValueChange={(v) => setFormData({ ...formData, jenisKelamin: v })}
                      placeholder="Pilih..."
                      searchPlaceholder="Cari..."
                      emptyMessage="Tidak ada data"
                      className="w-full"
                      triggerClassName="nb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Status Pegawai</label>
                    <Combobox
                      options={STATUS_PEGAWAI_OPTIONS}
                      value={formData.statusPegawai}
                      onValueChange={(v) => setFormData({ ...formData, statusPegawai: v })}
                      placeholder="Pilih..."
                      searchPlaceholder="Cari status..."
                      emptyMessage="Tidak ada data"
                      className="w-full"
                      triggerClassName="nb-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Jabatan</label>
                    <Combobox
                      options={JABATAN_OPTIONS}
                      value={formData.jabatan}
                      onValueChange={(v) => setFormData({ ...formData, jabatan: v })}
                      placeholder="Pilih..."
                      searchPlaceholder="Cari jabatan..."
                      emptyMessage="Tidak ada data"
                      className="w-full"
                      triggerClassName="nb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tanggal Masuk</label>
                    <input type="date" value={formData.tanggalMasuk} onChange={(e) => setFormData({ ...formData, tanggalMasuk: e.target.value })} className="nb-input" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tempat Lahir</label>
                    <input type="text" value={formData.tempatLahir} onChange={(e) => setFormData({ ...formData, tempatLahir: e.target.value })} className="nb-input" />
                  </div>
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tanggal Lahir</label>
                    <input type="date" value={formData.tanggalLahir} onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })} className="nb-input" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Pendidikan Terakhir</label>
                    <input type="text" value={formData.pendidikanTerakhir} onChange={(e) => setFormData({ ...formData, pendidikanTerakhir: e.target.value })} className="nb-input" placeholder="S1" />
                  </div>
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Jurusan</label>
                    <input type="text" value={formData.jurusan} onChange={(e) => setFormData({ ...formData, jurusan: e.target.value })} className="nb-input" placeholder="Pendidikan Matematika" />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Alamat</label>
                  <textarea value={formData.alamat} onChange={(e) => setFormData({ ...formData, alamat: e.target.value })} className="nb-input h-16 resize-none" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Telepon</label>
                    <input type="text" value={formData.telepon} onChange={(e) => setFormData({ ...formData, telepon: e.target.value })} className="nb-input" />
                  </div>
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="nb-input" />
                  </div>
                </div>

                <div className="border-t-2 border-nb-ink pt-4 mt-4">
                    <h4 className="font-heading font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5" /> Informasi Penggajian
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Gaji Pokok</label>
                        <input type="number" value={formData.gajiPokok} onChange={(e) => setFormData({ ...formData, gajiPokok: parseInt(e.target.value) || 0 })} className="nb-input" />
                      </div>
                      <div>
                        <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Bank</label>
                        <input type="text" value={formData.bank} onChange={(e) => setFormData({ ...formData, bank: e.target.value })} className="nb-input" placeholder="BSI" />
                      </div>
                      <div>
                        <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">No. Rekening</label>
                        <input type="text" value={formData.nomorRekening} onChange={(e) => setFormData({ ...formData, nomorRekening: e.target.value })} className="nb-input" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Status Pajak (PTKP)</label>
                        <Combobox
                          options={[
                            {value: '', label: 'Pilih...'},
                            {value: 'TK/0', label: 'TK/0 — Tidak Kawin, 0 tanggungan'},
                            {value: 'TK/1', label: 'TK/1 — Tidak Kawin, 1 tanggungan'},
                            {value: 'TK/2', label: 'TK/2 — Tidak Kawin, 2 tanggungan'},
                            {value: 'TK/3', label: 'TK/3 — Tidak Kawin, 3 tanggungan'},
                            {value: 'K/0', label: 'K/0 — Kawin, 0 tanggungan'},
                            {value: 'K/1', label: 'K/1 — Kawin, 1 tanggungan'},
                            {value: 'K/2', label: 'K/2 — Kawin, 2 tanggungan'},
                            {value: 'K/3', label: 'K/3 — Kawin, 3 tanggungan'},
                          ]}
                          value={formData.statusPajak}
                          onValueChange={(v) => setFormData({ ...formData, statusPajak: v })}
                          placeholder="Pilih..."
                          searchPlaceholder="Cari status pajak..."
                          emptyMessage="Tidak ada data"
                          className="w-full"
                          triggerClassName="nb-input"
                        />
                      </div>
                    </div>
                  </div>
              </form>
            </div>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-3 bg-card rounded-b-lg">
              <button type="button" onClick={() => setIsModalOpen(false)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
              <button type="submit" form="pegawaiForm" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">{editItem ? 'Simpan Perubahan' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Mapel Assignment Modal */}
      {mapelModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-sm md:mx-4 shadow-lg">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2"><BookOpen className="w-4 h-4" /> Assign Mapel — {mapelModal.nama}</h3>
              <button onClick={() => setMapelModal(null)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAssignMapel} className="p-4 md:p-6 space-y-4">
              {mapelError && (
                <div className={`p-3 text-sm font-semibold rounded flex items-center gap-2 ${
                  mapelError === 'Berhasil ditambahkan' ? 'bg-emerald-100 border-2 border-emerald-800 text-emerald-800'
                    : 'bg-rose-100 border-2 border-rose-800 text-rose-800'
                }`}>
                  {mapelError === 'Berhasil ditambahkan' ? <UserCheck className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{mapelError}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Mata Pelajaran</label>
                <Combobox
                  options={[{value: '', label: 'Pilih Mapel'}, ...mapelList.map((m) => ({value: m.id, label: `${m.nama}${m.kode ? ` (${m.kode})` : ''}`}))]}
                  value={mapelModal.selectedMapelId || ''}
                  onValueChange={(v) => setMapelModal({ ...mapelModal, selectedMapelId: v })}
                  placeholder="Pilih Mapel"
                  searchPlaceholder="Cari mapel..."
                  emptyMessage="Tidak ada data"
                  className="w-full"
                  triggerClassName="nb-input"
                />
              </div>
              <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setMapelModal(null)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="submit" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-lg md:mx-4 shadow-lg max-h-[90dvh] flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Import Data Pegawai</h3>
              <button onClick={() => setIsImportOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4 md:p-6 space-y-4 overflow-y-auto">
              <div className="p-3 bg-blue-50 border-2 border-blue-800 border-dashed rounded text-sm space-y-2">
                <p className="font-heading font-semibold text-blue-900">
                  Gunakan template untuk memudahkan import data.
                </p>
                <button
                  onClick={async () => {
                    setTemplateLoading(true)
                    try {
                      const { base64, fileName } = await downloadTemplatePegawai()
                      const url = URL.createObjectURL(
                        new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
                      )
                      const a = document.createElement('a')
                      a.href = url
                      a.download = fileName
                      a.click()
                      URL.revokeObjectURL(url)
                    } catch (err: any) {
                      alert('Gagal mengunduh template')
                    }
                    setTemplateLoading(false)
                  }}
                  disabled={templateLoading}
                  className="nb-btn nb-btn-primary text-sm py-1.5 px-3 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  {templateLoading ? 'Mengunduh...' : 'Download Template XLSX'}
                </button>
              </div>

              <div className="border-t-2 border-nb-ink/30 pt-4">
                {!importResult ? (
                  <>
                    {importError && (
                      <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2 mb-4">
                        <AlertCircle className="w-4 h-4 shrink-0" /> <span>{importError}</span>
                      </div>
                    )}

                    <form onSubmit={async (e) => {
                      e.preventDefault()
                      if (!importFile || (!activeUnit && !formUnitId)) return
                      setImportLoading(true)
                      setImportError('')
                      try {
                        const buf = await importFile.arrayBuffer()
                        const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
                        const result = await importPegawai({ data: { unitId: formUnitId || activeUnit?.id || '', fileBase64: base64, fileName: importFile.name } })
                        setImportResult(result)
                        fetchPegawai()
                      } catch (err: any) {
                        setImportError(err.message || 'Gagal mengimport data')
                      }
                      setImportLoading(false)
                    }} className="space-y-4">
                      <div>
                        <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Pilih File</label>
                        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" required
                          onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                          className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:border-2 file:border-nb-ink file:rounded file:bg-card file:text-sm file:font-heading file:font-bold file:cursor-pointer hover:file:bg-secondary" />
                        <p className="text-sm text-muted-foreground mt-1">Format: XLSX, XLS, atau CSV</p>
                      </div>

                      <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                        <button type="button" onClick={() => setIsImportOpen(false)}
                          className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                        <button type="submit" disabled={!importFile || importLoading}
                          className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center disabled:opacity-50">
                          {importLoading ? 'Memproses...' : 'Import Data'}
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-emerald-100 border-2 border-emerald-800 text-emerald-800 rounded text-center">
                          <p className="text-sm font-heading font-bold">Berhasil</p>
                          <p className="text-2xl font-heading font-black">{importResult.success}</p>
                        </div>
                        <div className="p-3 bg-amber-100 border-2 border-amber-800 text-amber-800 rounded text-center">
                          <p className="text-sm font-heading font-bold">Gagal / Lewat</p>
                          <p className="text-2xl font-heading font-black">{importResult.errors.length}</p>
                        </div>
                      </div>
                      {importResult.errors.length > 0 && (
                        <div>
                          <p className="text-sm font-heading font-bold text-rose-700 mb-1">Detail Error:</p>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {importResult.errors.map((e: any, i: number) => (
                              <p key={i} className="text-sm text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded">
                                Baris {e.row}: {e.message}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="border-t-2 border-nb-ink pt-4 mt-6 flex justify-end gap-3">
                      <button onClick={() => { setImportResult(null); setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                        className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center text-sm">Import Lagi</button>
                      <button onClick={() => setIsImportOpen(false)}
                        className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center text-sm">Selesai</button>
                    </div>
                  </>
                )}
              </div>
            </div>
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
