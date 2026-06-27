import { createFileRoute, redirect, useParams, Link } from '@tanstack/react-router'
import { getCurrentSession } from '#/server/auth'
import {
  getPenggajianDetail, reprosesPenggajian, approvePenggajian,
  rejectPenggajian, bayarPenggajian, deletePenggajian, updatePenggajianAdjustments,
} from '#/server/pegawai'
import { getYayasanPengaturan } from '#/server/pengaturan'
import { useState, useEffect, lazy, Suspense } from 'react'
import {
  ArrowLeft, CheckCircle2, XCircle, RotateCw, FileText, Trash2, Ban, Check, Banknote,
  TrendingUp, TrendingDown, Wallet, X, Plus, MinusCircle,
} from 'lucide-react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { SlipGajiPDF } from '#/components/slip-gaji-pdf'

const PDFViewer = lazy(() =>
  import('@react-pdf/renderer').then((mod) => ({ default: mod.PDFViewer })),
)

function rp(n: number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0) }

export const Route = createFileRoute('/_dashboard/penggajian_detail_/$id')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
  },
  component: PenggajianDetailPage,
})

function PenggajianDetailPage() {
  const { id } = useParams({ from: Route.id })
  const [data, setData] = useState<any>(null)
  const [pengaturan, setPengaturan] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState('')
  const [slipOpen, setSlipOpen] = useState(false)
  const [confirmCfg, setConfirmCfg] = useState<{ title: string; message: string; confirmText?: string; onConfirm: () => void } | null>(null)
  const [adjOpen, setAdjOpen] = useState(false)
  const [adjItems, setAdjItems] = useState<Array<{ tipe: 'penerimaan' | 'potongan'; nama: string; jumlah: number }>>([])
  const [adjError, setAdjError] = useState('')
  const [adjSaving, setAdjSaving] = useState(false)

  const fetchData = async () => {
    setLoading(true); setError('')
    try {
      const [d, p] = await Promise.all([
        getPenggajianDetail({ data: { id } }),
        getYayasanPengaturan(),
      ])
      setData(d)
      setPengaturan(p)
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data')
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  const statusBadge = (status: string) => {
    if (status === 'dibayar') return <span className="text-sm font-heading font-bold bg-emerald-100 border-2 border-emerald-800 text-emerald-800 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Dibayar</span>
    if (status === 'disetujui') return <span className="text-sm font-heading font-bold bg-blue-100 border-2 border-blue-800 text-blue-800 px-2 py-0.5 rounded flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Disetujui</span>
    if (status === 'dibatalkan') return <span className="text-sm font-heading font-bold bg-rose-100 border-2 border-rose-800 text-rose-800 px-2 py-0.5 rounded flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Dibatalkan</span>
    return <span className="text-sm font-heading font-bold bg-amber-100 border-2 border-amber-800 text-amber-800 px-2 py-0.5 rounded flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Draft</span>
  }

  const handleApprove = () => {
    setConfirmCfg({
      title: 'Setujui Penggajian',
      message: `Setujui gaji ${data?.pegawai?.nama} periode ${data?.periode}?`,
      confirmText: 'Setujui',
      onConfirm: async () => {
        setActionLoading('approve')
        try {
          await approvePenggajian({ data: { id } })
          setConfirmCfg(null)
          fetchData()
        } catch (err: any) { alert(err.message) }
        setActionLoading('')
      },
    })
  }

  const handleReject = () => {
    setConfirmCfg({
      title: 'Batalkan Persetujuan',
      message: `Batalkan persetujuan gaji ${data?.pegawai?.nama} periode ${data?.periode}?`,
      confirmText: 'Batalkan',
      onConfirm: async () => {
        setActionLoading('reject')
        try {
          await rejectPenggajian({ data: { id } })
          setConfirmCfg(null)
          fetchData()
        } catch (err: any) { alert(err.message) }
        setActionLoading('')
      },
    })
  }

  const handleReproses = () => {
    setConfirmCfg({
      title: 'Reproses Penggajian',
      message: `Hitung ulang gaji ${data?.pegawai?.nama} periode ${data?.periode} berdasarkan komponen terbaru?`,
      confirmText: 'Reproses',
      onConfirm: async () => {
        setActionLoading('reproses')
        try {
          await reprosesPenggajian({ data: { id } })
          setConfirmCfg(null)
          fetchData()
        } catch (err: any) { alert(err.message) }
        setActionLoading('')
      },
    })
  }

  const handleDelete = () => {
    setConfirmCfg({
      title: 'Hapus Penggajian',
      message: `Hapus data gaji ${data?.pegawai?.nama} periode ${data?.periode}?`,
      confirmText: 'Hapus',
      onConfirm: async () => {
        setActionLoading('delete')
        try {
          await deletePenggajian({ data: { id } })
          window.history.back()
        } catch (err: any) { alert(err.message) }
        setActionLoading('')
      },
    })
  }

  const handleBayar = () => {
    setConfirmCfg({
      title: 'Bayar Penggajian',
      message: `Tandai gaji ${data?.pegawai?.nama} periode ${data?.periode} sebagai dibayar?`,
      confirmText: 'Bayar',
      onConfirm: async () => {
        setActionLoading('bayar')
        try {
          await bayarPenggajian({ data: { id } })
          setConfirmCfg(null)
          fetchData()
        } catch (err: any) { alert(err.message) }
        setActionLoading('')
      },
    })
  }

  const openAdjustment = () => {
    const AUTO_KODES = ['gaji_pokok', 'bpjs_kesehatan', 'bpjs_jht', 'bpjs_jp', 'pph21', 'thr']
    const existing = (data.details || []).filter((d: any) => !AUTO_KODES.includes(d.kode))
    setAdjItems(existing.map((d: any) => ({ tipe: d.tipe, nama: d.nama, jumlah: d.jumlah })))
    setAdjError('')
    setAdjOpen(true)
  }

  const handleAdjSave = async () => {
    const valid = adjItems.filter(a => a.nama.trim() && a.jumlah > 0)
    setAdjSaving(true)
    setAdjError('')
    try {
      await updatePenggajianAdjustments({ data: { id, adjustments: valid } })
      setAdjOpen(false)
      fetchData()
    } catch (err: any) { setAdjError(err.message) }
    setAdjSaving(false)
  }

  const addAdjItem = () => {
    setAdjItems([...adjItems, { tipe: 'potongan', nama: '', jumlah: 0 }])
  }

  const updateAdjItem = (idx: number, patch: Partial<{ tipe: 'penerimaan' | 'potongan'; nama: string; jumlah: number }>) => {
    setAdjItems(adjItems.map((d, i) => i === idx ? { ...d, ...patch } : d))
  }

  const removeAdjItem = (idx: number) => {
    setAdjItems(adjItems.filter((_, i) => i !== idx))
  }

  if (loading) return (
    <div className="p-8 space-y-3 animate-pulse">
      <div className="h-8 bg-muted rounded w-1/3" />
      <div className="h-12 bg-muted rounded" />
      <div className="h-40 bg-muted rounded" />
    </div>
  )

  if (error) return (
    <div className="p-6">
      <div className="p-4 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
        <XCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
      </div>
    </div>
  )

  if (!data) return null

  const penerimaan = (data.details || []).filter((d: any) => d.tipe === 'penerimaan')
  const potongan = (data.details || []).filter((d: any) => d.tipe === 'potongan')
  const biayaPerusahaan = (data.details || []).filter((d: any) => d.tipe === 'biaya')

  const slipProps = {
    penggajian: {
      pegawai: data.pegawai || { nama: '-', nip: '', jabatan: '' },
      periode: data.periode,
      unit: { nama: data.unit?.nama || '' },
    },
    details: data.details?.map((d: any) => ({ tipe: d.tipe, nama: d.nama, jumlah: d.jumlah || 0 })) || [],
    totalPenerimaan: data.totalPenerimaan || 0,
    totalPotongan: data.totalPotongan || 0,
    totalDiterima: data.totalDiterima || 0,
    pph21: data.pph21 || 0,
    bpjsKaryawan: data.bpjsKaryawan || 0,
    yayasanNama: pengaturan?.nama || data.unit?.nama || '',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/penggajian" className="p-1.5 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="nb-page-title">{data.pegawai?.nama || '-'}</h2>
              {statusBadge(data.status)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {data.unit?.nama} — {data.periode} {data.pegawai?.nip && `— NIP ${data.pegawai.nip}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          {data.status === 'draft' && (
            <>
              <button onClick={handleReproses} disabled={actionLoading === 'reproses'}
                className="nb-btn nb-btn-secondary text-sm cursor-pointer disabled:opacity-50"><RotateCw className="w-3.5 h-3.5" /> Reproses</button>
              <button onClick={openAdjustment} disabled={actionLoading !== ''}
                className="nb-btn nb-btn-secondary text-sm cursor-pointer disabled:opacity-50"><Plus className="w-3.5 h-3.5" /> Adjustment</button>
              <button onClick={handleApprove} disabled={actionLoading === 'approve'}
                className="nb-btn nb-btn-primary text-sm cursor-pointer disabled:opacity-50"><Check className="w-3.5 h-3.5" /> Setujui</button>
              <button onClick={handleDelete} disabled={actionLoading === 'delete'}
                className="nb-btn nb-btn-danger text-sm cursor-pointer disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /> Hapus</button>
            </>
          )}
          {data.status === 'disetujui' && (
            <>
              <button onClick={handleReproses} disabled={actionLoading === 'reproses'}
                className="nb-btn nb-btn-secondary text-sm cursor-pointer disabled:opacity-50"><RotateCw className="w-3.5 h-3.5" /> Reproses</button>
              <button onClick={handleBayar} disabled={actionLoading === 'bayar'}
                className="nb-btn nb-btn-primary text-sm cursor-pointer disabled:opacity-50"><Banknote className="w-3.5 h-3.5" /> Bayar</button>
              <button onClick={handleReject} disabled={actionLoading === 'reject'}
                className="nb-btn nb-btn-warning text-sm cursor-pointer disabled:opacity-50"><Ban className="w-3.5 h-3.5" /> Batalkan</button>
            </>
          )}
          {(data.status === 'disetujui' || data.status === 'dibayar') && (
            <button onClick={() => setSlipOpen(true)}
              className="nb-btn nb-btn-secondary text-sm cursor-pointer"><FileText className="w-3.5 h-3.5" /> Slip Gaji</button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="nb-stat-card bg-emerald-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 border-2 border-emerald-800 rounded shadow-sm"><TrendingUp className="w-5 h-5 text-emerald-800" /></div>
            <div>
              <span className="text-sm uppercase font-heading font-semibold text-muted-foreground">Total Penerimaan</span>
              <h3 className="font-heading font-bold text-xl mt-0.5">{rp(data.totalPenerimaan)}</h3>
            </div>
          </div>
        </div>
        <div className="nb-stat-card bg-rose-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 border-2 border-rose-800 rounded shadow-sm"><TrendingDown className="w-5 h-5 text-rose-800" /></div>
            <div>
              <span className="text-sm uppercase font-heading font-semibold text-muted-foreground">Total Potongan</span>
              <h3 className="font-heading font-bold text-xl mt-0.5">{rp(data.totalPotongan)}</h3>
            </div>
          </div>
        </div>
        <div className="nb-stat-card bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 border-2 border-blue-800 rounded shadow-sm"><Wallet className="w-5 h-5 text-blue-800" /></div>
            <div>
              <span className="text-sm uppercase font-heading font-semibold text-muted-foreground">Total Diterima</span>
              <h3 className="font-heading font-bold text-xl mt-0.5">{rp(data.totalDiterima)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Penerimaan */}
        <div className="nb-table-wrapper bg-card">
          <div className="p-3 border-b-2 border-nb-ink bg-emerald-50">
            <h3 className="font-heading font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-800" /> Penerimaan
            </h3>
          </div>
          <table className="nb-table">
            <thead>
              <tr><th className="text-left">Komponen</th><th className="text-right w-32">Jumlah</th></tr>
            </thead>
            <tbody>
              {penerimaan.map((d: any, i: number) => (
                <tr key={i}>
                  <td className="text-sm">{d.nama} <span className="text-muted-foreground text-[10px]">({d.kode})</span></td>
                  <td className="text-sm text-right font-bold">{rp(d.jumlah)}</td>
                </tr>
              ))}
              {penerimaan.length === 0 && <tr><td colSpan={2} className="text-center py-4 text-sm text-muted-foreground">Belum ada data</td></tr>}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-nb-ink bg-emerald-50">
                <td className="text-sm font-heading font-bold">Total Penerimaan</td>
                <td className="text-sm font-heading font-bold text-right">{rp(data.totalPenerimaan)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Potongan */}
        <div className="nb-table-wrapper bg-card">
          <div className="p-3 border-b-2 border-nb-ink bg-rose-50">
            <h3 className="font-heading font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-800" /> Potongan
            </h3>
          </div>
          <table className="nb-table">
            <thead>
              <tr><th className="text-left">Komponen</th><th className="text-right w-32">Jumlah</th></tr>
            </thead>
            <tbody>
              {potongan.map((d: any, i: number) => (
                <tr key={i}>
                  <td className="text-sm">{d.nama} <span className="text-muted-foreground text-[10px]">({d.kode})</span></td>
                  <td className="text-sm text-right font-bold">{rp(d.jumlah)}</td>
                </tr>
              ))}
              {potongan.length === 0 && <tr><td colSpan={2} className="text-center py-4 text-sm text-muted-foreground">Tidak ada potongan</td></tr>}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-nb-ink bg-rose-50">
                <td className="text-sm font-heading font-bold">Total Potongan</td>
                <td className="text-sm font-heading font-bold text-right">{rp(data.totalPotongan)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Biaya Perusahaan */}
      {biayaPerusahaan.length > 0 && (
        <div className="nb-table-wrapper bg-card max-w-md">
          <div className="p-3 border-b-2 border-nb-ink bg-purple-50">
            <h3 className="font-heading font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-800" /> Biaya Perusahaan
            </h3>
          </div>
          <table className="nb-table">
            <thead>
              <tr><th className="text-left">Komponen</th><th className="text-right w-32">Jumlah</th></tr>
            </thead>
            <tbody>
              {biayaPerusahaan.map((d: any, i: number) => (
                <tr key={i}>
                  <td className="text-sm">{d.nama} <span className="text-muted-foreground text-[10px]">({d.kode})</span></td>
                  <td className="text-sm text-right font-bold">{rp(d.jumlah)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-nb-ink bg-purple-50">
                <td className="text-sm font-heading font-bold">Total Biaya Perusahaan</td>
                <td className="text-sm font-heading font-bold text-right">
                  {rp(biayaPerusahaan.reduce((s: number, d: any) => s + (d.jumlah || 0), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Info tambahan */}
      {data.keterangan && (
        <div className="p-4 bg-card border-2 border-nb-ink rounded">
          <p className="text-sm font-heading font-bold mb-1">Keterangan</p>
          <p className="text-sm text-muted-foreground">{data.keterangan}</p>
        </div>
      )}

      {/* Approval info */}
      {data.approvedBy && (
        <div className="p-4 bg-blue-50 border-2 border-blue-800 rounded">
          <p className="text-sm">
            <span className="font-heading font-bold">Disetujui oleh:</span>{' '}
            {data.approvedBy} {data.approvedAt && `— ${new Date(data.approvedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
      )}

      {/* Adjustment Dialog */}
      {adjOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-lg md:mx-4 shadow-lg max-h-[90dvh] flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Adjustment — {data.pegawai?.nama} ({data.periode})</h3>
              <button onClick={() => setAdjOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3 overflow-auto">
              {adjError && <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded">{adjError}</div>}
              {adjItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Belum ada adjustment. Klik tombol Tambah untuk menambah.</p>}
              {adjItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center p-2 bg-muted/20 border-2 border-nb-ink rounded">
                  <select value={item.tipe} onChange={(e) => updateAdjItem(idx, { tipe: e.target.value as 'penerimaan' | 'potongan' })}
                    className="nb-input text-sm !py-1 w-28">
                    <option value="reimburse" disabled className="hidden">— Pilih —</option>
                    <option value="penerimaan">Reimburse</option>
                    <option value="potongan">Potongan</option>
                  </select>
                  <input value={item.nama} onChange={(e) => updateAdjItem(idx, { nama: e.target.value })}
                    placeholder="Nama" className="nb-input text-sm !py-1 flex-1 min-w-0" />
                  <input type="number" value={item.jumlah || ''} onChange={(e) => updateAdjItem(idx, { jumlah: parseInt(e.target.value) || 0 })}
                    placeholder="0" className="nb-input text-sm !py-1 w-28 text-right" />
                  <button onClick={() => removeAdjItem(idx)} className="p-1 bg-rose-100 border-2 border-rose-800 text-rose-800 rounded cursor-pointer shrink-0"><MinusCircle className="w-4 h-4" /></button>
                </div>
              ))}
              <button onClick={addAdjItem} className="nb-btn nb-btn-secondary text-sm w-full cursor-pointer"><Plus className="w-3.5 h-3.5" /> Tambah Baris</button>
              <div className="flex justify-between text-sm font-heading font-bold p-3 bg-nb-ink/10 border-2 border-nb-ink rounded">
                <span>Total Potongan Baru</span>
                <span>{rp(adjItems.filter(i => i.tipe === 'potongan').reduce((s, i) => s + i.jumlah, 0))}</span>
              </div>
            </div>
            <div className="p-4 border-t-2 border-nb-ink flex justify-end gap-2">
              <button onClick={() => setAdjOpen(false)} className="nb-btn nb-btn-secondary text-sm cursor-pointer">Batal</button>
              <button onClick={handleAdjSave} disabled={adjSaving}
                className="nb-btn nb-btn-primary text-sm cursor-pointer disabled:opacity-50">{adjSaving ? 'Menyimpan...' : 'Simpan Adjustment'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmCfg && (
        <ConfirmDialog
          open
          onClose={() => setConfirmCfg(null)}
          onConfirm={confirmCfg.onConfirm}
          title={confirmCfg.title}
          message={confirmCfg.message}
          confirmText={confirmCfg.confirmText}
          loading={!!actionLoading}
        />
      )}

      {/* Slip Gaji Modal */}
      {slipOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-3xl md:mx-4 shadow-lg max-h-[90dvh] flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" /> Slip Gaji — {data.pegawai?.nama} ({data.periode})
              </h3>
              <button onClick={() => setSlipOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-auto bg-white">
              <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Memuat PDF...</div>}>
                <PDFViewer style={{ width: '100%', height: '70vh' }}>
                  <SlipGajiPDF {...slipProps} />
                </PDFViewer>
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
