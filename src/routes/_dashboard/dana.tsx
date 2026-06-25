import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { useUnit } from '#/lib/unit-context'
import { getDanaList, createDana, updateDana, deleteDana, getRingkasanDana } from '#/server/dana'
import { useState, useEffect } from 'react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { Combobox } from '#/components/ui/combobox'
import {
  Plus, Pencil, Trash2, X, AlertCircle, HandHeart, Building2, Target,
} from 'lucide-react'

export const Route = createFileRoute('/_dashboard/dana')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'admin_yayasan' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: DanaPage,
})

function rp(n: number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n) }

const TIPE_LABEL: Record<string, string> = { donor: 'Donatur', investor: 'Investor', endowment: 'Dana Abadi', internal: 'Internal' }
const TIPE_COLOR: Record<string, string> = { donor: 'bg-purple-100 text-purple-800 border-purple-800', investor: 'bg-blue-100 text-blue-800 border-blue-800', endowment: 'bg-emerald-100 text-emerald-800 border-emerald-800', internal: 'bg-gray-100 text-gray-800 border-gray-800' }
const IKAT_LABEL: Record<string, string> = { tidak_terikat: 'Tidak Terikat', terikat_temporer: 'Terikat Temporer', terikat_permanen: 'Terikat Permanen' }
const IKAT_COLOR: Record<string, string> = { tidak_terikat: 'bg-amber-100 text-amber-800', terikat_temporer: 'bg-blue-100 text-blue-800', terikat_permanen: 'bg-emerald-100 text-emerald-800' }

function DanaPage() {
  const { activeUnit, yayasanFilterUnitId, units } = useUnit()

  const [list, setList] = useState<any[]>([])
  const [ringkasan, setRingkasan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filterTipe, setFilterTipe] = useState('')
  const [filterIkat, setFilterIkat] = useState('')

  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState({
    kode: '', nama: '', tipe: 'donor', sumber: '', npwp: '',
    jenisIkat: 'tidak_terikat', tujuan: '', targetNominal: 0,
    realisasi: 0, tanggalMulai: '', tanggalSelesai: '',
    status: 'aktif', keterangan: '',
  })
  const [formUnitId, setFormUnitId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      getDanaList({ data: { unitId: yayasanFilterUnitId, tipe: filterTipe || undefined, jenisIkat: filterIkat || undefined, pageSize: 100 } }),
      getRingkasanDana({ data: { unitId: yayasanFilterUnitId } }),
    ]).then(([d, r]) => { setList(d.data); setRingkasan(r) }).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [yayasanFilterUnitId, filterTipe, filterIkat])

  const openModal = (item: any | null) => {
    setEditItem(item); setError('')
    setFormUnitId(item ? '' : yayasanFilterUnitId === 'all' ? '' : yayasanFilterUnitId)
    setForm(item ? {
      kode: item.kode || '', nama: item.nama, tipe: item.tipe,
      sumber: item.sumber || '', npwp: item.npwp || '',
      jenisIkat: item.jenisIkat, tujuan: item.tujuan || '',
      targetNominal: item.targetNominal || 0, realisasi: item.realisasi || 0,
      tanggalMulai: item.tanggalMulai || '', tanggalSelesai: item.tanggalSelesai || '',
      status: item.status, keterangan: item.keterangan || '',
    } : {
      kode: '', nama: '', tipe: 'donor', sumber: '', npwp: '',
      jenisIkat: 'tidak_terikat', tujuan: '', targetNominal: 0,
      realisasi: 0, tanggalMulai: '', tanggalSelesai: '',
      status: 'aktif', keterangan: '',
    })
    setModal(true)
  }

  const handleSubmit = async () => {
    if (!form.nama.trim()) { setError('Nama wajib diisi'); return }
    if (!editItem && !formUnitId) { setError('Pilih unit terlebih dahulu'); return }
    setSaving(true); setError('')
    try {
      const data = { ...form, kode: form.kode || undefined, sumber: form.sumber || undefined, npwp: form.npwp || undefined, tujuan: form.tujuan || undefined, tanggalMulai: form.tanggalMulai || undefined, tanggalSelesai: form.tanggalSelesai || undefined, keterangan: form.keterangan || undefined, tipe: form.tipe as any, jenisIkat: form.jenisIkat as any, status: form.status as any }
      if (editItem) {
        const r = await updateDana({ data: { id: editItem.id, data } })
        setList((prev) => prev.map((a) => a.id === r.id ? r : a))
      } else {
        const r = await createDana({ data: { unitId: formUnitId, ...data } })
        setList((prev) => [r, ...prev])
      }
      setModal(false); fetchData()
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">Manajemen Dana</h2>
          <p className="text-sm text-muted-foreground mt-1">Kelola donasi, investasi sosial, dan dana abadi — klasifikasi ISAK 35 untuk Aset Neto dengan NPWP donatur untuk Coretax.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => openModal(null)} className="nb-btn nb-btn-primary cursor-pointer shrink-0">
          <Plus className="w-4 h-4" /> Tambah Dana
        </button>
      </div>

      {/* Ringkasan */}
      {ringkasan && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card border-2 border-nb-ink rounded p-3">
            <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Total Dana</p>
            <p className="text-lg font-heading font-bold mt-0.5">{ringkasan.totalDana > 0 ? rp(ringkasan.totalDana) : 'Rp0'}</p>
          </div>
          <div className="bg-card border-2 border-nb-ink rounded p-3">
            <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Tidak Terikat</p>
            <p className="text-lg font-heading font-bold mt-0.5 text-amber-700">{rp(ringkasan.tidakTerikat)}</p>
          </div>
          <div className="bg-card border-2 border-nb-ink rounded p-3">
            <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Terikat Temporer</p>
            <p className="text-lg font-heading font-bold mt-0.5 text-blue-700">{rp(ringkasan.terikatTemporer)}</p>
          </div>
          <div className="bg-card border-2 border-nb-ink rounded p-3">
            <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Terikat Permanen</p>
            <p className="text-lg font-heading font-bold mt-0.5 text-emerald-700">{rp(ringkasan.terikatPermanen)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Combobox
          options={[{ value: '', label: 'Semua Tipe' }, ...Object.entries(TIPE_LABEL).map(([k, v]) => ({ value: k, label: v }))]}
          value={filterTipe}
          onValueChange={setFilterTipe}
          triggerClassName="nb-input text-sm"
          className="w-full"
          placeholder="Semua Tipe"
          searchPlaceholder="Cari..."
          emptyMessage="Tidak ada data"
        />
        <Combobox
          options={[{ value: '', label: 'Semua Jenis Ikat' }, ...Object.entries(IKAT_LABEL).map(([k, v]) => ({ value: k, label: v }))]}
          value={filterIkat}
          onValueChange={setFilterIkat}
          triggerClassName="nb-input text-sm"
          className="w-full"
          placeholder="Semua Jenis Ikat"
          searchPlaceholder="Cari..."
          emptyMessage="Tidak ada data"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="h-40 bg-muted animate-pulse border-2 border-nb-ink rounded" />
      ) : list.length === 0 ? (
        <div className="text-center py-12 bg-card border-2 border-nb-ink rounded">
          <HandHeart className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-heading font-bold text-muted-foreground">Belum Ada Dana Tercatat</p>
          <p className="text-sm text-muted-foreground mt-1">Catat donasi, investasi sosial, atau dana abadi dengan klasifikasi ISAK 35.</p>
        </div>
      ) : (
        <div className="nb-table-wrapper bg-card">
          <table className="nb-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama</th>
                <th>Tipe</th>
                <th>Jenis Ikat</th>
                <th className="hidden md:table-cell">Sumber/NPWP</th>
                <th className="text-right">Target</th>
                <th className="text-right">Sisa</th>
                <th className="w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id}>
                  <td className="text-sm font-mono text-muted-foreground">{d.kode || '-'}</td>
                  <td className="font-heading font-bold text-sm">{d.nama}</td>
                  <td><span className={`text-sm px-2 py-0.5 rounded border font-heading font-bold ${TIPE_COLOR[d.tipe] || ''}`}>{TIPE_LABEL[d.tipe] || d.tipe}</span></td>
                  <td><span className={`text-sm px-2 py-0.5 rounded font-heading font-bold ${IKAT_COLOR[d.jenisIkat] || ''}`}>{IKAT_LABEL[d.jenisIkat] || d.jenisIkat}</span></td>
                  <td className="hidden md:table-cell text-sm">{d.sumber || '-'}{d.npwp ? ` (NPWP: ${d.npwp})` : ''}</td>
                  <td className="text-right text-sm">{rp(d.targetNominal)}</td>
                  <td className="text-right text-sm font-heading font-bold">{rp(d.targetNominal - d.realisasi)}</td>
                  <td>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openModal(d)} className="p-1.5 hover:bg-muted-foreground/10 rounded cursor-pointer"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setConfirmDelete({ message: `Hapus dana "${d.nama}"?`, onConfirm: async () => { await deleteDana({ data: { id: d.id } }); setConfirmDelete(null); fetchData() } })} className="p-1.5 hover:bg-rose-100 rounded cursor-pointer"><Trash2 className="w-4 h-4 text-rose-600" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah/Edit */}
      {modal && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-lg flex flex-col max-h-[90dvh]">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">{editItem ? 'Edit' : 'Tambah'} Dana</h3>
              <button onClick={() => setModal(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 flex-1 min-h-0 overflow-y-auto space-y-3">
              {error && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

              {!editItem && (
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Unit</label>
                  <Combobox
                    options={[{value: '', label: 'Pilih Unit...'}, ...units.map((u: any) => ({value: u.id, label: `${u.nama} (${u.jenjang})`}))]}
                    value={formUnitId}
                    onValueChange={setFormUnitId}
                    triggerClassName="nb-input"
                    className="w-full"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Kode</label>
                  <input value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })} className="nb-input" placeholder="e.g. D-001" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tipe</label>
                  <Combobox
                    options={Object.entries(TIPE_LABEL).map(([k, v]) => ({ value: k, label: v }))}
                    value={form.tipe}
                    onValueChange={(v) => setForm({ ...form, tipe: v })}
                    triggerClassName="nb-input text-sm"
                    className="w-full"
                    placeholder="Pilih Tipe"
                    searchPlaceholder="Cari..."
                    emptyMessage="Tidak ada data"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama Dana</label>
                <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="nb-input" placeholder="e.g. Bantuan CSR PT.ABC" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Sumber / Donatur</label>
                  <input value={form.sumber} onChange={(e) => setForm({ ...form, sumber: e.target.value })} className="nb-input" placeholder="Nama donatur" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">NPWP (Coretax)</label>
                  <input value={form.npwp} onChange={(e) => setForm({ ...form, npwp: e.target.value })} className="nb-input" placeholder="XX.XXX.XXX.X-XXX.XXX" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Jenis Ikatan (ISAK 35)</label>
                <Combobox
                  options={[{ value: 'tidak_terikat', label: 'Tidak Terikat — bisa digunakan bebas' }, { value: 'terikat_temporer', label: 'Terikat Temporer — untuk tujuan spesifik' }, { value: 'terikat_permanen', label: 'Terikat Permanen — dana abadi, tidak boleh berkurang' }]}
                  value={form.jenisIkat}
                  onValueChange={(v) => setForm({ ...form, jenisIkat: v })}
                  triggerClassName="nb-input text-sm"
                  className="w-full"
                  placeholder="Pilih Jenis Ikatan"
                  searchPlaceholder="Cari..."
                  emptyMessage="Tidak ada data"
                />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tujuan Penggunaan</label>
                <input value={form.tujuan} onChange={(e) => setForm({ ...form, tujuan: e.target.value })} className="nb-input" placeholder="e.g. Pembangunan gedung, beasiswa" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Target Nominal (Rp)</label>
                  <input type="number" min={0} value={form.targetNominal || ''} onChange={(e) => setForm({ ...form, targetNominal: Number(e.target.value) || 0 })} className="nb-input" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Realisasi (Rp)</label>
                  <input type="number" min={0} value={form.realisasi || ''} onChange={(e) => setForm({ ...form, realisasi: Number(e.target.value) || 0 })} className="nb-input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tanggal Mulai</label>
                  <input type="date" value={form.tanggalMulai} onChange={(e) => setForm({ ...form, tanggalMulai: e.target.value })} className="nb-input" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tanggal Selesai</label>
                  <input type="date" value={form.tanggalSelesai} onChange={(e) => setForm({ ...form, tanggalSelesai: e.target.value })} className="nb-input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Status</label>
                  <Combobox
                    options={[{ value: 'aktif', label: 'Aktif' }, { value: 'selesai', label: 'Selesai' }, { value: 'dibatalkan', label: 'Dibatalkan' }]}
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                    triggerClassName="nb-input text-sm"
                    className="w-full"
                    placeholder="Pilih Status"
                    searchPlaceholder="Cari..."
                    emptyMessage="Tidak ada data"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Keterangan</label>
                <textarea value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} className="nb-input" rows={2} />
              </div>
            </div>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex gap-3 justify-end bg-card rounded-b-lg">
              <button onClick={() => setModal(false)} className="nb-btn nb-btn-secondary cursor-pointer">Batal</button>
              <button onClick={handleSubmit} disabled={saving} className="nb-btn nb-btn-primary cursor-pointer">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => { confirmDelete?.onConfirm(); setConfirmDelete(null) }} title="Konfirmasi" message={confirmDelete?.message || ''} />
    </div>
  )
}
