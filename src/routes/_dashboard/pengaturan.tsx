import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { useUnit } from '#/lib/unit-context'
import { getUnitPengaturan, saveUnitPengaturan } from '#/server/pengaturan'
import { useState, useEffect } from 'react'
import { AlertCircle, Save, Settings, Pencil, X, Building2 } from 'lucide-react'
import { Combobox } from '#/components/ui/combobox'

export const Route = createFileRoute('/_dashboard/pengaturan')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'operator' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: PengaturanPage,
})

const SETTINGS_FIELDS = [
  { key: 'nama', label: 'Nama Unit', type: 'text' as const },
  { key: 'nomorUnit', label: 'Nomor Unit', type: 'text' as const },
  { key: 'alamat', label: 'Alamat', type: 'textarea' as const },
  { key: 'telepon', label: 'No. Telepon', type: 'text' as const },
  { key: 'email', label: 'Email', type: 'text' as const },
  { key: 'kepalaUnit', label: 'Ketua Unit', type: 'text' as const },
]

function PengaturanPage() {
  const { activeUnit, units } = useUnit()
  const [selectedUnitId, setSelectedUnitId] = useState<string>(activeUnit?.id || units[0]?.id || '')
  useEffect(() => {
    if (!selectedUnitId && units.length > 0) setSelectedUnitId(units[0].id)
  }, [units])
  const unitId = selectedUnitId

  const [form, setForm] = useState<Record<string, string>>({})
  const [original, setOriginal] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editField, setEditField] = useState<string | null>(null)

  const fetchData = () => {
    if (!unitId) return
    setLoading(true)
    getUnitPengaturan({ data: { unitId } })
      .then((map) => {
        const vals: Record<string, string> = {}
        for (const f of SETTINGS_FIELDS) vals[f.key] = map[f.key] || ''
        setForm(vals)
        setOriginal(vals)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (unitId) { setEditMode(false); setEditField(null); fetchData() } }, [unitId])

  const hasChanges = Object.keys(form).some((k) => form[k] !== original[k])

  const handleSave = async () => {
    if (!unitId) return
    setSaving(true); setError(''); setSuccess('')
    try {
      await saveUnitPengaturan({ data: { unitId, data: form } })
      setOriginal({ ...form })
      setEditMode(false); setEditField(null)
      setSuccess('Pengaturan unit berhasil disimpan')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  if (!unitId) return (
    <div className="nb-card max-w-md mx-auto text-center mt-12 bg-amber-50 border-2 border-amber-800">
      <Settings className="w-12 h-12 text-primary mx-auto mb-4" />
      <h2 className="font-heading font-bold text-lg mb-2">Tidak Ada Unit</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Belum ada unit sekolah yang tersedia. Buat unit terlebih dahulu.
      </p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">Pengaturan Unit</h2>
          <p className="text-sm text-muted-foreground mt-1">Konfigurasi data unit sekolah.</p>
        </div>
        <div className="flex items-center gap-2">
          <Combobox
            options={units.map((u) => ({ value: u.id, label: `${u.nama} (${u.jenjang})` }))}
            value={selectedUnitId}
            onValueChange={(v) => { setSelectedUnitId(v); setEditMode(false); setEditField(null) }}
            triggerClassName="text-sm border-2 border-nb-ink rounded h-8 px-2"
            className="min-w-[180px]"
          />
          <div className="flex gap-2">
            {editMode ? (
              <button onClick={() => { setEditMode(false); setEditField(null); setForm({ ...original }) }} className="nb-btn nb-btn-secondary cursor-pointer">
                <X className="w-4 h-4" /> Batal
              </button>
            ) : (
              <button onClick={() => setEditMode(true)} className="nb-btn nb-btn-secondary cursor-pointer">
                <Pencil className="w-4 h-4" /> Edit Semua
              </button>
            )}
            {(editMode || editField || hasChanges) && (
              <button onClick={handleSave} disabled={saving} className="nb-btn nb-btn-primary cursor-pointer">
                <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
      {success && <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border-2 border-emerald-700 rounded p-2.5"><Save className="w-4 h-4 shrink-0" />{success}</div>}

      {loading ? (
        <div className="h-64 bg-muted animate-pulse border-2 border-nb-ink rounded" />
      ) : (
        <div className="space-y-6">
          <div className="bg-card border-2 border-nb-ink rounded p-5">
            <h3 className="font-heading font-bold text-sm mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> {units.find((u) => u.id === unitId)?.nama || 'Unit'}
            </h3>
            <div className="space-y-4">
              {SETTINGS_FIELDS.map((f) => {
                const val = form[f.key] || ''
                const isEditing = editMode || editField === f.key
                return (
                  <div key={f.key}>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">
                      {f.label}
                      {editField === f.key && (
                        <button onClick={() => setEditField(null)} className="ml-2 text-muted-foreground hover:text-rose-600 inline-flex items-center gap-1 normal-case">
                          <X className="w-3 h-3" /> batal edit
                        </button>
                      )}
                    </label>
                    {isEditing ? (
                      f.type === 'textarea' ? (
                        <textarea autoFocus value={val} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="nb-input" rows={2} placeholder={f.label} />
                      ) : (
                        <input autoFocus value={val} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="nb-input" placeholder={f.label} />
                      )
                    ) : (
                      <div className="p-3 bg-secondary/20 border-2 border-nb-ink rounded text-sm min-h-[38px] cursor-pointer hover:bg-secondary/40 flex items-center justify-between" onClick={() => setEditField(f.key)}>
                        <span className={val ? '' : 'text-muted-foreground italic'}>{val || 'Kosong'}</span>
                        <Pencil className="w-3 h-3 text-muted-foreground shrink-0" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

