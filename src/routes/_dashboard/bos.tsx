import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { useUnit } from '#/lib/unit-context'
import {
  getBosPeriodeList, createBosPeriode, updateBosPeriode, deleteBosPeriode,
  getBosRkas, createBosRkas, updateBosRkas, deleteBosRkas,
  createBosRealisasi, deleteBosRealisasi, getRingkasanBos,
} from '#/server/bos'
import { useState, useEffect } from 'react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import {
  Plus, Pencil, Trash2, X, AlertCircle, FileText, Wallet, BarChart3, CheckCircle2, Download,
} from 'lucide-react'

export const Route = createFileRoute('/_dashboard/bos')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'admin_yayasan' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: BosPage,
})

function rp(n: number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n) }

function BosPage() {
  const { activeUnit } = useUnit()
  const unitId = activeUnit?.id
  if (!unitId) return null

  const [periodeList, setPeriodeList] = useState<any[]>([])
  const [selectedPeriode, setSelectedPeriode] = useState<any>(null)
  const [rkasList, setRkasList] = useState<any[]>([])
  const [ringkasan, setRingkasan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'periode' | 'rkas' | 'realisasi' | 'laporan'>('periode')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modal states
  const [periodeModal, setPeriodeModal] = useState(false)
  const [editPeriode, setEditPeriode] = useState<any>(null)
  const [periodeForm, setPeriodeForm] = useState({ tahun: new Date().getFullYear(), nama: '', jumlahDana: 0, rekeningKhusus: '' })

  const [rkasModal, setRkasModal] = useState(false)
  const [editRkas, setEditRkas] = useState<any>(null)
  const [rkasForm, setRkasForm] = useState({ kodeRekening: '', komponen: '', subKomponen: '', anggaran: 0, keterangan: '' })

  const [realModal, setRealModal] = useState(false)
  const [selectedRkas, setSelectedRkas] = useState<any>(null)
  const [realForm, setRealForm] = useState({ tanggal: new Date().toISOString().split('T')[0], uraian: '', jumlah: 0, bukti: '' })

  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [modalError, setModalError] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchPeriode = () => {
    if (!unitId) return
    setLoading(true)
    getBosPeriodeList({ data: { unitId } }).then((list) => {
      setPeriodeList(list)
      if (!selectedPeriode && list.length > 0) setSelectedPeriode(list[0])
    }).catch(console.error).finally(() => setLoading(false))
  }

  const fetchRkas = (periodeId: string) => {
    getBosRkas({ data: { periodeId } }).then(setRkasList).catch(console.error)
    getRingkasanBos({ data: { periodeId } }).then(setRingkasan).catch(console.error)
  }

  useEffect(() => { fetchPeriode() }, [unitId])
  useEffect(() => { if (selectedPeriode) fetchRkas(selectedPeriode.id) }, [selectedPeriode])

  const pct = (anggaran: number, realisasi: number) => anggaran > 0 ? Math.round(realisasi / anggaran * 100) : 0

  return (
    <div className="space-y-6">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">Manajemen BOS</h2>
          <p className="text-sm text-muted-foreground mt-1">Bantuan Operasional Sekolah — Kelola RKAS, realisasi, dan laporan sesuai Juknis BOS.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-card border-2 border-nb-ink rounded w-fit flex-wrap">
        <button onClick={() => setTab('periode')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'periode' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <Wallet className="w-3.5 h-3.5 inline mr-1.5" />Periode
        </button>
        <button onClick={() => setTab('rkas')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'rkas' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <FileText className="w-3.5 h-3.5 inline mr-1.5" />RKAS
        </button>
        <button onClick={() => setTab('realisasi')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'realisasi' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" />Realisasi
        </button>
        <button onClick={() => setTab('laporan')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'laporan' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <BarChart3 className="w-3.5 h-3.5 inline mr-1.5" />Laporan
        </button>
      </div>

      {/* Period Selector (for non-periode tabs) */}
      {tab !== 'periode' && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-heading font-bold uppercase tracking-wider shrink-0">Pilih Periode:</label>
          <select
            value={selectedPeriode?.id || ''}
            onChange={(e) => setSelectedPeriode(periodeList.find((p) => p.id === e.target.value) || null)}
            className="nb-input text-sm max-w-xs"
          >
            {periodeList.length === 0 && <option value="">Belum ada periode</option>}
            {periodeList.map((p) => <option key={p.id} value={p.id}>{p.nama} ({p.tahun})</option>)}
          </select>
        </div>
      )}

      {error && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
      {success && <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border-2 border-emerald-700 rounded p-2.5"><CheckCircle2 className="w-4 h-4 shrink-0" />{success}</div>}

      {/* ═══ TAB: PERIODE ═══ */}
      {tab === 'periode' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => { setEditPeriode(null); setPeriodeForm({ tahun: new Date().getFullYear(), nama: `BOS Reguler ${new Date().getFullYear()}`, jumlahDana: 0, rekeningKhusus: '' }); setPeriodeModal(true) }} className="nb-btn nb-btn-primary cursor-pointer">
              <Plus className="w-4 h-4" /> Tambah Periode
            </button>
          </div>
          {loading ? <div className="h-40 bg-muted animate-pulse border-2 border-nb-ink rounded" />
          : periodeList.length === 0 ? (
            <div className="text-center py-12 bg-card border-2 border-nb-ink rounded">
              <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-heading font-bold text-muted-foreground">Belum Ada Periode BOS</p>
              <p className="text-sm text-muted-foreground mt-1">Buat periode BOS untuk mulai mengelola RKAS dan realisasi.</p>
            </div>
          ) : (
            <div className="nb-table-wrapper bg-card">
              <table className="nb-table">
                <thead><tr><th>Tahun</th><th>Nama</th><th>Jumlah Dana</th><th>Rekening Khusus</th><th>Status</th><th className="w-24 text-center">Aksi</th></tr></thead>
                <tbody>
                  {periodeList.map((p) => {
                    const totalRealisasi = p.rkasItems?.reduce((s: number, r: any) => s + (r.realisasis?.reduce((s2: number, r2: any) => s2 + r2.jumlah, 0) || 0), 0) || 0
                    const sisa = p.jumlahDana - totalRealisasi
                    return (
                      <tr key={p.id} className={selectedPeriode?.id === p.id ? 'bg-secondary/30' : ''}>
                        <td className="font-heading font-bold text-sm">{p.tahun}</td>
                        <td className="text-sm">{p.nama}</td>
                        <td className="text-sm">{rp(p.jumlahDana)}</td>
                        <td className="text-sm font-mono">{p.rekeningKhusus || '-'}</td>
                        <td><span className={`text-sm px-2 py-0.5 rounded font-heading font-bold ${p.status === 'aktif' ? 'bg-emerald-100 text-emerald-800 border border-emerald-800' : 'bg-gray-100 text-gray-800 border border-gray-600'}`}>{p.status}</span></td>
                        <td>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => { setEditPeriode(p); setPeriodeForm({ tahun: p.tahun, nama: p.nama, jumlahDana: p.jumlahDana, rekeningKhusus: p.rekeningKhusus || '' }); setPeriodeModal(true) }} className="p-1.5 hover:bg-muted-foreground/10 rounded cursor-pointer"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => { setSelectedPeriode(p); setTab('rkas') }} className="p-1.5 hover:bg-blue-100 rounded cursor-pointer" title="Lihat RKAS"><FileText className="w-4 h-4 text-blue-700" /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ═══ TAB: RKAS ═══ */}
      {tab === 'rkas' && selectedPeriode && (
        <>
          <div className="flex justify-end">
            <button onClick={() => { setEditRkas(null); setRkasForm({ kodeRekening: '', komponen: '', subKomponen: '', anggaran: 0, keterangan: '' }); setRkasModal(true) }} className="nb-btn nb-btn-primary cursor-pointer">
              <Plus className="w-4 h-4" /> Tambah Item RKAS
            </button>
          </div>
          {ringkasan && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-card border-2 border-nb-ink rounded p-3">
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Total Anggaran</p>
                <p className="text-lg font-heading font-bold mt-0.5">{rp(ringkasan.totalAnggaran)}</p>
              </div>
              <div className="bg-card border-2 border-nb-ink rounded p-3">
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Total Realisasi</p>
                <p className="text-lg font-heading font-bold mt-0.5 text-emerald-700">{rp(ringkasan.totalRealisasi)}</p>
              </div>
              <div className="bg-card border-2 border-nb-ink rounded p-3">
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Sisa Dana</p>
                <p className="text-lg font-heading font-bold mt-0.5 text-rose-700">{rp(ringkasan.sisa)}</p>
              </div>
              <div className="bg-card border-2 border-nb-ink rounded p-3">
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Persentase</p>
                <p className="text-lg font-heading font-bold mt-0.5">{pct(ringkasan.totalAnggaran, ringkasan.totalRealisasi)}%</p>
              </div>
            </div>
          )}
          <div className="nb-table-wrapper bg-card">
            <table className="nb-table">
              <thead><tr><th>Kode</th><th>Komponen</th><th>Sub Komponen</th><th className="text-right">Anggaran</th><th className="text-right">Realisasi</th><th className="text-right">Sisa</th><th className="text-center">Progres</th><th className="w-24 text-center">Aksi</th></tr></thead>
              <tbody>
                {rkasList.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-sm text-muted-foreground">Belum ada item RKAS</td></tr>
                ) : rkasList.map((r) => {
                  const realisasi = r.realisasis?.reduce((s: number, x: any) => s + x.jumlah, 0) || 0
                  const sisa = r.anggaran - realisasi
                  const persen = pct(r.anggaran, realisasi)
                  return (
                    <tr key={r.id}>
                      <td className="text-sm font-mono">{r.kodeRekening || '-'}</td>
                      <td className="font-heading font-bold text-sm">{r.komponen}</td>
                      <td className="text-sm text-muted-foreground">{r.subKomponen || '-'}</td>
                      <td className="text-right text-sm">{rp(r.anggaran)}</td>
                      <td className="text-right text-sm text-emerald-700">{rp(realisasi)}</td>
                      <td className="text-right text-sm text-rose-700">{rp(sisa)}</td>
                      <td className="text-center">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden border border-nb-ink/30">
                            <div className={`h-full rounded-full ${persen >= 100 ? 'bg-emerald-500' : persen >= 75 ? 'bg-blue-500' : persen >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(persen, 100)}%` }} />
                          </div>
                          <span className="text-sm font-heading font-bold w-8 text-right">{persen}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setEditRkas(r); setRkasForm({ kodeRekening: r.kodeRekening || '', komponen: r.komponen, subKomponen: r.subKomponen || '', anggaran: r.anggaran, keterangan: r.keterangan || '' }); setRkasModal(true) }} className="p-1.5 hover:bg-muted-foreground/10 rounded cursor-pointer"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => { setSelectedRkas(r); setRealForm({ tanggal: new Date().toISOString().split('T')[0], uraian: '', jumlah: 0, bukti: '' }); setRealModal(true) }} className="p-1.5 hover:bg-emerald-100 rounded cursor-pointer" title="Catat Realisasi"><Plus className="w-4 h-4 text-emerald-700" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ═══ TAB: REALISASI ═══ */}
      {tab === 'realisasi' && selectedPeriode && (
        <>
          {rkasList.length === 0 ? (
            <div className="text-center py-12 bg-card border-2 border-nb-ink rounded">
              <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-heading font-bold text-muted-foreground">Belum ada item RKAS</p>
              <p className="text-sm text-muted-foreground mt-1">Buat item RKAS terlebih dahulu untuk mencatat realisasi.</p>
            </div>
          ) : (
            rkasList.map((r) => {
              const realisasi = r.realisasis || []
              return (
                <div key={r.id} className="bg-card border-2 border-nb-ink rounded mb-4">
                  <div className="px-4 py-3 bg-secondary/30 border-b-2 border-nb-ink font-heading font-bold text-sm flex items-center justify-between">
                    <span>{r.kodeRekening ? `[${r.kodeRekening}] ` : ''}{r.komponen}{r.subKomponen ? ` — ${r.subKomponen}` : ''}</span>
                    <button onClick={() => { setSelectedRkas(r); setRealForm({ tanggal: new Date().toISOString().split('T')[0], uraian: '', jumlah: 0, bukti: '' }); setRealModal(true) }} className="text-sm font-heading font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer">
                      <Plus className="w-3 h-3" /> Tambah
                    </button>
                  </div>
                  {realisasi.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Belum ada realisasi</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="nb-table">
                        <thead><tr><th>Tanggal</th><th>Uraian</th><th className="text-right">Jumlah</th><th className="w-16 text-center">Aksi</th></tr></thead>
                        <tbody>
                          {realisasi.map((x: any) => (
                            <tr key={x.id}>
                              <td className="text-sm font-mono">{x.tanggal}</td>
                              <td className="text-sm">{x.uraian}</td>
                              <td className="text-right text-sm font-heading font-bold">{rp(x.jumlah)}</td>
                              <td className="text-center">
                                <button onClick={() => setConfirmDelete({ message: `Hapus realisasi "${x.uraian}"?`, onConfirm: async () => { await deleteBosRealisasi({ data: { id: x.id } }); setConfirmDelete(null); fetchRkas(selectedPeriode.id) } })} className="p-1 hover:bg-rose-100 rounded cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-rose-600" /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </>
      )}

      {/* ═══ TAB: LAPORAN ═══ */}
      {tab === 'laporan' && selectedPeriode && ringkasan && (
        <>
          <div className="bg-card border-2 border-nb-ink rounded p-4">
            <h3 className="font-heading font-bold text-sm mb-4">Ringkasan BOS {selectedPeriode.nama}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-card border-2 border-nb-ink rounded p-3">
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Dana Diterima</p>
                <p className="text-lg font-heading font-bold mt-0.5">{rp(selectedPeriode.jumlahDana)}</p>
              </div>
              <div className="bg-card border-2 border-nb-ink rounded p-3">
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Total Anggaran</p>
                <p className="text-lg font-heading font-bold mt-0.5">{rp(ringkasan.totalAnggaran)}</p>
              </div>
              <div className="bg-card border-2 border-nb-ink rounded p-3">
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Realisasi</p>
                <p className="text-lg font-heading font-bold mt-0.5 text-emerald-700">{rp(ringkasan.totalRealisasi)}</p>
              </div>
              <div className="bg-card border-2 border-nb-ink rounded p-3">
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Sisa Dana</p>
                <p className={`text-lg font-heading font-bold mt-0.5 ${ringkasan.sisa > 0 ? 'text-blue-700' : 'text-emerald-700'}`}>{rp(ringkasan.sisa)}</p>
              </div>
            </div>

            <table className="nb-table">
              <thead><tr><th>Kode</th><th>Komponen</th><th className="text-right">Anggaran</th><th className="text-right">Realisasi</th><th className="text-right">Sisa</th><th className="text-center">%</th></tr></thead>
              <tbody>
                {ringkasan.komponen.map((k: any) => (
                  <tr key={k.id}>
                    <td className="text-sm font-mono">{k.kodeRekening || '-'}</td>
                    <td className="text-sm">{k.komponen}{k.subKomponen ? ` — ${k.subKomponen}` : ''}</td>
                    <td className="text-right text-sm">{rp(k.anggaran)}</td>
                    <td className="text-right text-sm text-emerald-700">{rp(k.realisasi)}</td>
                    <td className="text-right text-sm text-rose-700">{rp(k.sisa)}</td>
                    <td className="text-center">
                      <span className={`text-sm px-2 py-0.5 rounded font-heading font-bold ${
                        pct(k.anggaran, k.realisasi) >= 100 ? 'bg-emerald-100 text-emerald-800' :
                        pct(k.anggaran, k.realisasi) >= 75 ? 'bg-blue-100 text-blue-800' :
                        pct(k.anggaran, k.realisasi) >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>{pct(k.anggaran, k.realisasi)}%</span>
                    </td>
                  </tr>
                ))}
                <tr className="font-heading font-bold bg-secondary/30">
                  <td colSpan={2} className="text-sm">TOTAL</td>
                  <td className="text-right text-sm">{rp(ringkasan.totalAnggaran)}</td>
                  <td className="text-right text-sm text-emerald-700">{rp(ringkasan.totalRealisasi)}</td>
                  <td className="text-right text-sm text-rose-700">{rp(ringkasan.sisa)}</td>
                  <td className="text-center text-sm">{pct(ringkasan.totalAnggaran, ringkasan.totalRealisasi)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Checklist Kepatuhan */}
          <div className="bg-amber-50 border-2 border-amber-800 rounded p-4">
            <h3 className="font-heading font-bold text-sm mb-2 text-amber-900">Checklist Kepatuhan BOS</h3>
            <div className="space-y-1.5">
              {[
                { label: 'Rekening khusus BOS terisi', ok: !!selectedPeriode.rekeningKhusus },
                { label: 'Total realisasi tidak melebihi anggaran per komponen', ok: ringkasan.komponen.every((k: any) => k.realisasi <= k.anggaran) },
                { label: 'Total anggaran tidak melebihi dana diterima', ok: ringkasan.totalAnggaran <= selectedPeriode.jumlahDana },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {item.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className={item.ok ? '' : 'text-rose-800'}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ═══ MODALS ═══ */}

      {/* Periode Modal */}
      {periodeModal && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-md">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">{editPeriode ? 'Edit' : 'Tambah'} Periode BOS</h3>
              <button onClick={() => setPeriodeModal(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {modalError && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{modalError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tahun</label>
                  <input type="number" value={periodeForm.tahun} onChange={(e) => setPeriodeForm({ ...periodeForm, tahun: Number(e.target.value) })} className="nb-input" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama Periode</label>
                  <input value={periodeForm.nama} onChange={(e) => setPeriodeForm({ ...periodeForm, nama: e.target.value })} className="nb-input" placeholder="BOS Reguler 2025" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Jumlah Dana Diterima (Rp)</label>
                <input type="number" min={0} value={periodeForm.jumlahDana || ''} onChange={(e) => setPeriodeForm({ ...periodeForm, jumlahDana: Number(e.target.value) || 0 })} className="nb-input" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Rekening Khusus BOS</label>
                <input value={periodeForm.rekeningKhusus} onChange={(e) => setPeriodeForm({ ...periodeForm, rekeningKhusus: e.target.value })} className="nb-input" placeholder="No. rekening pisah" />
              </div>
            </div>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex gap-3 justify-end bg-card rounded-b-lg">
              <button onClick={() => setPeriodeModal(false)} className="nb-btn nb-btn-secondary cursor-pointer">Batal</button>
              <button onClick={async () => {
                if (!periodeForm.nama.trim()) { setModalError('Nama wajib diisi'); return }
                setSaving(true); setModalError('')
                try {
                  if (editPeriode) {
                    await updateBosPeriode({ data: { id: editPeriode.id, ...periodeForm, rekeningKhusus: periodeForm.rekeningKhusus || undefined } })
                  } else {
                    const r = await createBosPeriode({ data: { unitId, ...periodeForm, rekeningKhusus: periodeForm.rekeningKhusus || undefined } })
                    setSelectedPeriode(r)
                  }
                  setPeriodeModal(false); fetchPeriode()
                } catch (err: any) { setModalError(err.message) } finally { setSaving(false) }
              }} disabled={saving} className="nb-btn nb-btn-primary cursor-pointer">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* RKAS Modal */}
      {rkasModal && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-md">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">{editRkas ? 'Edit' : 'Tambah'} Item RKAS</h3>
              <button onClick={() => setRkasModal(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {modalError && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{modalError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Kode Rekening</label>
                  <input value={rkasForm.kodeRekening} onChange={(e) => setRkasForm({ ...rkasForm, kodeRekening: e.target.value })} className="nb-input" placeholder="e.g. 5.1.01" />
                </div>
                <div>
                  <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Anggaran (Rp)</label>
                  <input type="number" min={0} value={rkasForm.anggaran || ''} onChange={(e) => setRkasForm({ ...rkasForm, anggaran: Number(e.target.value) || 0 })} className="nb-input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Komponen</label>
                <input value={rkasForm.komponen} onChange={(e) => setRkasForm({ ...rkasForm, komponen: e.target.value })} className="nb-input" placeholder="Nama komponen" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Sub Komponen</label>
                <input value={rkasForm.subKomponen} onChange={(e) => setRkasForm({ ...rkasForm, subKomponen: e.target.value })} className="nb-input" placeholder="Opsional" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Keterangan</label>
                <textarea value={rkasForm.keterangan} onChange={(e) => setRkasForm({ ...rkasForm, keterangan: e.target.value })} className="nb-input" rows={2} />
              </div>
            </div>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex gap-3 justify-end bg-card rounded-b-lg">
              <button onClick={() => setRkasModal(false)} className="nb-btn nb-btn-secondary cursor-pointer">Batal</button>
              <button onClick={async () => {
                if (!rkasForm.komponen.trim()) { setModalError('Komponen wajib diisi'); return }
                if (!selectedPeriode) return
                setSaving(true); setModalError('')
                try {
                  if (editRkas) {
                    await updateBosRkas({ data: { id: editRkas.id, ...rkasForm, kodeRekening: rkasForm.kodeRekening || undefined, subKomponen: rkasForm.subKomponen || undefined, keterangan: rkasForm.keterangan || undefined } })
                  } else {
                    await createBosRkas({ data: { periodeId: selectedPeriode.id, ...rkasForm, kodeRekening: rkasForm.kodeRekening || undefined, subKomponen: rkasForm.subKomponen || undefined, keterangan: rkasForm.keterangan || undefined } })
                  }
                  setRkasModal(false); fetchRkas(selectedPeriode.id)
                } catch (err: any) { setModalError(err.message) } finally { setSaving(false) }
              }} disabled={saving} className="nb-btn nb-btn-primary cursor-pointer">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Realisasi Modal */}
      {realModal && selectedRkas && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-md">
            <div className="p-4 border-b-2 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Catat Realisasi BOS</h3>
              <button onClick={() => setRealModal(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {modalError && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{modalError}</div>}
              <div className="bg-secondary/20 border-2 border-nb-ink rounded p-2 text-sm">
                <span className="font-heading font-bold">Komponen:</span> {selectedRkas.komponen}{selectedRkas.subKomponen ? ` — ${selectedRkas.subKomponen}` : ''}
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tanggal</label>
                <input type="date" value={realForm.tanggal} onChange={(e) => setRealForm({ ...realForm, tanggal: e.target.value })} className="nb-input" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Uraian</label>
                <input value={realForm.uraian} onChange={(e) => setRealForm({ ...realForm, uraian: e.target.value })} className="nb-input" placeholder="Uraian pengeluaran" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Jumlah (Rp)</label>
                <input type="number" min={0} value={realForm.jumlah || ''} onChange={(e) => setRealForm({ ...realForm, jumlah: Number(e.target.value) || 0 })} className="nb-input" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Bukti (URL)</label>
                <input value={realForm.bukti} onChange={(e) => setRealForm({ ...realForm, bukti: e.target.value })} className="nb-input" placeholder="Link bukti (opsional)" />
              </div>
            </div>
            <div className="border-t-2 border-nb-ink p-4 shrink-0 flex gap-3 justify-end bg-card rounded-b-lg">
              <button onClick={() => setRealModal(false)} className="nb-btn nb-btn-secondary cursor-pointer">Batal</button>
              <button onClick={async () => {
                if (!realForm.uraian.trim()) { setModalError('Uraian wajib diisi'); return }
                if (realForm.jumlah <= 0) { setModalError('Jumlah harus positif'); return }
                setSaving(true); setModalError('')
                try {
                  await createBosRealisasi({ data: { rkasId: selectedRkas.id, ...realForm, bukti: realForm.bukti || undefined } })
                  setRealModal(false); fetchRkas(selectedPeriode.id)
                  setSuccess('Realisasi berhasil dicatat')
                  setTimeout(() => setSuccess(''), 3000)
                } catch (err: any) { setModalError(err.message) } finally { setSaving(false) }
              }} disabled={saving} className="nb-btn nb-btn-primary cursor-pointer">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => { confirmDelete?.onConfirm(); setConfirmDelete(null) }} title="Konfirmasi" message={confirmDelete?.message || ''} />
    </div>
  )
}
