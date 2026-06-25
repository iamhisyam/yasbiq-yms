import { createFileRoute, Link } from '@tanstack/react-router'
import { getKelasById, getSiswaByKelas } from '#/server/kelas'
import { useState, useEffect } from 'react'
import {
  ArrowLeft, GraduationCap, Users, User, Phone, Mail, BadgeCheck,
  Search, ChevronLeft, ChevronRight, AlertCircle,
} from 'lucide-react'
import { Combobox } from '#/components/ui/combobox'

export const Route = createFileRoute('/_dashboard/kelas_/$id')({
  component: KelasDetailPage,
})

const STATUS_LABEL: Record<string, string> = {
  aktif: 'Aktif', nonaktif: 'Nonaktif', lulus: 'Lulus', mutasi: 'Mutasi',
  drop_out: 'DO', cuti: 'Cuti',
}
const STATUS_CLASS: Record<string, string> = {
  aktif: 'bg-emerald-100 border-emerald-800 text-emerald-800',
  nonaktif: 'bg-rose-100 border-rose-800 text-rose-800',
  lulus: 'bg-blue-100 border-blue-800 text-blue-800',
  mutasi: 'bg-amber-100 border-amber-800 text-amber-800',
  drop_out: 'bg-rose-100 border-rose-800 text-rose-800',
  cuti: 'bg-yellow-100 border-yellow-800 text-yellow-800',
}

function rp(n: number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n) }

function KelasDetailPage() {
  const { id } = Route.useParams()
  const [kelas, setKelas] = useState<any>(null)
  const [siswaList, setSiswaList] = useState<any[]>([])
  const [totalSiswa, setTotalSiswa] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 50

  const fetchSiswa = () => {
    getSiswaByKelas({ data: { kelasId: id, search: search || undefined, status: filterStatus || undefined, page, pageSize } })
      .then((d) => { setSiswaList(d.data); setTotalSiswa(d.total) })
      .catch(console.error)
  }

  useEffect(() => {
    setLoading(true); setError('')
    getKelasById({ data: { id } })
      .then(setKelas)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchSiswa() }, [id, search, filterStatus, page])

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 bg-muted animate-pulse rounded w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted animate-pulse rounded border-2 border-nb-ink" />)}
      </div>
      <div className="h-64 bg-muted animate-pulse rounded border-2 border-nb-ink" />
    </div>
  )

  if (error) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/kelas" className="p-2 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h2 className="font-heading font-bold text-lg">Detail Kelas</h2>
      </div>
      <div className="p-4 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm rounded flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
      </div>
    </div>
  )

  if (!kelas) return null

  const siswaAktif = siswaList.filter((s: any) => s.status === 'aktif').length
  const siswaL = siswaList.filter((s: any) => s.jenisKelamin === 'L').length
  const siswaP = siswaList.filter((s: any) => s.jenisKelamin === 'P').length
  const totalPages = Math.ceil(totalSiswa / pageSize)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/kelas" className="p-2 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="font-heading font-bold text-lg">Detail Kelas</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {kelas.nama}
            {kelas.tingkatRef && <span className="ml-1">— {kelas.tingkatRef.nama}</span>}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border-2 border-nb-ink rounded p-3">
          <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Total Siswa</span></div>
          <p className="text-lg font-heading font-bold">{totalSiswa}</p>
        </div>
        <div className="bg-card border-2 border-nb-ink rounded p-3">
          <div className="flex items-center gap-2 mb-1"><BadgeCheck className="w-4 h-4 text-emerald-600" /><span className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Aktif</span></div>
          <p className="text-lg font-heading font-bold text-emerald-700">{siswaAktif}</p>
        </div>
        <div className="bg-card border-2 border-nb-ink rounded p-3">
          <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-blue-600" /><span className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Laki-laki</span></div>
          <p className="text-lg font-heading font-bold text-blue-700">{siswaL}</p>
        </div>
        <div className="bg-card border-2 border-nb-ink rounded p-3">
          <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-rose-600" /><span className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Perempuan</span></div>
          <p className="text-lg font-heading font-bold text-rose-700">{siswaP}</p>
        </div>
      </div>

      {/* Wali Kelas Card */}
      <div className="bg-card border-2 border-nb-ink rounded p-4">
        <h3 className="font-heading font-bold text-sm mb-3 flex items-center gap-2">
          <User className="w-4 h-4" /> Wali Kelas
        </h3>
        {kelas.waliKelas ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Nama</p>
              <p className="font-heading font-bold text-sm mt-0.5">{kelas.waliKelas.nama}</p>
              {kelas.waliKelas.nip && <p className="text-sm text-muted-foreground">NIP: {kelas.waliKelas.nip}</p>}
            </div>
            <div>
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Jabatan</p>
              <p className="text-sm mt-0.5 capitalize">{kelas.waliKelas.jabatan?.replace(/_/g, ' ') || '-'}</p>
            </div>
            <div className="space-y-1">
              {kelas.waliKelas.telepon && (
                <p className="text-sm flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-muted-foreground" /> {kelas.waliKelas.telepon}</p>
              )}
              {kelas.waliKelas.email && (
                <p className="text-sm flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-muted-foreground" /> {kelas.waliKelas.email}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Belum ada wali kelas</p>
        )}
      </div>

      {/* Student List */}
      <div className="bg-card border-2 border-nb-ink rounded">
        <div className="p-4 border-b-2 border-nb-ink">
          <h3 className="font-heading font-bold text-sm flex items-center gap-2 mb-3">
            <GraduationCap className="w-4 h-4" /> Daftar Siswa
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="w-4 h-4 text-muted-foreground" /></span>
              <input type="text" placeholder="Cari nama/NIS..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="nb-input pl-9" />
            </div>
            <Combobox
              options={[{value: '', label: 'Semua Status'}, ...Object.entries(STATUS_LABEL).map(([k, v]) => ({value: k as string, label: v as string}))]}
              value={filterStatus}
              onValueChange={(v) => { setFilterStatus(v); setPage(1) }}
              placeholder="Semua Status"
              triggerClassName="nb-input text-sm"
            />
            <div />
          </div>
        </div>

        {siswaList.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>Tidak ada siswa</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="nb-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>NIS</th>
                  <th>Nama</th>
                  <th className="hidden md:table-cell">Jenis Kelamin</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {siswaList.map((s: any, i: number) => (
                  <tr key={s.id}>
                    <td className="text-sm text-muted-foreground">{(page - 1) * pageSize + i + 1}</td>
                    <td className="text-sm font-mono">{s.nis || '-'}</td>
                    <td className="font-heading font-bold text-sm">{s.nama}</td>
                    <td className="hidden md:table-cell text-sm">{s.jenisKelamin === 'L' ? 'Laki-laki' : s.jenisKelamin === 'P' ? 'Perempuan' : '-'}</td>
                    <td>
                      <span className={`text-sm px-2 py-0.5 rounded border font-heading font-bold ${STATUS_CLASS[s.status] || ''}`}>
                        {STATUS_LABEL[s.status] || s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t-2 border-nb-ink flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{totalSiswa} siswa</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="nb-btn nb-btn-secondary px-2 py-1 cursor-pointer disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-heading font-bold">{page}/{totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="nb-btn nb-btn-secondary px-2 py-1 cursor-pointer disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
