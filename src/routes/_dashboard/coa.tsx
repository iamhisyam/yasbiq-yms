import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { getCoaList, createCoa, updateCoa, seedCoaAndKategori } from '#/server/keuangan'
import { useState, useEffect } from 'react'
import { BookOpen, AlertCircle, Pencil, Plus, Save, X, Database } from 'lucide-react'

export const Route = createFileRoute('/_dashboard/coa')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'super_admin' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: CoaPage,
})

const TYPE_LABELS: Record<string, string> = {
  aset_lancar: 'Aset Lancar',
  aset_tetap: 'Aset Tetap',
  liabilitas: 'Liabilitas',
  aset_neto: 'Aset Neto',
  pendapatan: 'Pendapatan',
  beban: 'Beban',
}

const TYPE_COLORS: Record<string, string> = {
  aset_lancar: 'bg-emerald-100 text-emerald-800 border-emerald-800',
  aset_tetap: 'bg-blue-100 text-blue-800 border-blue-800',
  liabilitas: 'bg-rose-100 text-rose-800 border-rose-800',
  aset_neto: 'bg-purple-100 text-purple-800 border-purple-800',
  pendapatan: 'bg-cyan-100 text-cyan-800 border-cyan-800',
  beban: 'bg-amber-100 text-amber-800 border-amber-800',
}

const TYPE_ORDER = ['aset_lancar', 'aset_tetap', 'liabilitas', 'aset_neto', 'pendapatan', 'beban']
const TYPE_OPTIONS = TYPE_ORDER.map((t) => ({ value: t, label: TYPE_LABELS[t] }))

const DEFAULT_FORM = {
  kode: '',
  nama: '',
  tipe: 'aset_lancar' as string,
  subTipe: '',
  saldoNormal: 'debit',
  level: 1,
  urutan: 0,
  keterangan: '',
}

function CoaPage() {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<{ item?: any } | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')

  const fetchData = () => {
    setLoading(true); setError('')
    getCoaList().then(setList).catch((err) => setError(err.message)).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const openCreate = () => {
    setForm(DEFAULT_FORM)
    setModal({})
    setModalError('')
  }

  const openEdit = (item: any) => {
    setForm({
      kode: item.kode,
      nama: item.nama,
      tipe: item.tipe,
      subTipe: item.subTipe || '',
      saldoNormal: item.saldoNormal,
      level: item.level,
      urutan: item.urutan,
      keterangan: item.keterangan || '',
    })
    setModal({ item })
    setModalError('')
  }

  const closeModal = () => {
    setModal(null)
    setModalError('')
  }

  const handleSave = async () => {
    setSaving(true); setModalError('')
    try {
      if (modal?.item) {
        const upd: any = { id: modal.item.id }
        for (const [k, v] of Object.entries(form)) {
          if (v !== DEFAULT_FORM[k as keyof typeof DEFAULT_FORM]) upd[k] = v
        }
        if (Object.keys(upd).length > 1) {
          await updateCoa({ data: upd })
        }
      } else {
        await createCoa({ data: form as any })
      }
      closeModal()
      fetchData()
    } catch (err: any) {
      setModalError(err.message)
    } finally { setSaving(false) }
  }

  const handleSeed = async () => {
    try {
      await seedCoaAndKategori({ data: {} })
      fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const grouped = TYPE_ORDER
    .map((t) => ({ tipe: t, items: list.filter((c) => c.tipe === t) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="space-y-6">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">Chart of Accounts</h2>
          <p className="text-sm text-muted-foreground mt-1">Daftar Akun Standar ISAK 35 — Entitas Non-Laba.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSeed} className="nb-btn nb-btn-secondary cursor-pointer text-sm">
            <Database className="w-4 h-4" /> Seed Default
          </button>
          <button onClick={openCreate} className="nb-btn nb-btn-primary cursor-pointer">
            <Plus className="w-4 h-4" /> Tambah Akun
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 bg-muted animate-pulse border-2 border-nb-ink rounded" />
      ) : list.length === 0 ? (
        <div className="text-center py-12 bg-card border-2 border-nb-ink rounded">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-heading font-bold text-muted-foreground">Belum Ada Chart of Accounts</p>
          <p className="text-sm text-muted-foreground mt-1">Klik "Seed Default" untuk generate akun ISAK 35 standar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.tipe} className="bg-card border-2 border-nb-ink rounded">
              <div className="p-3 border-b-2 border-nb-ink bg-secondary/30">
                <span className={`text-sm px-2 py-0.5 rounded font-heading font-bold border ${TYPE_COLORS[group.tipe] || ''}`}>
                  {TYPE_LABELS[group.tipe] || group.tipe}
                </span>
                <span className="text-sm text-muted-foreground ml-2">{group.items.length} akun</span>
              </div>
              <div className="overflow-x-auto">
                <table className="nb-table">
                  <thead>
                    <tr>
                      <th className="w-16">Kode</th>
                      <th>Nama Akun</th>
                      <th className="w-28 text-center">Saldo Normal</th>
                      <th className="w-12 text-center">Level</th>
                      <th className="w-20 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((c) => (
                      <tr key={c.id}>
                        <td className="text-sm font-mono font-bold">{c.kode}</td>
                        <td className="text-sm font-heading font-semibold">{c.nama}</td>
                        <td className="text-center">
                          <span className={`text-sm font-heading font-bold ${c.saldoNormal === 'debit' ? 'text-blue-700' : 'text-rose-700'}`}>
                            {c.saldoNormal === 'debit' ? 'Debit' : 'Kredit'}
                          </span>
                        </td>
                        <td className="text-center text-sm text-muted-foreground">{c.level}</td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEdit(c)} className="p-1 hover:bg-secondary/40 rounded cursor-pointer" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]" onClick={closeModal}>
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-lg md:mx-4 shadow-lg max-h-[90dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0 rounded-t-lg">
              <h3 className="font-heading font-bold text-sm">{modal?.item ? 'Edit Akun' : 'Tambah Akun'}</h3>
              <button onClick={closeModal} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-4 overflow-y-auto">
              {modalError && (
                <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />{modalError}
                </div>
              )}

              <div>
                <label className="block text-sm font-heading font-bold mb-0.5 uppercase tracking-wider">Kode</label>
                <input value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })} className="nb-input text-sm" placeholder="Contoh: 4.1.01" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-0.5 uppercase tracking-wider">Nama Akun</label>
                <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="nb-input text-sm" placeholder="Nama akun" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-0.5 uppercase tracking-wider">Tipe</label>
                <select value={form.tipe} onChange={(e) => setForm({ ...form, tipe: e.target.value })} className="nb-input text-sm">
                  {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-heading font-bold mb-0.5 uppercase tracking-wider">Saldo Normal</label>
                  <select value={form.saldoNormal} onChange={(e) => setForm({ ...form, saldoNormal: e.target.value })} className="nb-input text-sm">
                    <option value="debit">Debit</option>
                    <option value="kredit">Kredit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-0.5 uppercase tracking-wider">Level</label>
                  <input type="number" value={form.level} onChange={(e) => setForm({ ...form, level: Number(e.target.value) || 1 })} className="nb-input text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-heading font-bold mb-0.5 uppercase tracking-wider">Sub Tipe</label>
                  <input value={form.subTipe} onChange={(e) => setForm({ ...form, subTipe: e.target.value })} className="nb-input text-sm" placeholder="opsional" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-0.5 uppercase tracking-wider">Urutan</label>
                  <input type="number" value={form.urutan} onChange={(e) => setForm({ ...form, urutan: Number(e.target.value) || 0 })} className="nb-input text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-0.5 uppercase tracking-wider">Keterangan</label>
                <textarea value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} className="nb-input text-sm" rows={2} placeholder="opsional" />
              </div>
            </div>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-3 bg-card rounded-b-lg">
              <button onClick={closeModal} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center text-sm">Batal</button>
              <button onClick={handleSave} disabled={saving} className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center text-sm">
                <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}