import { createFileRoute } from '@tanstack/react-router'
import { useUnit } from '#/lib/unit-context'
import {
  getSiswaList,
  createSiswa,
  updateSiswa,
  deleteSiswa
} from '#/server/siswa'
import { importSiswa, downloadTemplate } from '#/server/siswa-import'
import { getSiswaRiwayat, catatStatusSiswa, getTahunAjaranList } from '#/server/tahun-ajaran'
import { getAngkatanKurikulumList } from '#/server/kurikulum'
import { getKelasList } from '#/server/kelas'
import { useState, useEffect, useRef } from 'react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import {
  Search,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Users,
  AlertCircle,
  Upload,
  Download,
  Flag,
  ScrollText,
  Eye,
} from 'lucide-react'
import { Combobox } from '#/components/ui/combobox'
import { ActionMenu } from '#/components/ui/action-menu'

export const Route = createFileRoute('/_dashboard/siswa')({
  component: SiswaPage,
})

function SiswaPage() {
  const { activeUnit } = useUnit()
  
  // State
  const [siswaList, setSiswaList] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [search, setSearch] = useState('')
  const [kelasId, setKelasId] = useState('')
  const [status, setStatus] = useState<'aktif' | 'nonaktif' | 'lulus' | 'pindah' | 'dikeluarkan' | ''>('aktif')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSiswa, setEditingSiswa] = useState<any>(null)
  
  // Form fields
  const [formData, setFormData] = useState({
    nis: '',
    nama: '',
    kelasId: '',
    jenisKelamin: 'L' as 'L' | 'P',
    tanggalLahir: '',
    alamat: '',
    tahunMasuk: new Date().getFullYear(),
    status: 'aktif' as any,
    keterangan: '',
  })
  const [formError, setFormError] = useState('')

  // Tahun Ajaran & History state
  const [tahunAjaranList, setTahunAjaranList] = useState<any[]>([])
  const [kelasList, setKelasList] = useState<any[]>([])
  const [angkatanKurikulumMap, setAngkatanKurikulumMap] = useState<Record<number, string>>({})
  const [confirmDelete, setConfirmDelete] = useState<{message: string; onConfirm: () => void} | null>(null)
  const [catatModalOpen, setCatatModalOpen] = useState(false)
  const [catatSiswa, setCatatSiswa] = useState<any>(null)
  const [catatForm, setCatatForm] = useState({ tahunAjaranId: '', kelasId: '', status: 'lulus', tanggal: '', keterangan: '' })
  const [catatError, setCatatError] = useState('')

  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historySiswa, setHistorySiswa] = useState<any>(null)
  const [historyList, setHistoryList] = useState<any[]>([])

  // Import state
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [importError, setImportError] = useState('')
  const [templateLoading, setTemplateLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch Siswa List
  const fetchSiswa = () => {
    if (!activeUnit) return
    setLoading(true)
    getSiswaList({
      data: {
        unitId: activeUnit.id,
        search: search || undefined,
        kelasId: kelasId || undefined,
        status: status || undefined,
        page,
        pageSize,
      }
    })
      .then((res) => {
        setSiswaList(res.data)
        setTotal(res.total)
      })
      .catch((err) => {
        console.error('Error fetching students:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchSiswa()
  }, [activeUnit, search, kelasId, status, page])

  useEffect(() => {
    if (!activeUnit) return
    getTahunAjaranList({ data: { unitId: activeUnit.id } }).then(setTahunAjaranList).catch(() => {})
    getKelasList({ data: { unitId: activeUnit.id } }).then(setKelasList).catch(() => {})
    getAngkatanKurikulumList({ data: { unitId: activeUnit.id } }).then((list) => {
      const map: Record<number, string> = {}
      list.forEach((a: any) => { map[a.tahun] = a.kurikulum?.nama || '—' })
      setAngkatanKurikulumMap(map)
    }).catch(() => {})
  }, [activeUnit])

  // Reset page when filters change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handleKelasChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setKelasId(e.target.value)
    setPage(1)
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value as any)
    setPage(1)
  }

  // Open Add/Edit Modal
  const openModal = (siswa: any = null) => {
    setFormError('')
    if (siswa) {
      setEditingSiswa(siswa)
      setFormData({
        nis: siswa.nis || '',
        nama: siswa.nama || '',
        kelasId: siswa.kelasId || '',
        jenisKelamin: (siswa.jenisKelamin as any) || 'L',
        tanggalLahir: siswa.tanggalLahir || '',
        alamat: siswa.alamat || '',
        tahunMasuk: siswa.tahunMasuk || new Date().getFullYear(),
        status: siswa.status || 'aktif',
        keterangan: siswa.keterangan || '',
      })
    } else {
      setEditingSiswa(null)
      setFormData({
        nis: '',
        nama: '',
        kelasId: '',
        jenisKelamin: 'L',
        tanggalLahir: '',
        alamat: '',
        tahunMasuk: new Date().getFullYear(),
        status: 'aktif',
        keterangan: '',
      })
    }
    setIsModalOpen(true)
  }

  // Handle Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeUnit) return
    setFormError('')

    try {
      if (editingSiswa) {
        await updateSiswa({
          data: {
            id: editingSiswa.id,
            data: {
              ...formData,
              unitId: activeUnit.id,
            }
          }
        })
      } else {
        await createSiswa({
          data: {
            ...formData,
            unitId: activeUnit.id,
          }
        })
      }
      setIsModalOpen(false)
      fetchSiswa()
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data siswa')
    }
  }

  // Handle Delete (Soft Delete)
  const handleDelete = (id: string) => {
    setConfirmDelete({
      message: 'Apakah Anda yakin ingin menonaktifkan siswa ini?',
      onConfirm: async () => {
        try {
          await deleteSiswa({ data: { id } })
          fetchSiswa()
          setConfirmDelete(null)
        } catch (err: any) {
          alert(err.message || 'Gagal menghapus siswa')
        }
      },
    })
  }

  const totalPages = Math.ceil(total / pageSize) || 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">Manajemen Data Siswa</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Daftar, tambah, edit, dan kelola data siswa di unit {activeUnit?.nama}.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => {
              setIsImportOpen(true)
              setImportFile(null)
              setImportResult(null)
              setImportError('')
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
            className="nb-btn nb-btn-secondary cursor-pointer w-full md:w-auto justify-center"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button
            onClick={() => openModal(null)}
            className="nb-btn nb-btn-primary cursor-pointer w-full md:w-auto justify-center"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-card border-2 border-nb-ink rounded">
        {/* Search */}
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-nb-ink-soft" />
          </span>
          <input
            type="text"
            placeholder="Cari nama atau NIS siswa..."
            value={search}
            onChange={handleSearchChange}
            className="nb-input nb-input--icon"
          />
        </div>

        {/* Filter Kelas */}
        <div>
          <Combobox
            options={[{value: '', label: 'Semua Kelas'}, ...kelasList.map((k) => ({value: k.id, label: k.nama}))]}
            value={kelasId}
            onValueChange={(v) => { setKelasId(v); setPage(1) }}
            placeholder="Semua Kelas"
            searchPlaceholder="Cari kelas..."
            emptyMessage="Tidak ada data"
            className="w-full"
          />
        </div>

        {/* Filter Status */}
        <div>
          <Combobox
            options={[
              {value: '', label: 'Semua Status'},
              {value: 'aktif', label: 'Aktif'},
              {value: 'nonaktif', label: 'Nonaktif'},
              {value: 'lulus', label: 'Lulus'},
              {value: 'pindah', label: 'Pindah'},
              {value: 'dikeluarkan', label: 'Dikeluarkan'},
            ]}
            value={status}
            onValueChange={(v) => { setStatus(v as any); setPage(1) }}
            placeholder="Semua Status"
            searchPlaceholder="Cari status..."
            emptyMessage="Tidak ada data"
            className="w-full"
          />
        </div>
      </div>

      {/* Siswa Table */}
      <div className="nb-table-wrapper bg-card">
        {loading ? (
          <div className="p-8 text-center font-heading font-semibold text-sm text-muted-foreground animate-pulse">
            Memuat data siswa...
          </div>
        ) : siswaList.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
            <h3 className="font-heading font-bold text-sm text-foreground">Siswa Tidak Ditemukan</h3>
            <p className="text-sm text-muted-foreground mt-1">Coba sesuaikan kata kunci pencarian atau filter Anda.</p>
          </div>
        ) : (
          <table className="nb-table">
            <thead>
              <tr>
                <th>NIS</th>
                <th>Nama Siswa</th>
                <th>Kelas</th>
                <th>L/P</th>
                <th>Angkatan</th>
                <th>Kurikulum</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {siswaList.map((siswa) => (
                <tr key={siswa.id}>
                  <td className="font-mono text-sm font-bold text-foreground">{siswa.nis}</td>
                  <td>
                    <div className="font-heading font-bold text-sm text-foreground">{siswa.nama}</div>
                  </td>
                  <td>
                    <span className="bg-amber-100 border border-nb-ink/20 px-1.5 py-0.5 rounded text-[11px] font-heading font-semibold">
                    {siswa.kelasRef?.nama || '—'}
                    </span>
                  </td>
                  <td className="font-heading font-semibold text-sm text-nb-ink-soft">
                    {siswa.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                  </td>
                  <td className="font-heading font-semibold text-sm text-nb-ink-soft">{siswa.tahunMasuk}</td>
                  <td>
                    {angkatanKurikulumMap[siswa.tahunMasuk] ? (
                      <span className="bg-indigo-100 border border-indigo-800 text-indigo-800 px-1.5 py-0.5 rounded text-sm font-heading font-semibold">
                        {angkatanKurikulumMap[siswa.tahunMasuk]}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`nb-badge ${
                      siswa.status === 'aktif'
                        ? 'nb-badge-success'
                        : siswa.status === 'lulus'
                          ? 'nb-badge-info'
                          : 'nb-badge-danger'
                    }`}>
                      {siswa.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <ActionMenu items={[
                      { label: 'Detail Siswa', icon: <Eye className="w-3.5 h-3.5" />, onClick: () => window.location.href = `/siswa/${siswa.id}` },
                      { label: 'Catat Status', icon: <Flag className="w-3.5 h-3.5 text-amber-800" />, onClick: () => { setCatatSiswa(siswa); setCatatForm({ tahunAjaranId: '', kelasId: '', status: 'lulus', tanggal: new Date().toISOString().slice(0, 10), keterangan: '' }); setCatatError(''); setCatatModalOpen(true) }, variant: 'warning' as const },
                      { label: 'Riwayat', icon: <ScrollText className="w-3.5 h-3.5 text-violet-800" />, onClick: async () => { setHistorySiswa(siswa); setHistoryList([]); setHistoryModalOpen(true); try { const res = await getSiswaRiwayat({ data: { siswaId: siswa.id } }); setHistoryList(res) } catch {} } },
                      { label: 'Edit', icon: <Edit2 className="w-3.5 h-3.5 text-sky-800" />, onClick: () => openModal(siswa), variant: 'warning' as const },
                      { label: 'Nonaktifkan', icon: <Trash2 className="w-3.5 h-3.5 text-rose-800" />, onClick: () => handleDelete(siswa.id), variant: 'danger' as const },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {!loading && total > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-card border-2 border-nb-ink rounded p-4 shadow-sm">
          <span className="font-heading text-sm text-nb-ink-soft">
            Menampilkan <strong className="text-foreground">{siswaList.length}</strong> dari{' '}
            <strong className="text-foreground">{total}</strong> siswa
          </span>
          <div className="inline-flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="nb-btn nb-btn-secondary px-2 py-1 flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-heading font-semibold text-sm flex items-center justify-center px-3 border-2 border-nb-ink rounded bg-secondary/20 shadow-sm">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="nb-btn nb-btn-secondary px-2 py-1 flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-lg md:mx-4 shadow-lg mx-auto max-h-[85dvh] flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0 rounded-t-lg">
              <h3 className="font-heading font-bold text-sm text-foreground">
                {editingSiswa ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4">
              <form id="siswaForm" onSubmit={handleFormSubmit}>
                {formError && (
                  <div className="p-3 mb-4 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">NIS</label>
                    <input type="text" required value={formData.nis} onChange={(e) => setFormData({ ...formData, nis: e.target.value })} className="nb-input font-mono" placeholder="Nomor Induk Siswa" />
                  </div>
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Kelas</label>
                    <Combobox
                      options={[{value: '', label: 'Pilih Kelas'}, ...kelasList.map((k) => ({value: k.id, label: k.nama}))]}
                      value={formData.kelasId}
                      onValueChange={(v) => setFormData({ ...formData, kelasId: v })}
                      placeholder="Pilih Kelas"
                      searchPlaceholder="Cari kelas..."
                      emptyMessage="Tidak ada data"
                      className="w-full"
                      triggerClassName="nb-input"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama Lengkap</label>
                  <input type="text" required value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} className="nb-input" placeholder="Nama Lengkap Siswa" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Jenis Kelamin</label>
                    <Combobox
                      options={[{value: 'L', label: 'Laki-laki'}, {value: 'P', label: 'Perempuan'}]}
                      value={formData.jenisKelamin}
                      onValueChange={(v) => setFormData({ ...formData, jenisKelamin: v as any })}
                      placeholder="Pilih..."
                      searchPlaceholder="Cari..."
                      emptyMessage="Tidak ada data"
                      className="w-full"
                      triggerClassName="nb-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tahun Masuk</label>
                    <input type="number" required value={formData.tahunMasuk} onChange={(e) => setFormData({ ...formData, tahunMasuk: parseInt(e.target.value) || new Date().getFullYear() })} className="nb-input" />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Alamat</label>
                  <textarea value={formData.alamat} onChange={(e) => setFormData({ ...formData, alamat: e.target.value })} className="nb-input h-20 resize-none" placeholder="Alamat tempat tinggal siswa" />
                </div>

                {editingSiswa && (
                  <div className="mt-3">
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Status Siswa</label>
                    <Combobox
                      options={[
                        {value: 'aktif', label: 'Aktif'},
                        {value: 'nonaktif', label: 'Nonaktif'},
                        {value: 'lulus', label: 'Lulus'},
                        {value: 'pindah', label: 'Pindah'},
                        {value: 'dikeluarkan', label: 'Dikeluarkan'},
                      ]}
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v as any })}
                      placeholder="Pilih..."
                      searchPlaceholder="Cari status..."
                      emptyMessage="Tidak ada data"
                      className="w-full"
                      triggerClassName="nb-input"
                    />
                  </div>
                )}
              </form>
            </div>

            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-3 bg-card rounded-b-lg">
              <button type="button" onClick={() => setIsModalOpen(false)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
              <button type="submit" form="siswaForm" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">Simpan Data</button>
            </div>
          </div>
        </div>
      )}

      {/* Catat Status Modal */}
      {catatModalOpen && catatSiswa && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-sm md:mx-4 shadow-lg">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Catat Status / Kelulusan</h3>
              <button onClick={() => setCatatModalOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setCatatError('')
                try {
                  await catatStatusSiswa({ data: { siswaId: catatSiswa.id, tahunAjaranId: catatForm.tahunAjaranId, status: catatForm.status as 'aktif' | 'nonaktif' | 'lulus' | 'pindah' | 'dikeluarkan', tanggal: catatForm.tanggal, keterangan: catatForm.keterangan } })
                  setCatatModalOpen(false)
                  fetchSiswa()
                } catch (err: any) {
                  setCatatError(err.message || 'Gagal menyimpan status')
                }
              }}
              className="p-4 md:p-6 space-y-4"
            >
              {catatError && (
                <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> <span>{catatError}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Siswa</label>
                <p className="text-sm font-heading font-bold text-foreground border-2 border-nb-ink/30 rounded p-2 bg-muted/40">{catatSiswa.nama}</p>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Status</label>
                <Combobox
                  options={[
                    {value: 'aktif', label: 'Aktif'},
                    {value: 'lulus', label: 'Lulus'},
                    {value: 'nonaktif', label: 'Nonaktif'},
                    {value: 'pindah', label: 'Pindah'},
                    {value: 'dikeluarkan', label: 'Dikeluarkan'},
                  ]}
                  value={catatForm.status}
                  onValueChange={(v) => setCatatForm({ ...catatForm, status: v })}
                  placeholder="Pilih..."
                  searchPlaceholder="Cari status..."
                  emptyMessage="Tidak ada data"
                  className="w-full"
                  triggerClassName="nb-input"
                />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tahun Ajaran</label>
                <Combobox
                  options={[{value: '', label: 'Pilih Tahun Ajaran'}, ...tahunAjaranList.map((ta) => ({value: ta.id, label: ta.nama}))]}
                  value={catatForm.tahunAjaranId}
                  onValueChange={(v) => setCatatForm({ ...catatForm, tahunAjaranId: v })}
                  placeholder="Pilih Tahun Ajaran"
                  searchPlaceholder="Cari tahun ajaran..."
                  emptyMessage="Tidak ada data"
                  className="w-full"
                  triggerClassName="nb-input"
                />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tanggal</label>
                <input type="date" required value={catatForm.tanggal} onChange={(e) => setCatatForm({ ...catatForm, tanggal: e.target.value })} className="nb-input" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Keterangan <span className="font-normal lowercase">(opsional)</span></label>
                <textarea value={catatForm.keterangan} onChange={(e) => setCatatForm({ ...catatForm, keterangan: e.target.value })} className="nb-input h-20 resize-none" placeholder="Alasan atau catatan tambahan..." />
              </div>
              <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setCatatModalOpen(false)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="submit" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalOpen && historySiswa && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-lg md:mx-4 shadow-lg max-h-[90dvh] flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Riwayat Status — {historySiswa.nama}</h3>
              <button onClick={() => setHistoryModalOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto space-y-3">
              {historyList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Belum ada riwayat status.</p>
              ) : (
                historyList.map((r: any) => (
                  <div key={r.id} className="p-3 border-2 border-nb-ink rounded bg-card space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className={`nb-badge text-sm ${
                        r.status === 'aktif' ? 'nb-badge-success' : r.status === 'lulus' ? 'nb-badge-info' : 'nb-badge-danger'
                      }`}>{r.status}</span>
                      <span className="text-sm text-muted-foreground">{new Date(r.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <p className="text-sm font-heading font-semibold">{r.tahunAjaran?.nama || '—'}{r.kelas ? ` • ${r.kelas.nama}` : ''}</p>
                    {r.keterangan && <p className="text-sm text-muted-foreground">{r.keterangan}</p>}
                  </div>
                ))
              )}
            </div>
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

      {/* Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-lg md:mx-4 shadow-lg max-h-[90dvh] flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Import Data Siswa</h3>
              <button
                onClick={() => setIsImportOpen(false)}
                className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-4 overflow-y-auto">
              {/* Download Template */}
              <div className="p-3 bg-blue-50 border-2 border-blue-800 border-dashed rounded text-sm space-y-2">
                <p className="font-heading font-semibold text-blue-900">
                  Gunakan template untuk memudahkan import data.
                </p>
                <button
                  onClick={async () => {
                    setTemplateLoading(true)
                    try {
                      const { base64, fileName } = await downloadTemplate()
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
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{importError}</span>
                      </div>
                    )}

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault()
                        if (!importFile || !activeUnit) return

                        setImportLoading(true)
                        setImportError('')
                        try {
                          const buf = await importFile.arrayBuffer()
                          const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
                          const result = await importSiswa({
                            data: { unitId: activeUnit.id, fileBase64: base64, fileName: importFile.name },
                          })
                          setImportResult(result)
                          fetchSiswa()
                        } catch (err: any) {
                          setImportError(err.message || 'Gagal mengimport data')
                        }
                        setImportLoading(false)
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Pilih File</label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          required
                          onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                          className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:border-2 file:border-nb-ink file:rounded file:bg-card file:text-sm file:font-heading file:font-bold file:cursor-pointer hover:file:bg-secondary"
                        />
                        <p className="text-sm text-muted-foreground mt-1">Format: XLSX, XLS, atau CSV</p>
                      </div>

                      <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setIsImportOpen(false)}
                          className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={!importFile || importLoading}
                          className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center disabled:opacity-50"
                        >
                          {importLoading ? 'Memproses...' : 'Import Data'}
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <>
                    {/* Results */}
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
                      <button
                        onClick={() => {
                          setImportResult(null)
                          setImportFile(null)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center text-sm"
                      >
                        Import Lagi
                      </button>
                      <button
                        onClick={() => setIsImportOpen(false)}
                        className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center text-sm"
                      >
                        Selesai
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
