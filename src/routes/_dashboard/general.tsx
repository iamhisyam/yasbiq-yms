import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { AlertCircle, Database, Settings, Pencil, Save, X, Building2, Download, BookOpen } from 'lucide-react'
import { getCurrentSession, requireRole } from '#/server/auth'
import { seedDummyData, resetAllData } from '#/server/seed'
import { getAllUnitsPengaturan, saveUnitPengaturan, getYayasanPengaturan, saveYayasanPengaturan } from '#/server/pengaturan'
import { seedCoaAndKategori } from '#/server/keuangan'
import type { UnitPengaturanItem } from '#/server/pengaturan'
import type { PengaturanMap } from '#/server/pengaturan'
import { ConfirmDialog } from '#/components/confirm-dialog'

export const Route = createFileRoute('/_dashboard/general')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'admin_yayasan' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: GeneralPage,
})

const SETTINGS_FIELDS = [
  { key: 'nama', label: 'Nama Unit', type: 'text' as const },
  { key: 'nomorUnit', label: 'Nomor Unit', type: 'text' as const },
  { key: 'kepalaUnit', label: 'Kepala Unit', type: 'text' as const },
  { key: 'alamat', label: 'Alamat', type: 'textarea' as const },
  { key: 'telepon', label: 'No. Telepon', type: 'text' as const },
  { key: 'email', label: 'Email', type: 'text' as const },
]

const YAYASAN_FIELDS = [
  { key: 'nama', label: 'Nama Yayasan', type: 'text' as const },
  { key: 'npwp', label: 'NPWP', type: 'text' as const },
  { key: 'statusPkp', label: 'Status PKP', type: 'text' as const },
  { key: 'ketua', label: 'Ketua Yayasan', type: 'text' as const },
  { key: 'bendahara', label: 'Bendahara', type: 'text' as const },
  { key: 'sekretaris', label: 'Sekretaris', type: 'text' as const },
  { key: 'alamat', label: 'Alamat', type: 'textarea' as const },
  { key: 'telepon', label: 'No. Telepon', type: 'text' as const },
  { key: 'email', label: 'Email', type: 'text' as const },
  { key: 'headerDokumen', label: 'Header Dokumen', type: 'textarea' as const },
  { key: 'footerDokumen', label: 'Footer Dokumen', type: 'textarea' as const },
  { key: 'logoDokumen', label: 'Logo Dokumen', type: 'text' as const },
]

function GeneralPage() {
  const [session, setSession] = useState<any>(null)
  const [unitsData, setUnitsData] = useState<UnitPengaturanItem[]>([])
  const [yayasanForm, setYayasanForm] = useState<Record<string, string>>({})
  const [yayasanOriginal, setYayasanOriginal] = useState<Record<string, string>>({})
  const [yayasanEditMode, setYayasanEditMode] = useState(false)
  const [yayasanEditField, setYayasanEditField] = useState<string | null>(null)
  const [yayasanSaving, setYayasanSaving] = useState(false)
  const [yayasanError, setYayasanError] = useState('')
  const [yayasanSuccess, setYayasanSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalUnit, setModalUnit] = useState<UnitPengaturanItem | null>(null)
  const [editForm, setEditForm] = useState<PengaturanMap>({})
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalSuccess, setModalSuccess] = useState('')
  const [confirmCfg, setConfirmCfg] = useState<{
    title?: string; message: string; confirmText?: string; onConfirm: () => void; loading?: boolean
  } | null>(null)

  const isSuper = session?.user?.isSuperAdmin

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      getCurrentSession(),
      getAllUnitsPengaturan(),
      getYayasanPengaturan(),
    ]).then(([ses, units, yay]) => {
      setSession(ses)
      setUnitsData(units)
      const vals: Record<string, string> = {}
      for (const f of YAYASAN_FIELDS) vals[f.key] = yay[f.key] || ''
      setYayasanForm(vals)
      setYayasanOriginal(vals)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const yayasanHasChanges = Object.keys(yayasanForm).some((k) => yayasanForm[k] !== yayasanOriginal[k])

  const handleYayasanSave = async () => {
    setYayasanSaving(true); setYayasanError(''); setYayasanSuccess('')
    try {
      await saveYayasanPengaturan({ data: yayasanForm as any })
      setYayasanOriginal({ ...yayasanForm })
      setYayasanEditMode(false); setYayasanEditField(null)
      setYayasanSuccess('Pengaturan yayasan berhasil disimpan')
      setTimeout(() => setYayasanSuccess(''), 3000)
    } catch (err: any) { setYayasanError(err.message) } finally { setYayasanSaving(false) }
  }

  const openModal = (unit: UnitPengaturanItem) => {
    setModalUnit(unit)
    setEditForm({ ...unit.settings })
    setModalError('')
    setModalSuccess('')
  }

  const closeModal = () => {
    setModalUnit(null)
    setEditForm({})
    setModalError('')
    setModalSuccess('')
  }

  const handleSave = async () => {
    if (!modalUnit) return
    setSaving(true); setModalError(''); setModalSuccess('')
    try {
      await saveUnitPengaturan({ data: { unitId: modalUnit.id, data: editForm } })
      setModalSuccess('Pengaturan berhasil disimpan')
      setUnitsData((prev) =>
        prev.map((u) => (u.id === modalUnit.id ? { ...u, settings: { ...editForm } } : u))
      )
      setTimeout(() => closeModal(), 1000)
    } catch (err: any) {
      setModalError(err.message)
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">General</h2>
          <p className="text-sm text-muted-foreground mt-1">Pengaturan umum aplikasi dan data development.</p>
        </div>
      </div>

      {/* Yayasan Form — Super Admin only */}
      {isSuper && (
        <div className="bg-card border-2 border-nb-ink rounded p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Pengaturan Yayasan
            </h3>
            <div className="flex gap-2">
              {yayasanEditMode ? (
                <button onClick={() => { setYayasanEditMode(false); setYayasanEditField(null); setYayasanForm({ ...yayasanOriginal }) }} className="nb-btn nb-btn-secondary cursor-pointer">
                  <X className="w-4 h-4" /> Batal
                </button>
              ) : (
                <button onClick={() => setYayasanEditMode(true)} className="nb-btn nb-btn-secondary cursor-pointer">
                  <Pencil className="w-4 h-4" /> Edit Semua
                </button>
              )}
              {(yayasanEditMode || yayasanEditField || yayasanHasChanges) && (
                <button onClick={handleYayasanSave} disabled={yayasanSaving} className="nb-btn nb-btn-primary cursor-pointer">
                  <Save className="w-4 h-4" /> {yayasanSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              )}
            </div>
          </div>
          {yayasanError && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5 mb-4"><AlertCircle className="w-4 h-4 shrink-0" />{yayasanError}</div>}
          {yayasanSuccess && <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border-2 border-emerald-700 rounded p-2.5 mb-4"><Save className="w-4 h-4 shrink-0" />{yayasanSuccess}</div>}
          {loading ? (
            <div className="h-48 bg-muted animate-pulse border-2 border-nb-ink rounded" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {YAYASAN_FIELDS.map((f) => {
                const val = yayasanForm[f.key] || ''
                const isEditing = yayasanEditMode || yayasanEditField === f.key
                return (
                  <div key={f.key} className={f.key === 'alamat' || f.key === 'headerDokumen' || f.key === 'footerDokumen' ? 'md:col-span-2' : ''}>
                    <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">
                      {f.label}
                      {yayasanEditField === f.key && (
                        <button onClick={() => setYayasanEditField(null)} className="ml-2 text-muted-foreground hover:text-rose-600 inline-flex items-center gap-1 normal-case">
                          <X className="w-3 h-3" /> batal edit
                        </button>
                      )}
                    </label>
                    {isEditing ? (
                      f.type === 'textarea' ? (
                        <textarea autoFocus value={val} onChange={(e) => setYayasanForm({ ...yayasanForm, [f.key]: e.target.value })} className="nb-input" rows={2} placeholder={f.label} />
                      ) : (
                        <input autoFocus value={val} onChange={(e) => setYayasanForm({ ...yayasanForm, [f.key]: e.target.value })} className="nb-input" placeholder={f.label} />
                      )
                    ) : (
                      <div className="p-3 bg-secondary/20 border-2 border-nb-ink rounded text-sm min-h-[38px] cursor-pointer hover:bg-secondary/40 flex items-center justify-between" onClick={() => setYayasanEditField(f.key)}>
                        <span className={val ? '' : 'text-muted-foreground italic'}>{val || 'Kosong'}</span>
                        <Pencil className="w-3 h-3 text-muted-foreground shrink-0" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Pengaturan Unit — Super Admin only */}
      {isSuper && (
        <div className="bg-card border-2 border-nb-ink rounded p-5">
          <h3 className="font-heading font-bold text-sm mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Pengaturan Unit
          </h3>
          {loading ? (
            <div className="h-32 bg-muted animate-pulse border-2 border-nb-ink rounded" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-nb-ink bg-secondary/30">
                    <th className="text-left font-heading font-bold px-3 py-2">Unit</th>
                    <th className="text-left font-heading font-bold px-3 py-2">No. Unit</th>
                    <th className="text-left font-heading font-bold px-3 py-2 hidden md:table-cell">Alamat</th>
                    <th className="text-left font-heading font-bold px-3 py-2 hidden lg:table-cell">No. Telp</th>
                    <th className="text-center font-heading font-bold px-3 py-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {unitsData.map((u) => (
                    <tr key={u.id} className="border-b border-nb-ink/20 hover:bg-secondary/10">
                      <td className="px-3 py-2.5 font-heading font-semibold">
                        {u.nama} <span className="text-[11px] uppercase bg-accent/40 border border-nb-ink/30 px-1 rounded-sm ml-1">{u.jenjang}</span>
                      </td>
                      <td className="px-3 py-2.5">{u.settings.nomorUnit || '-'}</td>
                      <td className="px-3 py-2.5 hidden md:table-cell">{u.settings.alamat || '-'}</td>
                      <td className="px-3 py-2.5 hidden lg:table-cell">{u.settings.telepon || '-'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => openModal(u)} className="nb-btn nb-btn-secondary text-sm cursor-pointer px-2 py-1">
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {modalUnit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]" onClick={closeModal}>
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-lg md:mx-4 shadow-lg max-h-[90dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0 rounded-t-lg">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                <Settings className="w-4 h-4" /> Edit Pengaturan — {modalUnit.nama}
              </h3>
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
              {modalSuccess && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border-2 border-emerald-700 rounded p-2.5">
                  <Save className="w-4 h-4 shrink-0" />{modalSuccess}
                </div>
              )}
              {SETTINGS_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-heading font-bold mb-0.5 uppercase tracking-wider">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea
                      value={editForm[f.key] || ''}
                      onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                      className="nb-input text-sm"
                      rows={2}
                    />
                  ) : (
                    <input
                      value={editForm[f.key] || ''}
                      onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                      className="nb-input text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-3 bg-card rounded-b-lg">
              <button onClick={closeModal} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center text-sm">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving} className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center text-sm">
                <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmCfg !== null}
        onClose={() => setConfirmCfg(null)}
        onConfirm={() => confirmCfg?.onConfirm()}
        title={confirmCfg?.title}
        message={confirmCfg?.message || ''}
        confirmText={confirmCfg?.confirmText}
        loading={confirmCfg?.loading}
      />

      {/* Seed Data */}
      <div className="bg-card border-2 border-nb-ink rounded p-5">
        <h3 className="font-heading font-bold text-sm mb-4 flex items-center gap-2">
          <Database className="w-4 h-4" /> Data Development
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Generate data dummy untuk pengujian dan development. Akan menghapus semua data yang ada.
        </p>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setConfirmCfg({
                title: 'Seed COA & Kategori',
                message: 'Generate 29 akun standar ISAK 35 dan 22 kategori transaksi Coretax dengan mapping COA yang sesuai. Idempotent — data yang sudah ada tidak akan digandakan. Lanjutkan?',
                confirmText: 'Seed',
                onConfirm: async () => {
                  setConfirmCfg((prev) => prev ? { ...prev, loading: true } : null)
                  try {
                    await seedCoaAndKategori({ data: {} })
                    setConfirmCfg(null)
                  } catch (err: any) {
                    alert(err.message)
                    setConfirmCfg(null)
                  }
                },
              })}
              className="nb-btn nb-btn-secondary text-sm cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" /> Seed COA & Kategori
            </button>
          </div>
          <button
            onClick={() => setConfirmCfg({
              title: 'Seed Data Dummy',
              message: 'Seed data akan menghapus semua data existing & membuat data dummy baru. Lanjutkan?',
              confirmText: 'Seed',
              onConfirm: async () => {
                setConfirmCfg((prev) => prev ? { ...prev, loading: true } : null)
                try {
                  await seedDummyData({ data: { force: true } })
                  setConfirmCfg(null)
                  setTimeout(() => window.location.reload(), 1500)
                } catch (err: any) {
                  alert(err.message)
                  setConfirmCfg(null)
                }
              },
            })}
            className="nb-btn nb-btn-secondary text-sm cursor-pointer"
          >
            <Database className="w-4 h-4" /> Seed Data Dummy
          </button>
        </div>
      </div>

      {/* Reset Data */}
      <div className="bg-card border-2 border-rose-800 rounded p-5">
        <h3 className="font-heading font-bold text-sm mb-4 flex items-center gap-2 text-rose-800">
          <AlertCircle className="w-4 h-4" /> Reset Data
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Hapus semua data aplikasi ({'transaksi, jurnal, SPP, payroll, BOS, siswa, pegawai, COA, unit'}).
          Hanya yayasan, akun pengguna, dan pengaturan yang dipertahankan.
          <br /><span className="font-bold text-rose-700">Tindakan ini tidak dapat dibatalkan!</span>
        </p>
        <div className="space-y-3">
          <button
            onClick={() => setConfirmCfg({
              title: 'Reset Semua Data',
              message: '⚠️ RESET TOTAL — Semua data akan dihapus. Hanya yayasan & akun pengguna yang tersisa. Lanjutkan?',
              confirmText: 'Reset',
              onConfirm: async () => {
                setConfirmCfg((prev) => prev ? { ...prev, loading: true } : null)
                try {
                  await resetAllData({ data: { force: true } })
                  setConfirmCfg(null)
                  setTimeout(() => window.location.reload(), 1500)
                } catch (err: any) {
                  alert(err.message)
                  setConfirmCfg(null)
                }
              },
            })}
            className="nb-btn text-sm cursor-pointer bg-rose-700 text-white border-2 border-rose-900 hover:bg-rose-800"
          >
            <AlertCircle className="w-4 h-4" /> Reset Semua Data
          </button>
        </div>
      </div>
    </div>
  )
}
