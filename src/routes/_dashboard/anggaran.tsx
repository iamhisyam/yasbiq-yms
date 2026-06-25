import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { useUnit } from '#/lib/unit-context'
import {
  getAnggaranList, createAnggaran, updateAnggaran, deleteAnggaran,
} from '#/server/keuangan'
import { useState, useEffect } from 'react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { Combobox } from '#/components/ui/combobox'
import {
  Plus, Pencil, Trash2, X, AlertCircle, Wallet, TrendingUp, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'

export const Route = createFileRoute('/_dashboard/anggaran')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'admin_yayasan' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: AnggaranPage,
})

function rp(n: number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n) }

const STATUS_CLS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 border-gray-600',
  aktif: 'bg-emerald-100 text-emerald-800 border-emerald-800',
  selesai: 'bg-blue-100 text-blue-800 border-blue-800',
  dibatalkan: 'bg-rose-100 text-rose-800 border-rose-800',
}

function AnggaranPage() {
  const { activeUnit, yayasanFilterUnitId, units } = useUnit()
  const [formUnitId, setFormUnitId] = useState('')

  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTipe, setFilterTipe] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState({ nama: '', tipe: 'pengeluaran' as 'pemasukan' | 'pengeluaran', total: 0, periode: '', status: 'draft', keterangan: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const fetchData = () => {
    setLoading(true)
    getAnggaranList({ data: { unitId: yayasanFilterUnitId, tipe: filterTipe || undefined, status: filterStatus || undefined } })
      .then(setList).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [yayasanFilterUnitId, filterTipe, filterStatus])

  const openModal = (item: any | null) => {
    setEditItem(item); setError('')
    setFormUnitId(item ? item.unitId || '' : yayasanFilterUnitId === 'all' ? '' : yayasanFilterUnitId)
    setForm(item ? {
      nama: item.nama, tipe: item.tipe, total: item.total,
      periode: item.periode, status: item.status, keterangan: item.keterangan || '',
    } : { nama: '', tipe: 'pengeluaran', total: 0, periode: '', status: 'draft', keterangan: '' })
    setModal(true)
  }

  const handleSubmit = async () => {
    if (!form.nama.trim()) { setError('Nama wajib diisi'); return }
    if (form.total <= 0) { setError('Total harus positif'); return }
    if (!form.periode.trim()) { setError('Periode wajib diisi'); return }
    setSaving(true); setError('')
    try {
      const data = { ...form, keterangan: form.keterangan || undefined, tipe: form.tipe as any, status: (editItem ? form.status : 'draft') as any }
      if (editItem) {
        const r = await updateAnggaran({ data: { id: editItem.id, unitId: formUnitId || undefined, ...data } })
        setList((prev) => prev.map((a) => a.id === r.id ? r : a))
      } else {
        const unitId = formUnitId || (yayasanFilterUnitId === 'all' ? (activeUnit?.id || units[0]?.id || '') : yayasanFilterUnitId)
        if (!unitId) { setError('Pilih unit'); setSaving(false); return }
        const r = await createAnggaran({ data: { unitId, ...data } })
        setList((prev) => [r, ...prev])
      }
      setModal(false)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  const totalAnggaran = list.reduce((s, a) => s + a.total, 0)
  const totalTerpakai = list.reduce((s, a) => s + a.terpakai, 0)
  const totalSisa = totalAnggaran - totalTerpakai
  const pct = (a: number, b: number) => a > 0 ? Math.round(b / a * 100) : 0

  return (
    <div className="space-y-6">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">Anggaran</h2>
          <p className="text-sm text-muted-foreground mt-1">Rencana anggaran pemasukan dan pengeluaran. Setiap transaksi yang terkait akan otomatis mengurangi anggaran terpakai.</p>
        </div>
        <button onClick={() => openModal(null)} className="nb-btn nb-btn-primary cursor-pointer shrink-0">
          <Plus className="w-4 h-4" /> Tambah Anggaran
        </button>
      </div>

      {/* Summary */}
      {list.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card border-2 border-nb-ink rounded p-3">
            <div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Total Anggaran</span></div>
            <p className="text-lg font-heading font-bold mt-0.5">{rp(totalAnggaran)}</p>
          </div>
          <div className="bg-card border-2 border-nb-ink rounded p-3">
            <div className="flex items-center gap-2 mb-1"><ArrowDownRight className="w-4 h-4 text-rose-600" /><span className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Terpakai</span></div>
            <p className="text-lg font-heading font-bold mt-0.5 text-rose-700">{rp(totalTerpakai)}</p>
          </div>
          <div className="bg-card border-2 border-nb-ink rounded p-3">
            <div className="flex items-center gap-2 mb-1"><ArrowUpRight className="w-4 h-4 text-emerald-600" /><span className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Sisa</span></div>
            <p className="text-lg font-heading font-bold mt-0.5 text-emerald-700">{rp(totalSisa)}</p>
          </div>
          <div className="bg-card border-2 border-nb-ink rounded p-3">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-blue-600" /><span className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Realisasi</span></div>
            <p className="text-lg font-heading font-bold mt-0.5 text-blue-700">{pct(totalAnggaran, totalTerpakai)}%</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Combobox
          options={[{ value: '', label: 'Semua Tipe' }, { value: 'pemasukan', label: 'Pemasukan' }, { value: 'pengeluaran', label: 'Pengeluaran' }]}
          value={filterTipe}
          onValueChange={setFilterTipe}
          triggerClassName="nb-input text-sm"
          className="w-full"
          placeholder="Semua Tipe"
          searchPlaceholder="Cari..."
          emptyMessage="Tidak ada data"
        />
        <Combobox
          options={[{ value: '', label: 'Semua Status' }, { value: 'draft', label: 'Draft' }, { value: 'aktif', label: 'Aktif' }, { value: 'selesai', label: 'Selesai' }, { value: 'dibatalkan', label: 'Dibatalkan' }]}
          value={filterStatus}
          onValueChange={setFilterStatus}
          triggerClassName="nb-input text-sm"
          className="w-full"
          placeholder="Semua Status"
          searchPlaceholder="Cari..."
          emptyMessage="Tidak ada data"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="h-40 bg-muted animate-pulse border-2 border-nb-ink rounded" />
      ) : list.length === 0 ? (
        <div className="text-center py-12 bg-card border-2 border-nb-ink rounded">
          <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-heading font-bold text-muted-foreground">Belum Ada Anggaran</p>
          <p className="text-sm text-muted-foreground mt-1">Buat rencana anggaran untuk melacak pemasukan dan pengeluaran.</p>
        </div>
      ) : (
        <div className="nb-table-wrapper bg-card">
          <table className="nb-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Unit</th>
                <th>Tipe</th>
                <th>Periode</th>
                <th className="text-right">Anggaran</th>
                <th className="text-right">Terpakai</th>
                <th className="text-right">Sisa</th>
                <th className="text-center">Progres</th>
                <th>Status</th>
                <th className="w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => {
                const sisa = a.total - a.terpakai
                const persen = pct(a.total, a.terpakai)
                return (
                  <tr key={a.id}>
                    <td className="font-heading font-bold text-sm">{a.nama}</td>
                    <td className="text-sm">{a.unit?.nama || '-'}</td>
                    <td>
                      <span className={`text-sm px-2 py-0.5 rounded border font-heading font-bold ${a.tipe === 'pemasukan' ? 'bg-emerald-100 text-emerald-800 border-emerald-800' : 'bg-rose-100 text-rose-800 border-rose-800'}`}>
                        {a.tipe}
                      </span>
                    </td>
                    <td className="text-sm">{a.periode}</td>
                    <td className="text-right text-sm">{rp(a.total)}</td>
                    <td className="text-right text-sm text-rose-700">{rp(a.terpakai)}</td>
                    <td className="text-right text-sm font-heading font-bold">{rp(sisa)}</td>
                    <td className="text-center">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden border border-nb-ink/30">
                          <div className={`h-full rounded-full ${persen >= 100 ? 'bg-emerald-500' : persen >= 75 ? 'bg-blue-500' : persen >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(persen, 100)}%` }} />
                        </div>
                        <span className="text-sm font-heading font-bold w-8 text-right">{persen}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`text-sm px-2 py-0.5 rounded border font-heading font-bold ${STATUS_CLS[a.status] || ''}`}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openModal(a)} className="p-1.5 hover:bg-muted-foreground/10 rounded cursor-pointer"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setConfirmDelete({ message: `Hapus anggaran "${a.nama}"?`, onConfirm: async () => { await deleteAnggaran({ data: { id: a.id } }); setConfirmDelete(null); fetchData() } })} className="p-1.5 hover:bg-rose-100 rounded cursor-pointer"><Trash2 className="w-4 h-4 text-rose-600" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-md">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">{editItem ? 'Edit' : 'Tambah'} Anggaran</h3>
              <button onClick={() => setModal(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {error && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

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
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama Anggaran</label>
                <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="nb-input" placeholder="e.g. Operasional Semester 1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tipe</label>
                  <Combobox
                    options={[{ value: 'pemasukan', label: 'Pemasukan' }, { value: 'pengeluaran', label: 'Pengeluaran' }]}
                    value={form.tipe}
                    onValueChange={(v) => setForm({ ...form, tipe: v as any })}
                    triggerClassName="nb-input text-sm"
                    className="w-full"
                    placeholder="Pilih Tipe"
                    searchPlaceholder="Cari..."
                    emptyMessage="Tidak ada data"
                  />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Total (Rp)</label>
                  <input type="number" min={0} value={form.total || ''} onChange={(e) => setForm({ ...form, total: Number(e.target.value) || 0 })} className="nb-input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Periode</label>
                  <input value={form.periode} onChange={(e) => setForm({ ...form, periode: e.target.value })} className="nb-input" placeholder="e.g. 2025, Jan-2025, 2025/2026" />
                </div>
                {editItem && (
                  <div>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Status</label>
                    <Combobox
                      options={[{ value: 'draft', label: 'Draft' }, { value: 'aktif', label: 'Aktif' }, { value: 'selesai', label: 'Selesai' }, { value: 'dibatalkan', label: 'Dibatalkan' }]}
                      value={form.status}
                      onValueChange={(v) => setForm({ ...form, status: v })}
                      triggerClassName="nb-input text-sm"
                      className="w-full"
                      placeholder="Pilih Status"
                      searchPlaceholder="Cari..."
                      emptyMessage="Tidak ada data"
                    />
                  </div>
                )}
              </div>
              {editItem && (
                <div className="bg-secondary/20 border-2 border-nb-ink rounded p-2 text-sm space-y-1">
                  <p>Terpakai: <span className="font-heading font-bold text-rose-700">{rp(editItem.terpakai)}</span></p>
                  <p>Sisa: <span className="font-heading font-bold">{rp(editItem.total - editItem.terpakai)}</span></p>
                </div>
              )}
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