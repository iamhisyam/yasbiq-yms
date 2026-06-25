import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { getPegawaiDetail, updatePegawai } from '#/server/pegawai'
import { useState, useEffect, lazy, Suspense } from 'react'
import {
  ArrowLeft, Briefcase, DollarSign, User, BookOpen, FileText, AlertCircle,
  X, Edit2, Pencil, Building2, Hash, Phone, Mail, MapPin, Calendar, Award, BadgeCheck,
} from 'lucide-react'
import { Combobox } from '#/components/ui/combobox'

const PDFViewer = lazy(() =>
  import('@react-pdf/renderer').then((mod) => ({ default: mod.PDFViewer })),
)

export const Route = createFileRoute('/_dashboard/pegawai_/$id')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'admin_yayasan' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },
  component: PegawaiDetailPage,
})

const JABATAN_LABEL: Record<string, string> = {
  guru_mapel: 'Guru Mapel', guru_kelas: 'Guru Kelas', kepala_sekolah: 'Kepala Sekolah',
  tata_usaha: 'Tata Usaha', bendahara: 'Bendahara', staff: 'Staff Lainnya',
}
const STATUS_LABEL: Record<string, string> = {
  pns: 'PNS', honorer: 'Honorer (GTT)', kontrak: 'Kontrak (PTK)', tetap: 'Tetap Yayasan', magang: 'Magang',
}
const STATUS_CLS: Record<string, string> = {
  pns: 'bg-purple-100 border-purple-800 text-purple-800',
  honorer: 'bg-amber-100 border-amber-800 text-amber-800',
  kontrak: 'bg-blue-100 border-blue-800 text-blue-800',
  tetap: 'bg-emerald-100 border-emerald-800 text-emerald-800',
  magang: 'bg-gray-100 border-gray-600 text-gray-600',
}
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

function rp(n: number) { return new Intl.NumberFormat('id-ID').format(n) }

function PegawaiDetailPage() {
  const { id } = Route.useParams()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [slipModal, setSlipModal] = useState<any>(null)
  const [editModal, setEditModal] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [editFormError, setEditFormError] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const fetch = () => {
    setLoading(true); setError('')
    getPegawaiDetail({ data: { id } })
      .then((d) => { if (!d) { setError('Pegawai tidak ditemukan'); return }; setData(d) })
      .catch((err) => setError(err.message || 'Gagal memuat data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [id])

  const openEditModal = () => {
    if (!data) return
    setEditForm({
      nip: data.nip || '', nama: data.nama || '', jenisKelamin: data.jenisKelamin || 'L',
      tempatLahir: data.tempatLahir || '', tanggalLahir: data.tanggalLahir || '',
      alamat: data.alamat || '', telepon: data.telepon || '', email: data.email || '',
      statusPegawai: data.statusPegawai || 'honorer', jabatan: data.jabatan || 'guru_mapel',
      tanggalMasuk: data.tanggalMasuk || '', tanggalKeluar: data.tanggalKeluar || '',
      pendidikanTerakhir: data.pendidikanTerakhir || '', jurusan: data.jurusan || '',
      bank: data.bank || '', nomorRekening: data.nomorRekening || '',
      gajiPokok: data.gajiPokok || 0, statusPajak: data.statusPajak || '',
    })
    setEditFormError(''); setEditModal(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setEditFormError(''); setEditLoading(true)
    try {
      await updatePegawai({ data: { id, data: editForm } })
      setEditModal(false); fetch()
    } catch (err: any) {
      setEditFormError(err.message || 'Gagal menyimpan')
    } finally { setEditLoading(false) }
  }

  if (loading) return (
    <div className="space-y-4"><div className="h-48 bg-muted animate-pulse border-2 border-nb-ink rounded" /></div>
  )

  if (error) return (
    <div className="space-y-4">
      <Link to="/pegawai" className="inline-flex items-center gap-1 text-sm font-heading font-bold hover:underline cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </Link>
      <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
      </div>
    </div>
  )

  if (!data) return null

  const totalPenerimaan = data.penggajian?.reduce((s: number, g: any) => s + g.totalPenerimaan, 0) || 0
  const totalPotongan = data.penggajian?.reduce((s: number, g: any) => s + g.totalPotongan, 0) || 0
  const totalPph21 = data.penggajian?.reduce((s: number, g: any) => s + (g.pph21 || 0), 0) || 0
  const totalDiterima = data.penggajian?.reduce((s: number, g: any) => s + g.totalDiterima, 0) || 0

  const EditReveal = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick}
      className="absolute top-2 right-2 p-1 bg-card border border-nb-ink rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-secondary z-10"
      title="Edit">
      <Pencil className="w-3.5 h-3.5" />
    </button>
  )

  const Card = ({ icon: Icon, title, children, onEdit }: any) => (
    <div className="bg-card border-2 border-nb-ink rounded-lg relative group">
      <div className="bg-secondary p-3 border-b-2 border-nb-ink flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <h3 className="font-heading font-bold text-sm uppercase">{title}</h3>
      </div>
      {onEdit && <EditReveal onClick={onEdit} />}
      {children}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="nb-page-header flex items-start sm:items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/pegawai" className="text-sm font-heading font-bold text-muted-foreground hover:underline cursor-pointer flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Pegawai
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-heading font-bold">Detail</span>
          </div>
          <h2 className="nb-page-title">{data.nama}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.nip && <>NIP {data.nip} · </>}
            {data.unit?.nama || 'Yayasan'} · {JABATAN_LABEL[data.jabatan] || data.jabatan || '-'}
            {data.statusPajak && <> · Status Pajak: {data.statusPajak}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={openEditModal} className="nb-btn nb-btn-primary text-sm cursor-pointer">
            <Edit2 className="w-4 h-4" /> Edit Data
          </button>
          <Link to="/pegawai" className="nb-btn nb-btn-secondary text-sm cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Link>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card icon={User} title="Data Pribadi" onEdit={openEditModal}>
          <div className="p-4 space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">NIP</span><span className="font-semibold">{data.nip || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Jenis Kelamin</span><span className="font-semibold">{data.jenisKelamin === 'L' ? 'Laki-laki' : data.jenisKelamin === 'P' ? 'Perempuan' : '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tempat Lahir</span><span className="font-semibold">{data.tempatLahir || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tanggal Lahir</span><span className="font-semibold">{data.tanggalLahir || '—'}</span></div>
            <div className="flex justify-between items-start"><span className="text-muted-foreground shrink-0">Alamat</span><span className="font-semibold text-right max-w-[60%]">{data.alamat || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Telepon</span><span className="font-semibold">{data.telepon || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-semibold">{data.email || '—'}</span></div>
          </div>
        </Card>

        <Card icon={Briefcase} title="Data Kepegawaian" onEdit={openEditModal}>
          <div className="p-4 space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status</span>
              <span className={`text-sm px-2 py-0.5 rounded border font-heading font-bold ${STATUS_CLS[data.statusPegawai] || 'bg-gray-100 border-gray-600 text-gray-600'}`}>
                {STATUS_LABEL[data.statusPegawai] || data.statusPegawai || '—'}
              </span>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Jabatan</span><span className="font-semibold">{JABATAN_LABEL[data.jabatan] || data.jabatan || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tanggal Masuk</span><span className="font-semibold">{data.tanggalMasuk || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tanggal Keluar</span><span className="font-semibold">{data.tanggalKeluar || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pendidikan</span><span className="font-semibold">{data.pendidikanTerakhir || '—'}{data.jurusan ? ` (${data.jurusan})` : ''}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Unit</span><span className="font-semibold">{data.unit?.nama || 'Yayasan'}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status</span>
              <span className={`text-sm px-2 py-0.5 rounded-full border font-heading font-bold ${data.aktif ? 'bg-emerald-100 border-emerald-800 text-emerald-800' : 'bg-amber-100 border-amber-800 text-amber-800'}`}>
                {data.aktif ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
          </div>
        </Card>

        <Card icon={DollarSign} title="Data Penggajian" onEdit={openEditModal}>
          <div className="p-4 space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Gaji Pokok</span><span className="font-heading font-bold">{data.gajiPokok ? `Rp${rp(data.gajiPokok)}` : '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span className="font-semibold">{data.bank || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">No. Rekening</span><span className="font-semibold">{data.nomorRekening || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">NPWP</span><span className="font-semibold">{data.npwp || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status Pajak</span><span className="font-semibold">{data.statusPajak || '—'}</span></div>
          </div>
          <div className="border-t-2 border-nb-ink p-3 bg-secondary/50">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div><p className="text-[11px] font-heading font-bold text-muted-foreground uppercase">Total Terima</p><p className="font-heading font-bold text-emerald-700">{rp(totalPenerimaan)}</p></div>
              <div><p className="text-[11px] font-heading font-bold text-muted-foreground uppercase">Total Diterima</p><p className="font-heading font-bold text-emerald-700">{rp(totalDiterima)}</p></div>
              <div><p className="text-[11px] font-heading font-bold text-muted-foreground uppercase">Total Potongan</p><p className="font-heading font-bold text-rose-700">{rp(totalPotongan)}</p></div>
              <div><p className="text-[11px] font-heading font-bold text-muted-foreground uppercase">PPh 21</p><p className="font-heading font-bold text-rose-700">{rp(totalPph21)}</p></div>
            </div>
          </div>
        </Card>
      </div>

      {/* Mapel Assignments */}
      {data.mapelAssignments?.length > 0 && (
        <div className="bg-card border-2 border-nb-ink rounded-lg">
          <div className="bg-secondary p-3 border-b-2 border-nb-ink flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <h3 className="font-heading font-bold text-sm uppercase">Mata Pelajaran</h3>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {data.mapelAssignments.map((ma: any) => (
              <span key={ma.id} className="inline-flex items-center gap-1 bg-indigo-100 border border-indigo-800 text-indigo-800 px-2 py-1 rounded text-sm font-heading font-semibold">
                {ma.mataPelajaran?.nama}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Payroll History */}
      <div className="nb-table-wrapper bg-card">
        <div className="bg-secondary px-4 py-3 border-b-2 border-nb-ink flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <h3 className="font-heading font-bold text-sm uppercase">Riwayat Penggajian</h3>
        </div>
        {data.penggajian?.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
            <h3 className="font-heading font-bold text-sm">Belum Ada Riwayat Gaji</h3>
            <p className="text-sm text-muted-foreground mt-1">Pegawai ini belum memiliki data penggajian.</p>
          </div>
        ) : (
          <table className="nb-table">
            <thead>
              <tr>
                <th>Periode</th>
                <th>Status</th>
                <th className="text-right">Gaji Pokok</th>
                <th className="text-right">Penerimaan</th>
                <th className="text-right">Potongan</th>
                <th className="text-right">PPh 21</th>
                <th className="text-right">BPJS</th>
                <th className="text-right">Diterima</th>
                <th className="w-[80px] text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.penggajian.map((g: any) => (
                <tr key={g.id} className={g.status !== 'dibayar' ? 'opacity-60' : ''}>
                  <td className="font-heading font-bold text-sm">{g.periode}</td>
                  <td>
                    <span className={`text-sm px-1.5 py-0.5 rounded font-heading font-bold border ${
                      g.status === 'dibayar' ? 'bg-emerald-100 border-emerald-800 text-emerald-800' :
                      g.status === 'disetujui' ? 'bg-blue-100 border-blue-800 text-blue-800' :
                      'bg-gray-100 border-gray-600 text-gray-600'
                    }`}>
                      {g.status}
                    </span>
                  </td>
                  <td className="text-right text-sm">{rp(g.gajiPokok)}</td>
                  <td className="text-right text-sm">{rp(g.totalPenerimaan)}</td>
                  <td className="text-right text-sm text-rose-700">{rp(g.totalPotongan)}</td>
                  <td className="text-right text-sm text-rose-600">{rp(g.pph21 || 0)}</td>
                  <td className="text-right text-sm">{rp(g.bpjsKaryawan)}</td>
                  <td className="text-right text-sm font-heading font-bold">{rp(g.totalDiterima)}</td>
                  <td className="text-center">
                    <button onClick={() => setSlipModal(g)}
                      className="p-1.5 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"
                      title="Lihat Slip Gaji">
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Slip Gaji Modal */}
      {slipModal && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-3xl flex flex-col max-h-[90dvh]">
            <div className="p-3 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Slip Gaji — {slipModal.periode}</h3>
              <button onClick={() => setSlipModal(null)} className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto bg-gray-100">
              <Suspense fallback={
                <div className="p-20 text-center text-sm text-muted-foreground animate-pulse">Memuat slip gaji...</div>
              }>
                <PDFViewer width="100%" height="700">
                  <SlipGajiPDF
                    penggajian={{
                      pegawai: {
                        nama: data.nama || '',
                        nip: data.nip || undefined,
                        jabatan: data.jabatan || undefined,
                        bank: data.bank || undefined,
                        nomorRekening: data.nomorRekening || undefined,
                      },
                      periode: slipModal.periode,
                      unit: { nama: data.unit?.nama || '' },
                    }}
                    details={slipModal.details?.map((d: any) => ({
                      tipe: d.tipe as 'penerimaan' | 'potongan',
                      nama: d.nama,
                      jumlah: d.jumlah,
                    })) || []}
                    totalPenerimaan={slipModal.totalPenerimaan}
                    totalPotongan={slipModal.totalPotongan}
                    totalDiterima={slipModal.totalDiterima}
                    pph21={slipModal.pph21 || 0}
                    bpjsKaryawan={slipModal.bpjsKaryawan}
                    yayasanNama={data.unit?.nama || undefined}
                  />
                </PDFViewer>
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-2xl flex flex-col max-h-[90dvh]">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Edit Pegawai</h3>
              <button onClick={() => setEditModal(false)} className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-4 md:p-6 space-y-4 overflow-y-auto">
              {editFormError && <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{editFormError}</span></div>}

              <div className="bg-secondary/50 -mx-4 md:-mx-6 px-4 md:px-6 py-2 border-y-2 border-nb-ink">
                <p className="text-[11px] font-heading font-bold uppercase text-muted-foreground flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Data Pribadi</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-heading font-bold mb-1 uppercase">Nama *</label><input type="text" required value={editForm.nama} onChange={(e) => setEditForm({...editForm, nama: e.target.value})} className="nb-input text-sm" /></div>
                <div><label className="block text-[11px] font-heading font-bold mb-1 uppercase">NIP</label><input type="text" value={editForm.nip} onChange={(e) => setEditForm({...editForm, nip: e.target.value})} className="nb-input text-sm" /></div>
                <div>
                  <label className="block text-[11px] font-heading font-bold mb-1 uppercase">Jenis Kelamin</label>
                  <select value={editForm.jenisKelamin} onChange={(e) => setEditForm({...editForm, jenisKelamin: e.target.value})} className="nb-input text-sm">
                    <option value="L">Laki-laki</option><option value="P">Perempuan</option>
                  </select>
                </div>
                <div><label className="block text-[11px] font-heading font-bold mb-1 uppercase">Tempat Lahir</label><input type="text" value={editForm.tempatLahir} onChange={(e) => setEditForm({...editForm, tempatLahir: e.target.value})} className="nb-input text-sm" /></div>
                <div><label className="block text-[11px] font-heading font-bold mb-1 uppercase">Tanggal Lahir</label><input type="date" value={editForm.tanggalLahir} onChange={(e) => setEditForm({...editForm, tanggalLahir: e.target.value})} className="nb-input text-sm" /></div>
                <div className="sm:col-span-2"><label className="block text-[11px] font-heading font-bold mb-1 uppercase">Alamat</label><textarea value={editForm.alamat} onChange={(e) => setEditForm({...editForm, alamat: e.target.value})} className="nb-input text-sm" rows={2} /></div>
                <div><label className="block text-[11px] font-heading font-bold mb-1 uppercase">Telepon</label><input type="text" value={editForm.telepon} onChange={(e) => setEditForm({...editForm, telepon: e.target.value})} className="nb-input text-sm" /></div>
                <div><label className="block text-[11px] font-heading font-bold mb-1 uppercase">Email</label><input type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="nb-input text-sm" /></div>
              </div>

              <div className="bg-secondary/50 -mx-4 md:-mx-6 px-4 md:px-6 py-2 border-y-2 border-nb-ink">
                <p className="text-[11px] font-heading font-bold uppercase text-muted-foreground flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Data Kepegawaian</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-heading font-bold mb-1 uppercase">Status</label>
                  <Combobox options={STATUS_PEGAWAI_OPTIONS} value={editForm.statusPegawai} onValueChange={(v) => setEditForm({...editForm, statusPegawai: v})}
                    triggerClassName="nb-input text-sm" className="w-full" placeholder="Pilih..." />
                </div>
                <div>
                  <label className="block text-[11px] font-heading font-bold mb-1 uppercase">Jabatan</label>
                  <Combobox options={JABATAN_OPTIONS} value={editForm.jabatan} onValueChange={(v) => setEditForm({...editForm, jabatan: v})}
                    triggerClassName="nb-input text-sm" className="w-full" placeholder="Pilih..." />
                </div>
                <div><label className="block text-[11px] font-heading font-bold mb-1 uppercase">Tanggal Masuk</label><input type="date" value={editForm.tanggalMasuk} onChange={(e) => setEditForm({...editForm, tanggalMasuk: e.target.value})} className="nb-input text-sm" /></div>
                <div><label className="block text-[11px] font-heading font-bold mb-1 uppercase">Tanggal Keluar</label><input type="date" value={editForm.tanggalKeluar} onChange={(e) => setEditForm({...editForm, tanggalKeluar: e.target.value})} className="nb-input text-sm" /></div>
                <div><label className="block text-[11px] font-heading font-bold mb-1 uppercase">Pendidikan Terakhir</label>
                  <select value={editForm.pendidikanTerakhir} onChange={(e) => setEditForm({...editForm, pendidikanTerakhir: e.target.value})} className="nb-input text-sm">
                    <option value="">—</option><option value="SD">SD</option><option value="SMP">SMP</option><option value="SMA">SMA/SMK</option>
                    <option value="D3">D3</option><option value="S1">S1</option><option value="S2">S2</option><option value="S3">S3</option>
                  </select>
                </div>
                <div><label className="block text-[11px] font-heading font-bold mb-1 uppercase">Jurusan</label><input type="text" value={editForm.jurusan} onChange={(e) => setEditForm({...editForm, jurusan: e.target.value})} className="nb-input text-sm" /></div>
              </div>

              <div className="bg-secondary/50 -mx-4 md:-mx-6 px-4 md:px-6 py-2 border-y-2 border-nb-ink">
                <p className="text-[11px] font-heading font-bold uppercase text-muted-foreground flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Data Penggajian</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-heading font-bold mb-1 uppercase">Gaji Pokok</label><input type="number" value={editForm.gajiPokok} onChange={(e) => setEditForm({...editForm, gajiPokok: parseInt(e.target.value) || 0})} className="nb-input text-sm" /></div>
                <div><label className="block text-[11px] font-heading font-bold mb-1 uppercase">Bank</label><input type="text" value={editForm.bank} onChange={(e) => setEditForm({...editForm, bank: e.target.value})} className="nb-input text-sm" placeholder="BSI" /></div>
                <div><label className="block text-[11px] font-heading font-bold mb-1 uppercase">No. Rekening</label><input type="text" value={editForm.nomorRekening} onChange={(e) => setEditForm({...editForm, nomorRekening: e.target.value})} className="nb-input text-sm" /></div>
                <div><label className="block text-[11px] font-heading font-bold mb-1 uppercase">Status Pajak</label><input type="text" value={editForm.statusPajak} onChange={(e) => setEditForm({...editForm, statusPajak: e.target.value})} className="nb-input text-sm" placeholder="K/3" /></div>
              </div>

              <div className="border-t-2 border-nb-ink pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setEditModal(false)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center text-sm" disabled={editLoading}>Batal</button>
                <button type="submit" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center text-sm" disabled={editLoading}>{editLoading ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function SlipGajiPDF({ penggajian, details, totalPenerimaan, totalPotongan, totalDiterima, pph21, bpjsKaryawan, yayasanNama }: any) {
  const { Document, Page, Text, View, StyleSheet } = require('@react-pdf/renderer')
  const styles = StyleSheet.create({
    page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica' },
    header: { marginBottom: 20, borderBottomWidth: 2, paddingBottom: 10 },
    title: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
    subtitle: { fontSize: 9, color: '#666', textAlign: 'center', marginTop: 4 },
    section: { marginBottom: 12 },
    sectionTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 6, backgroundColor: '#f3f4f6', padding: '4 8' },
    row: { flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
    label: { width: '50%', color: '#666' },
    value: { width: '50%', textAlign: 'right', fontWeight: 'bold' },
    table: { marginTop: 8 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', paddingVertical: 4, paddingHorizontal: 4, fontWeight: 'bold', fontSize: 9 },
    tableRow: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb', fontSize: 9 },
    col1: { width: '60%' },
    col2: { width: '40%', textAlign: 'right' },
    total: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4, fontWeight: 'bold', borderTopWidth: 1, marginTop: 4 },
    footer: { marginTop: 30, fontSize: 8, color: '#999', textAlign: 'center' },
  })
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{yayasanNama || 'YAYASAN'}</Text>
          <Text style={styles.subtitle}>SLIP GAJI — Periode {penggajian.periode}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Pegawai</Text>
          <View style={styles.row}><Text style={styles.label}>Nama</Text><Text style={styles.value}>{penggajian.pegawai.nama}</Text></View>
          {penggajian.pegawai.nip && <View style={styles.row}><Text style={styles.label}>NIP</Text><Text style={styles.value}>{penggajian.pegawai.nip}</Text></View>}
          {penggajian.pegawai.jabatan && <View style={styles.row}><Text style={styles.label}>Jabatan</Text><Text style={styles.value}>{penggajian.pegawai.jabatan}</Text></View>}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rincian</Text>
          {details.filter((d: any) => d.tipe === 'penerimaan').length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { backgroundColor: '#d1fae5', color: '#065f46' }]}>PENERIMAAN</Text>
              {details.filter((d: any) => d.tipe === 'penerimaan').map((d: any, i: number) => (
                <View key={i} style={styles.tableRow}><Text style={styles.col1}>{d.nama}</Text><Text style={styles.col2}>{rp(d.jumlah)}</Text></View>
              ))}
            </>
          )}
          {details.filter((d: any) => d.tipe === 'potongan').length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { backgroundColor: '#fee2e2', color: '#991b1b', marginTop: 8 }]}>POTONGAN</Text>
              {details.filter((d: any) => d.tipe === 'potongan').map((d: any, i: number) => (
                <View key={i} style={styles.tableRow}><Text style={styles.col1}>{d.nama}</Text><Text style={styles.col2}>({rp(d.jumlah)})</Text></View>
              ))}
            </>
          )}
          <View style={styles.total}>
            <Text style={styles.col1}>Total Penerimaan</Text><Text style={styles.col2}>{rp(totalPenerimaan)}</Text>
          </View>
          <View style={styles.total}>
            <Text style={styles.col1}>Total Potongan</Text><Text style={styles.col2}>({rp(totalPotongan)})</Text>
          </View>
          {pph21 > 0 && <View style={styles.total}><Text style={styles.col1}>PPh 21</Text><Text style={styles.col2}>({rp(pph21)})</Text></View>}
          {bpjsKaryawan > 0 && <View style={styles.total}><Text style={styles.col1}>BPJS Karyawan</Text><Text style={styles.col2}>({rp(bpjsKaryawan)})</Text></View>}
          <View style={[styles.total, { borderTopWidth: 2, marginTop: 8 }]}>
            <Text style={styles.col1}>TOTAL DITERIMA</Text><Text style={[styles.col2, { fontSize: 12 }]}>{rp(totalDiterima)}</Text>
          </View>
        </View>
        <Text style={styles.footer}>Dokumen ini dibuat secara otomatis oleh sistem.</Text>
      </Page>
    </Document>
  )
}
