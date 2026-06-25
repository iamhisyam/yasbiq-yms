import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { useUnit } from '#/lib/unit-context'
import { getLaporanNeraca, getLaporanSurplusDefisit, getLaporanHutangPiutang, getTrialBalance, getArusKas, getPerubahanAsetNeto, createJurnalPenyusutan, createJurnalPenutup, deleteJurnalPenutup, getBukuBesar, getCalkDepresiasi } from '#/server/keuangan'
import { getAsetList } from '#/server/aset'
import { getDanaList } from '#/server/dana'
import { getYayasanPengaturan } from '#/server/pengaturan'
import { useState, useEffect, lazy, Suspense } from 'react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { PromptDialog } from '#/components/prompt-dialog'
import {
  BarChart3, TrendingUp, FileText, AlertCircle, X, ArrowUpDown, Wallet, Layers, BookOpen, Settings2, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { NeracaPDF } from '#/components/laporan-neraca-pdf'
import { SurplusDefisitPDF } from '#/components/laporan-surplus-defisit-pdf'
import { ArusKasPDF } from '#/components/laporan-aruskas-pdf'
import { PerubahanAsetNetoPDF } from '#/components/laporan-perubahan-aset-neto-pdf'
import { Accordion, DetailRow } from '#/components/ui/accordion'
import { LaporanHutangPiutangPDF } from '#/components/laporan-hutang-piutang-pdf'

const PDFViewer = lazy(() =>
  import('@react-pdf/renderer').then((mod) => ({ default: mod.PDFViewer })),
)

export const Route = createFileRoute('/_dashboard/laporan-keuangan')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'admin_yayasan' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: LaporanKeuanganPage,
})

function rp(n: number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n) }

function LaporanKeuanganPage() {
  const { activeUnit, yayasanFilterUnitId } = useUnit()

  const [tab, setTab] = useState<'neraca' | 'surplus' | 'hp' | 'trial' | 'aruskas' | 'asetneto' | 'bukubesar' | 'calk'>('neraca')
  const [hpModal, setHpModal] = useState(false)

  const now = new Date()
  const [tahun, setTahun] = useState(String(now.getFullYear()))
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [actionResult, setActionResult] = useState<{ text: string; ok: boolean } | null>(null)
  const [promptCfg, setPromptCfg] = useState<{
    title: string; label: string; defaultValue?: string; mode?: 'text' | 'month'
    action: string; handler: (value: string) => Promise<string>
  } | null>(null)
  const [confirmCfg, setConfirmCfg] = useState<{
    title: string; message: string
    action: string; handler: () => Promise<string>
  } | null>(null)

  const tglMulai = `${tahun}-01-01`
  const tglAkhir = `${tahun}-12-31`

  const [neraca, setNeraca] = useState<any>(null)
  const [surplus, setSurplus] = useState<any>(null)
  const [hpData, setHpData] = useState<any>(null)
  const [trialBalance, setTrialBalance] = useState<any>(null)
  const [arusKas, setArusKas] = useState<any>(null)
  const [asetNeto, setAsetNeto] = useState<any>(null)
  const [bukuBesar, setBukuBesar] = useState<any>(null)
  const [calkData, setCalkData] = useState<any>({ aset: [], dana: [], totalAkumulasi: 0 })
  const [pengaturan, setPengaturan] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchTabData = async (activeTab: string) => {
    setLoading(true); setError('')
    try {
      if (activeTab === 'neraca') {
        const n = await getLaporanNeraca({ data: { unitId: yayasanFilterUnitId, tahun } })
        setNeraca(n)
      } else if (activeTab === 'surplus') {
        const s = await getLaporanSurplusDefisit({ data: { unitId: yayasanFilterUnitId, tahun, tanggalMulai: tglMulai || undefined, tanggalAkhir: tglAkhir || undefined } })
        setSurplus(s)
      } else if (activeTab === 'hp') {
        const hp = await getLaporanHutangPiutang({ data: { unitId: yayasanFilterUnitId } })
        setHpData(hp)
      } else if (activeTab === 'trial') {
        const tb = await getTrialBalance({ data: { unitId: yayasanFilterUnitId, tanggalMulai: tglMulai || undefined, tanggalAkhir: tglAkhir || undefined } })
        setTrialBalance(tb)
      } else if (activeTab === 'aruskas') {
        const ak = await getArusKas({ data: { unitId: yayasanFilterUnitId, tahun } })
        setArusKas(ak)
      } else if (activeTab === 'asetneto') {
        const an = await getPerubahanAsetNeto({ data: { unitId: yayasanFilterUnitId, tahun } })
        setAsetNeto(an)
      } else if (activeTab === 'bukubesar') {
        const bb = await getBukuBesar({ data: { unitId: yayasanFilterUnitId, tanggalMulai: tglMulai || undefined, tanggalAkhir: tglAkhir || undefined } })
        setBukuBesar(bb)
      } else if (activeTab === 'calk') {
        const [ast, dn, dep] = await Promise.all([
          getAsetList({ data: { unitId: yayasanFilterUnitId, page: 1, pageSize: 100 } }),
          getDanaList({ data: { unitId: yayasanFilterUnitId, pageSize: 100 } }),
          getCalkDepresiasi({ data: { unitId: yayasanFilterUnitId } }),
        ])
        setCalkData({ aset: (ast as any)?.data || [], dana: (dn as any)?.data || [], totalAkumulasi: (dep as any)?.totalAkumulasi || 0 })
      }
      if (!pengaturan) {
        const p = await getYayasanPengaturan()
        setPengaturan(p)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTabData(tab) }, [tab, yayasanFilterUnitId, tahun])

  return (
    <div className="space-y-6">
      <div className="nb-page-header flex items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="nb-page-title">Laporan Keuangan</h2>
          <p className="text-sm text-muted-foreground mt-1">Laporan Keuangan sesuai ISAK 35 — Entitas Berorientasi Non-Laba.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="inline-flex items-center gap-0 nb-btn nb-btn-secondary text-sm cursor-default px-2">
            <span onClick={(e) => { e.stopPropagation(); setTahun(String(Number(tahun) - 1)) }} className="p-0.5 hover:opacity-60 cursor-pointer"><ChevronLeft className="w-3.5 h-3.5" /></span>
            <span className="tabular-nums font-heading font-bold min-w-[2.5rem] text-center">{tahun}</span>
            <span onClick={(e) => { e.stopPropagation(); setTahun(String(Number(tahun) + 1)) }} className="p-0.5 hover:opacity-60 cursor-pointer"><ChevronRight className="w-3.5 h-3.5" /></span>
          </div>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="nb-btn nb-btn-secondary text-sm cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5 inline mr-1" />Aksi <ChevronDown className="w-3 h-3 inline ml-1" />
            </button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-card border-2 border-nb-ink rounded shadow-lg min-w-[200px]">
                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      setPromptCfg({
                        title: 'Jurnal Penyusutan', label: 'Periode penyusutan',
                        defaultValue: `${tahun}-${String(now.getMonth() + 1).padStart(2, '0')}`,
                        action: 'depr',
                        mode: 'month' as const,
                        handler: async (p) => {
                          const r = await createJurnalPenyusutan({ data: { unitId: activeUnit!.id, periode: p } })
                          return `Penyusutan dibuat: Rp ${(r as any).totalPenyusutan?.toLocaleString('id-ID')}`
                        },
                      })
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/30 cursor-pointer"
                  >Jurnal Penyusutan</button>
                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      setPromptCfg({
                        title: 'Tutup Buku', label: 'Tahun buku',
                        defaultValue: tahun,
                        action: 'close',
                        handler: async (p) => {
                          const r = await createJurnalPenutup({ data: { unitId: activeUnit!.id, periode: `${p}-12`, tahunBuku: p } })
                          return `Buku ditutup. Surplus: Rp ${(r as any).surplus?.toLocaleString('id-ID')}`
                        },
                      })
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/30 cursor-pointer"
                  >Tutup Buku</button>
                  <div className="border-t border-nb-ink/20" />
                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      setConfirmCfg({
                        title: 'Reset Tutup Buku',
                        message: `Reset jurnal penutup tahun ${tahun}? Semua jurnal penutup & reklasifikasi dana akan dihapus.`,
                        action: 'reset',
                        handler: async () => {
                          const r = await deleteJurnalPenutup({ data: { unitId: activeUnit!.id, tahunBuku: tahun } })
                          return `Jurnal penutup dihapus: ${(r as any).deleted} entries`
                        },
                      })
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-rose-50 text-rose-700 cursor-pointer"
                  >Reset Tutup Buku</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-card border-2 border-nb-ink rounded w-fit">
        <button onClick={() => setTab('neraca')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'neraca' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <BarChart3 className="w-3.5 h-3.5 inline mr-1.5" />Posisi Keuangan
        </button>
        <button onClick={() => setTab('surplus')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'surplus' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <TrendingUp className="w-3.5 h-3.5 inline mr-1.5" />Penghasilan Komprehensif
        </button>
        <button onClick={() => setTab('hp')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'hp' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <ArrowUpDown className="w-3.5 h-3.5 inline mr-1.5" />Utang Piutang
        </button>
        <button onClick={() => setTab('trial')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'trial' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <FileText className="w-3.5 h-3.5 inline mr-1.5" />Neraca Saldo
        </button>
        <button onClick={() => setTab('aruskas')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'aruskas' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <Wallet className="w-3.5 h-3.5 inline mr-1.5" />Arus Kas
        </button>
        <button onClick={() => setTab('asetneto')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'asetneto' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <Layers className="w-3.5 h-3.5 inline mr-1.5" />Perubahan Aset Neto
        </button>
        <button onClick={() => setTab('bukubesar')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'bukubesar' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <BookOpen className="w-3.5 h-3.5 inline mr-1.5" />Buku Besar
        </button>
        <button onClick={() => setTab('calk')} className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'calk' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}>
          <FileText className="w-3.5 h-3.5 inline mr-1.5" />CALK
        </button>
      </div>

      {actionResult && (
        <div className={`flex items-center gap-2 text-sm font-semibold rounded p-2.5 border-2 ${actionResult.ok ? 'text-blue-700 bg-blue-50 border-blue-700' : 'text-rose-700 bg-rose-50 border-rose-700'}`}>
          <AlertCircle className="w-4 h-4 shrink-0" />{actionResult.text}
        </div>
      )}
      {error && <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border-2 border-rose-700 rounded p-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

      {loading ? (
        <div className="h-64 bg-muted animate-pulse border-2 border-nb-ink rounded" />
      ) : tab === 'neraca' && neraca ? (
        <>
          {/* Neraca Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border-2 border-nb-ink rounded p-3">
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Kas & Bank</p>
              <p className="text-lg font-heading font-bold mt-0.5">{rp(neraca.kasBank)}</p>
            </div>
            <div className="bg-card border-2 border-nb-ink rounded p-3">
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Piutang SPP</p>
              <p className="text-lg font-heading font-bold mt-0.5 text-blue-700">{rp(neraca.piutangSPP)}</p>
            </div>
            <div className="bg-card border-2 border-nb-ink rounded p-3">
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Total Liabilitas</p>
              <p className="text-lg font-heading font-bold mt-0.5 text-rose-700">{rp(neraca.totalLiabilitas)}</p>
            </div>
            <div className="bg-card border-2 border-nb-ink rounded p-3">
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Aset Neto</p>
              <p className="text-lg font-heading font-bold mt-0.5 text-emerald-700">{rp(neraca.asetNeto)}</p>
            </div>
          </div>

          {/* Neraca — 2 Kolom Accordion */}
          {neraca.unitCount > 1 && (
            <div className="bg-amber-50 border-2 border-amber-800 rounded p-2 text-sm font-heading font-semibold text-amber-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Laporan Konsolidasi — {neraca.yayasanNama || 'Yayasan'} ({neraca.unitCount} unit)
            </div>
          )}
            <div className="bg-card border-2 border-nb-ink rounded">
              <div className="p-4 border-b-2 border-nb-ink bg-secondary/30">
                <h3 className="font-heading font-bold text-sm uppercase tracking-wider">Laporan Posisi Keuangan (Neraca)</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Per {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} — ISAK 35</p>
              </div>
              <div className="flex items-center justify-end gap-3 px-4 py-1 bg-secondary/10 border-b border-nb-ink/20">
                <span className="text-[11px] font-heading font-bold text-right w-24">{neraca.tahun || tahun}</span>
                <span className="text-[11px] text-muted-foreground">|</span>
                <span className="text-[11px] font-heading font-bold text-right w-24">{neraca.tahunLalu || String(Number(tahun) - 1)}</span>
              </div>
            <div>
              <div>
                <p className="text-sm font-heading font-bold uppercase tracking-wider px-4 py-2 bg-secondary/30 border-b-2 border-nb-ink">ASET</p>
                <div className="divide-y divide-nb-ink/20">
                  <div className="px-3 py-1.5 bg-blue-50/50">
                    <span className="text-[11px] font-heading font-bold text-blue-800 uppercase tracking-wider">Aset Lancar</span>
                  </div>
                  <Accordion label="Kas dan Setara Kas" jumlah={<><span className="inline-block w-24 text-right">{rp(neraca.kasBank)}</span><span className="inline-block w-6 text-center text-muted-foreground/40">|</span><span className="inline-block w-24 text-right">{rp(neraca.kasBankLalu)}</span></>} color={neraca.kasBank < 0 ? 'text-rose-600' : ''}>
                    {neraca.detailBank?.length > 0 ? neraca.detailBank.map((d: any, i: number) => (
                      <DetailRow key={i} label={d.label} sublabel={d.sublabel} jumlah={rp(d.jumlah)} />
                    )) : <DetailRow label="Tidak ada data" jumlah="-" />}
                  </Accordion>
                  <Accordion label="Piutang SPP" jumlah={<><span className="inline-block w-24 text-right">{rp(neraca.piutangSPP)}</span><span className="inline-block w-6 text-center text-muted-foreground/40">|</span><span className="inline-block w-24 text-right">{rp(neraca.piutangSPPLalu)}</span></>} color="">
                    {neraca.detailPiutangSPP?.length > 0 ? neraca.detailPiutangSPP.map((d: any, i: number) => (
                      <DetailRow key={i} label={d.label} sublabel={d.sublabel} jumlah={rp(d.jumlah)} />
                    )) : <DetailRow label="Tidak ada data" jumlah="-" />}
                  </Accordion>
                  <Accordion label="Piutang Lainnya" jumlah={<><span className="inline-block w-24 text-right">{rp(neraca.piutangLain)}</span><span className="inline-block w-6 text-center text-muted-foreground/40">|</span><span className="inline-block w-24 text-right">{rp(neraca.piutangLainLalu)}</span></>} color="">
                    {neraca.detailPiutangLain?.length > 0 ? neraca.detailPiutangLain.map((d: any, i: number) => (
                      <DetailRow key={i} label={d.label} jumlah={rp(d.jumlah)} />
                    )) : <DetailRow label="Tidak ada data" jumlah="-" />}
                  </Accordion>
                  <div className="flex items-center justify-between px-4 py-1.5 bg-blue-50/30">
                    <span className="text-sm font-heading font-semibold">Jumlah Aset Lancar</span>
                    <span className="text-sm font-heading font-bold text-blue-700 whitespace-nowrap">{rp(neraca.totalAsetLancar)} <span className="text-muted-foreground/40 mx-1">|</span> {rp(neraca.totalAsetLancarLalu)}</span>
                  </div>
                  <div className="px-3 py-1.5 bg-purple-50/50">
                    <span className="text-[11px] font-heading font-bold text-purple-800 uppercase tracking-wider">Aset Tidak Lancar</span>
                  </div>
                  <Accordion label="Aset Tetap (Nilai Buku)" jumlah={<><span className="inline-block w-24 text-right">{rp(neraca.asetTetap)}</span><span className="inline-block w-6 text-center text-muted-foreground/40">|</span><span className="inline-block w-24 text-right">{rp(neraca.asetTetapLalu)}</span></>} color="">
                    {neraca.detailAsetTetap?.length > 0 ? neraca.detailAsetTetap.map((d: any, i: number) => (
                      <DetailRow key={i} label={d.label} jumlah={rp(d.jumlah)} />
                    )) : <DetailRow label="Tidak ada data" jumlah="-" />}
                  </Accordion>
                  <div className="flex items-center justify-between px-4 py-1.5 bg-purple-50/30">
                    <span className="text-sm font-heading font-semibold">Jumlah Aset Tidak Lancar</span>
                    <span className="text-sm font-heading font-bold text-purple-700 whitespace-nowrap">{rp(neraca.totalAsetTidakLancar)} <span className="text-muted-foreground/40 mx-1">|</span> {rp(neraca.totalAsetTidakLancarLalu)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2 bg-emerald-50">
                    <span className="text-sm font-heading font-bold">JUMLAH ASET</span>
                    <span className="text-sm font-heading font-bold text-emerald-700 whitespace-nowrap">{rp(neraca.totalAset)} <span className="text-muted-foreground/40 mx-1">|</span> {rp(neraca.totalAsetLalu)}</span>
                  </div>
                </div>
              </div>
              <div className="border-t-2 border-nb-ink">
                <p className="text-sm font-heading font-bold uppercase tracking-wider px-4 py-2 bg-secondary/30 border-b-2 border-nb-ink">LIABILITAS</p>
                <div className="divide-y divide-nb-ink/20">
                  <div className="px-3 py-1.5 bg-rose-50/50">
                    <span className="text-[11px] font-heading font-bold text-rose-800 uppercase tracking-wider">Liabilitas Jangka Pendek</span>
                  </div>
                  <Accordion label="Utang Usaha" jumlah={<><span className="inline-block w-24 text-right">{rp(neraca.hutangJangkaPendek)}</span><span className="inline-block w-6 text-center text-muted-foreground/40">|</span><span className="inline-block w-24 text-right">{rp(neraca.hutangJangkaPendekLalu)}</span></>} color="">
                    {neraca.detailHutangJangkaPendek?.length > 0 ? neraca.detailHutangJangkaPendek.map((d: any, i: number) => (
                      <DetailRow key={i} label={d.label} jumlah={rp(d.jumlah)} />
                    )) : <DetailRow label="Tidak ada data" jumlah="-" />}
                  </Accordion>
                  <Accordion label="Utang Gaji" jumlah={<><span className="inline-block w-24 text-right">{rp(neraca.hutangGaji)}</span><span className="inline-block w-6 text-center text-muted-foreground/40">|</span><span className="inline-block w-24 text-right">{rp(neraca.hutangGajiLalu)}</span></>} color="">
                    {neraca.detailHutangGaji?.length > 0 ? neraca.detailHutangGaji.map((d: any, i: number) => (
                      <DetailRow key={i} label={d.label} jumlah={rp(d.jumlah)} />
                    )) : <DetailRow label="Tidak ada data" jumlah="-" />}
                  </Accordion>
                  <Accordion label="Utang Pajak (PPh 21)" jumlah={<><span className="inline-block w-24 text-right">{rp(neraca.hutangPajak)}</span><span className="inline-block w-6 text-center text-muted-foreground/40">|</span><span className="inline-block w-24 text-right">{rp(neraca.hutangPajakLalu)}</span></>} color="">
                    {neraca.detailHutangPajak?.length > 0 ? neraca.detailHutangPajak.map((d: any, i: number) => (
                      <DetailRow key={i} label={d.label} jumlah={rp(d.jumlah)} />
                    )) : <DetailRow label="Tidak ada data" jumlah="-" />}
                  </Accordion>
                  <Accordion label="Utang BPJS" jumlah={<><span className="inline-block w-24 text-right">{rp(neraca.hutangBpjs)}</span><span className="inline-block w-6 text-center text-muted-foreground/40">|</span><span className="inline-block w-24 text-right">{rp(neraca.hutangBpjsLalu)}</span></>} color="">
                    {neraca.detailHutangBpjs?.length > 0 ? neraca.detailHutangBpjs.map((d: any, i: number) => (
                      <DetailRow key={i} label={d.label} jumlah={rp(d.jumlah)} />
                    )) : <DetailRow label="Tidak ada data" jumlah="-" />}
                  </Accordion>
                  {(neraca.pendapatanDiterimaDimuka || 0) > 0 && (
                    <DetailRow label="Pendapatan Diterima di Muka" jumlah={<><span className="inline-block w-24 text-right">{rp(neraca.pendapatanDiterimaDimuka)}</span><span className="inline-block w-6 text-center text-muted-foreground/40">|</span><span className="inline-block w-24 text-right">{rp(neraca.pendapatanDiterimaDimukaLalu)}</span></>} />
                  )}
                  <div className="flex items-center justify-between px-4 py-1.5 bg-rose-50">
                    <span className="text-sm font-heading font-bold">Jumlah Liabilitas Jangka Pendek</span>
                    <span className="text-sm font-heading font-bold text-rose-700 whitespace-nowrap">{rp(neraca.totalLiabilitasJangkaPendek)} <span className="text-muted-foreground/40 mx-1">|</span> {rp(neraca.totalLiabilitasJangkaPendekLalu)}</span>
                  </div>
                </div>
                {(neraca.hutangJangkaPanjang || 0) > 0 && (
                  <div className="divide-y divide-nb-ink/20 border-t-2 border-nb-ink">
                    <div className="px-3 py-1.5 bg-orange-50/50">
                      <span className="text-[11px] font-heading font-bold text-orange-800 uppercase tracking-wider">Liabilitas Jangka Panjang</span>
                    </div>
                    <Accordion label="Utang Jangka Panjang" jumlah={<><span className="inline-block w-24 text-right">{rp(neraca.hutangJangkaPanjang)}</span><span className="inline-block w-6 text-center text-muted-foreground/40">|</span><span className="inline-block w-24 text-right">{rp(neraca.hutangJangkaPanjangLalu)}</span></>} color="">
                      {neraca.detailHutangJangkaPanjang?.length > 0 ? neraca.detailHutangJangkaPanjang.map((d: any, i: number) => (
                        <DetailRow key={i} label={d.label} sublabel={d.sublabel} jumlah={rp(d.jumlah)} />
                      )) : <DetailRow label="Tidak ada data" jumlah="-" />}
                    </Accordion>
                    <div className="flex items-center justify-between px-4 py-1.5 bg-orange-50">
                      <span className="text-sm font-heading font-bold">Jumlah Liabilitas Jangka Panjang</span>
                      <span className="text-sm font-heading font-bold text-orange-700 whitespace-nowrap">{rp(neraca.totalLiabilitasJangkaPanjang)} <span className="text-muted-foreground/40 mx-1">|</span> {rp(neraca.totalLiabilitasJangkaPanjangLalu)}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-2 bg-rose-100 border-t-2 border-nb-ink">
                  <span className="text-sm font-heading font-bold">TOTAL LIABILITAS</span>
                  <span className="text-sm font-heading font-bold text-rose-700 whitespace-nowrap">{rp(neraca.totalLiabilitas)} <span className="text-muted-foreground/40 mx-1">|</span> {rp(neraca.totalLiabilitasLalu)}</span>
                </div>
                <div className="mt-0">
                  <p className="text-sm font-heading font-bold uppercase tracking-wider px-4 py-2 bg-secondary/30 border-y-2 border-nb-ink">ASET NETO</p>
                  <div className="divide-y divide-nb-ink/20">
                    <div className="px-4 py-1.5">
                      <span className="text-[11px] font-heading font-bold text-muted-foreground uppercase tracking-wider">Tanpa Pembatasan dari Pemberi Sumber Daya</span>
                      <DetailRow label="Surplus Akumulasian" jumlah={<><span className="inline-block w-24 text-right">{rp(neraca.surplusAkumulasian || 0)}</span><span className="inline-block w-6 text-center text-muted-foreground/40">|</span><span className="inline-block w-24 text-right">{rp(neraca.surplusAkumulasianLalu || 0)}</span></>} />
                      {(neraca.penghasilanKomprehensifLain || 0) !== 0 && (
                        <DetailRow label="Penghasilan Komprehensif Lain" jumlah={<><span className="inline-block w-24 text-right">{rp(neraca.penghasilanKomprehensifLain || 0)}</span><span className="inline-block w-6 text-center text-muted-foreground/40">|</span><span className="inline-block w-24 text-right">{rp(neraca.penghasilanKomprehensifLainLalu || 0)}</span></>} />
                      )}
                    </div>
                    {(neraca.sisaDanaTerikatTemporer > 0 || neraca.sisaDanaTerikatPermanen > 0) && (
                      <div className="px-4 py-1.5">
                        <span className="text-[11px] font-heading font-bold text-muted-foreground uppercase tracking-wider">Dengan Pembatasan</span>
                        {neraca.sisaDanaTerikatTemporer > 0 && (
                          <DetailRow label="Terikat Temporer" jumlah={<><span className="inline-block w-24 text-right">{rp(neraca.sisaDanaTerikatTemporer)}</span><span className="inline-block w-6 text-center text-muted-foreground/40">|</span><span className="inline-block w-24 text-right">{rp(neraca.sisaDanaTerikatTemporerLalu)}</span></>} />
                        )}
                        {neraca.sisaDanaTerikatPermanen > 0 && (
                          <DetailRow label="Terikat Permanen" jumlah={<><span className="inline-block w-24 text-right">{rp(neraca.sisaDanaTerikatPermanen)}</span><span className="inline-block w-6 text-center text-muted-foreground/40">|</span><span className="inline-block w-24 text-right">{rp(neraca.sisaDanaTerikatPermanenLalu)}</span></>} />
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between px-4 py-2 bg-blue-50">
                      <span className="text-sm font-heading font-bold">JUMLAH ASET NETO</span>
                      <span className="text-sm font-heading font-bold text-blue-700 whitespace-nowrap">{rp(neraca.asetNeto)} <span className="text-muted-foreground/40 mx-1">|</span> {rp(neraca.asetNetoLalu)}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-t-2 border-nb-ink">
                      <span className="text-sm font-heading font-bold">TOTAL LIABILITAS DAN ASET NETO</span>
                      <span className="text-sm font-heading font-bold text-gray-800 whitespace-nowrap">{rp(neraca.totalLiabilitas + neraca.asetNeto)} <span className="text-muted-foreground/40 mx-1">|</span> {rp(neraca.totalLiabilitasLalu + neraca.asetNetoLalu)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Balance Check */}
            <div className={`p-3 border-t-2 border-nb-ink text-sm font-heading font-bold text-center ${neraca.totalAset === neraca.totalLiabilitas + neraca.asetNeto ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
              TOTAL ASET ({rp(neraca.totalAset)}) = TOTAL LIABILITAS ({rp(neraca.totalLiabilitas)}) + ASET NETO ({rp(neraca.asetNeto)})
              {'  '}{neraca.totalAset === neraca.totalLiabilitas + neraca.asetNeto ? '✓ SEIMBANG' : '✗ TIDAK SEIMBANG'}
            </div>
          </div>

          {/* Neraca PDF Preview */}
          <div className="bg-card border-2 border-nb-ink rounded" style={{ height: '600px' }}>
            <div className="p-3 border-b-2 border-nb-ink flex items-center justify-between shrink-0">
              <h3 className="font-heading font-bold text-sm">Preview Neraca PDF</h3>
            </div>
            <div style={{ height: '555px' }}>
              <Suspense fallback={<div className="flex items-center justify-center h-full bg-muted"><p className="text-sm font-heading font-bold text-muted-foreground">Loading...</p></div>}>
                <PDFViewer width="100%" height="100%" showToolbar={true} style={{ border: 'none' }}>
                  <NeracaPDF data={neraca} pengaturan={pengaturan || undefined} />
                </PDFViewer>
              </Suspense>
            </div>
          </div>
        </>
      ) : tab === 'surplus' && surplus ? (
        <>
          {/* Surplus Table — ISAK 35 Format A */}

          <div className="bg-card border-2 border-nb-ink rounded">
            <div className="p-4 border-b-2 border-nb-ink bg-secondary/30">
              <h3 className="font-heading font-bold text-sm uppercase tracking-wider">Laporan Penghasilan Komprehensif</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Periode: {surplus.periode} — ISAK 35</p>
            </div>
            <div className="flex items-center justify-end gap-3 px-4 py-1 bg-secondary/10 border-b border-nb-ink/20">
              <span className="text-[11px] font-heading font-bold text-right w-24">{surplus.tahun}</span>
              <span className="text-[11px] text-muted-foreground">|</span>
              <span className="text-[11px] font-heading font-bold text-right w-24">{surplus.tahunLalu}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="nb-table">
                <thead>
                  <tr><th className="w-1/2">Uraian</th><th className="w-1/4 text-right">Tahun Ini</th><th className="w-1/4 text-right">Tahun Lalu</th></tr>
                </thead>
                <tbody>
                  <tr className="bg-emerald-50/50 font-heading font-bold text-sm"><td colSpan={3} className="py-2 px-3">TANPA PEMBATASAN DARI PEMBERI SUMBER DAYA</td></tr>
                  <tr className="font-heading font-semibold text-sm"><td colSpan={3} className="py-1.5 px-4 text-muted-foreground">Pendapatan</td></tr>
                  {surplus.tanpaPembatasan.pendapatan.map((item: any, idx: number) => (
                    <tr key={idx}><td className="pl-10 text-sm">{item.nama}</td><td className="text-right text-sm">{rp(item.jumlah)}</td><td className="text-right text-sm text-muted-foreground">{rp(item.jumlahLalu)}</td></tr>
                  ))}
                  <tr className="font-heading font-bold bg-emerald-50"><td className="pl-6 text-sm">Jumlah Pendapatan</td><td className="text-right text-sm text-emerald-700">{rp(surplus.tanpaPembatasan.totalPendapatan)}</td><td className="text-right text-sm text-muted-foreground">—</td></tr>
                  <tr className="font-heading font-semibold text-sm"><td colSpan={3} className="py-1.5 px-4 text-muted-foreground">Beban</td></tr>
                  {surplus.tanpaPembatasan.beban.map((item: any, idx: number) => (
                    <tr key={idx}><td className="pl-10 text-sm">{item.nama}</td><td className="text-right text-sm">{rp(item.jumlah)}</td><td className="text-right text-sm text-muted-foreground">{rp(item.jumlahLalu)}</td></tr>
                  ))}
                  <tr className="font-heading font-bold bg-rose-50"><td className="pl-6 text-sm">Jumlah Beban</td><td className="text-right text-sm text-rose-700">{rp(surplus.tanpaPembatasan.totalBeban)}</td><td className="text-right text-sm text-muted-foreground">—</td></tr>
                  <tr className="font-heading font-bold bg-blue-50"><td className="pl-6 text-sm">Surplus (Defisit) — Tanpa Pembatasan</td><td className={`text-right text-sm ${surplus.tanpaPembatasan.surplus >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{rp(surplus.tanpaPembatasan.surplus)}</td><td className="text-right text-sm text-muted-foreground">—</td></tr>
                  {(surplus.denganPembatasan.pendapatan.length > 0 || surplus.denganPembatasan.beban.length > 0) && (
                    <>
                      <tr className="bg-amber-50/50 font-heading font-bold text-sm"><td colSpan={3} className="py-2 px-3 border-t-2 border-nb-ink">DENGAN PEMBATASAN DARI PEMBERI SUMBER DAYA</td></tr>
                      <tr className="font-heading font-semibold text-sm"><td colSpan={3} className="py-1.5 px-4 text-muted-foreground">Pendapatan</td></tr>
                      {surplus.denganPembatasan.pendapatan.map((item: any, idx: number) => (
                        <tr key={'dp'+idx}><td className="pl-10 text-sm">{item.nama}</td><td className="text-right text-sm">{rp(item.jumlah)}</td><td className="text-right text-sm text-muted-foreground">{rp(item.jumlahLalu)}</td></tr>
                      ))}
                      <tr className="font-heading font-bold bg-amber-50"><td className="pl-6 text-sm">Jumlah Pendapatan</td><td className="text-right text-sm text-amber-700">{rp(surplus.denganPembatasan.totalPendapatan)}</td><td className="text-right text-sm text-muted-foreground">—</td></tr>
                      {surplus.denganPembatasan.beban.length > 0 && (
                        <>
                          <tr className="font-heading font-semibold text-sm"><td colSpan={3} className="py-1.5 px-4 text-muted-foreground">Beban</td></tr>
                          {surplus.denganPembatasan.beban.map((item: any, idx: number) => (
                            <tr key={'db'+idx}><td className="pl-10 text-sm">{item.nama}</td><td className="text-right text-sm">{rp(item.jumlah)}</td><td className="text-right text-sm text-muted-foreground">{rp(item.jumlahLalu)}</td></tr>
                          ))}
                          <tr className="font-heading font-bold bg-rose-50"><td className="pl-6 text-sm">Jumlah Beban</td><td className="text-right text-sm text-rose-700">{rp(surplus.denganPembatasan.totalBeban)}</td><td className="text-right text-sm text-muted-foreground">—</td></tr>
                        </>
                      )}
                      <tr className="font-heading font-bold bg-blue-50"><td className="pl-6 text-sm">Surplus (Defisit) — Dengan Pembatasan</td><td className={`text-right text-sm ${surplus.denganPembatasan.surplus >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{rp(surplus.denganPembatasan.surplus)}</td><td className="text-right text-sm text-muted-foreground">—</td></tr>
                    </>
                  )}
                  <tr className="font-heading font-bold bg-gray-50 border-t-2 border-nb-ink"><td className="pl-4 text-sm">PENGHASILAN KOMPREHENSIF LAIN</td><td className="text-right text-sm">{rp(surplus.penghasilanKomprehensifLain)}</td><td className="text-right text-sm text-muted-foreground">—</td></tr>
                  <tr className="font-heading font-bold bg-gray-100 border-t-2 border-nb-ink"><td className="pl-4 text-sm">TOTAL PENGHASILAN KOMPREHENSIF</td><td className={`text-right text-sm ${surplus.totalPenghasilanKomprehensif >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{rp(surplus.totalPenghasilanKomprehensif)}</td><td className="text-right text-sm text-muted-foreground">—</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Surplus PDF Preview */}
          <div className="bg-card border-2 border-nb-ink rounded" style={{ height: '600px' }}>
            <div className="p-3 border-b-2 border-nb-ink flex items-center justify-between shrink-0">
              <h3 className="font-heading font-bold text-sm">Preview Laporan Penghasilan Komprehensif PDF</h3>
            </div>
            <div style={{ height: '555px' }}>
              <Suspense fallback={<div className="flex items-center justify-center h-full bg-muted"><p className="text-sm font-heading font-bold text-muted-foreground">Loading...</p></div>}>
                <PDFViewer width="100%" height="100%" showToolbar={true} style={{ border: 'none' }}>
                  <SurplusDefisitPDF
                    surplus={surplus}
                    periode={surplus.periode}
                    pengaturan={pengaturan || undefined}
                  />
                </PDFViewer>
              </Suspense>
            </div>
          </div>
        </>
      ) : tab === 'hp' && hpData ? (
        <>
          {/* HP Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border-2 border-nb-ink rounded p-3">
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Total Utang</p>
              <p className="text-lg font-heading font-bold mt-0.5 text-rose-700">{rp(hpData.totalHutang)}</p>
            </div>
            <div className="bg-card border-2 border-nb-ink rounded p-3">
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Total Piutang</p>
              <p className="text-lg font-heading font-bold mt-0.5 text-emerald-700">{rp(hpData.totalPiutang)}</p>
            </div>
            <div className="bg-card border-2 border-nb-ink rounded p-3">
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Counterparty</p>
              <p className="text-lg font-heading font-bold mt-0.5">{new Set([...hpData.hutang, ...hpData.piutang].map((i: any) => i.pihak)).size}</p>
            </div>
            <div className="bg-card border-2 border-nb-ink rounded p-3">
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Selisih</p>
              <p className={`text-lg font-heading font-bold mt-0.5 ${hpData.totalPiutang >= hpData.totalHutang ? 'text-emerald-700' : 'text-rose-700'}`}>{rp(Math.abs(hpData.totalPiutang - hpData.totalHutang))}</p>
            </div>
          </div>

          {/* Aging Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(hpData.agingHutang).map(([bucket, amount]: [string, any]) => (
              <div key={bucket} className="bg-card border-2 border-nb-ink rounded p-3">
                <p className="text-sm font-heading font-bold uppercase tracking-wider text-muted-foreground">Utang Aging {bucket} Hari</p>
                <p className="text-lg font-heading font-bold mt-0.5">{rp(amount)}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button onClick={() => setHpModal(true)} className="nb-btn nb-btn-primary cursor-pointer shrink-0">
              <FileText className="w-4 h-4" /> Laporan Coretax
            </button>
          </div>

          {/* HP Table */}
          <div className="bg-card border-2 border-nb-ink rounded">
            <div className="p-4 border-b-2 border-nb-ink bg-secondary/30">
              <h3 className="font-heading font-bold text-sm uppercase tracking-wider">Daftar Utang</h3>
            </div>
            {hpData.hutang.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Tidak ada hutang</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="nb-table">
                  <thead><tr><th>Counterparty</th><th>Deskripsi</th><th className="text-right">Jumlah</th><th className="text-right">Sisa</th><th className="text-center">Aging</th><th>Status</th></tr></thead>
                  <tbody>
                    {hpData.hutang.map((h: any) => (
                      <tr key={h.id}>
                        <td className="font-heading font-bold text-sm">{h.pihak}</td>
                        <td className="text-sm">{h.deskripsi}</td>
                        <td className="text-right text-sm">{rp(h.jumlah)}</td>
                        <td className="text-right text-sm text-rose-700">{rp(h.sisa)}</td>
                        <td className="text-center">
                          <span className={`text-sm px-2 py-0.5 rounded font-heading font-bold ${
                            h.aging <= 30 ? 'bg-emerald-100 text-emerald-800' :
                            h.aging <= 60 ? 'bg-amber-100 text-amber-800' :
                            h.aging <= 90 ? 'bg-orange-100 text-orange-800' : 'bg-rose-100 text-rose-800'
                          }`}>{h.aging}h</span>
                        </td>
                        <td className="text-sm capitalize">{h.status === 'belum_lunas' ? 'Belum Lunas' : h.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-card border-2 border-nb-ink rounded">
            <div className="p-4 border-b-2 border-nb-ink bg-secondary/30">
              <h3 className="font-heading font-bold text-sm uppercase tracking-wider">Daftar Piutang</h3>
            </div>
            {hpData.piutang.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Tidak ada piutang</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="nb-table">
                  <thead><tr><th>Counterparty</th><th>Deskripsi</th><th className="text-right">Jumlah</th><th className="text-right">Sisa</th><th className="text-center">Aging</th><th>Status</th></tr></thead>
                  <tbody>
                    {hpData.piutang.map((p: any) => (
                      <tr key={p.id}>
                        <td className="font-heading font-bold text-sm">{p.pihak}</td>
                        <td className="text-sm">{p.deskripsi}</td>
                        <td className="text-right text-sm">{rp(p.jumlah)}</td>
                        <td className="text-right text-sm text-emerald-700">{rp(p.sisa)}</td>
                        <td className="text-center">
                          <span className={`text-sm px-2 py-0.5 rounded font-heading font-bold ${
                            p.aging <= 30 ? 'bg-emerald-100 text-emerald-800' :
                            p.aging <= 60 ? 'bg-amber-100 text-amber-800' :
                            p.aging <= 90 ? 'bg-orange-100 text-orange-800' : 'bg-rose-100 text-rose-800'
                          }`}>{p.aging}h</span>
                        </td>
                        <td className="text-sm capitalize">{p.status === 'belum_lunas' ? 'Belum Lunas' : p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : tab === 'trial' && trialBalance ? (
        <div className="space-y-4">
          <div className="bg-card border-2 border-nb-ink rounded">
            <div className="p-4 border-b-2 border-nb-ink bg-secondary/30 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-sm uppercase tracking-wider">Neraca Saldo (Trial Balance)</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{tglMulai} — {tglAkhir}</p>
              </div>
              <span className={`text-sm font-heading font-bold px-2 py-0.5 rounded border ${trialBalance.balanced ? 'bg-emerald-100 border-emerald-800 text-emerald-800' : 'bg-rose-100 border-rose-800 text-rose-800'}`}>
                {trialBalance.balanced ? 'SEIMBANG' : 'TIDAK SEIMBANG'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="nb-table">
                <thead>
                  <tr>
                    <th className="w-10 text-center">#</th>
                    <th>Kode</th>
                    <th>Nama Akun</th>
                    <th className="text-right">Debit</th>
                    <th className="text-right">Kredit</th>
                    <th className="text-right">Saldo Debit</th>
                    <th className="text-right">Saldo Kredit</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBalance.rows?.map((r: any, i: number) => (
                    <tr key={r.coaKode} className={r.totalDebit === 0 && r.totalKredit === 0 ? 'opacity-40' : ''}>
                      <td className="text-center text-sm text-muted-foreground">{i + 1}</td>
                      <td className="text-sm font-mono">{r.coaKode}</td>
                      <td className="text-sm font-heading font-semibold">{r.coaNama}</td>
                      <td className="text-right text-sm">{r.totalDebit > 0 ? rp(r.totalDebit) : '-'}</td>
                      <td className="text-right text-sm">{r.totalKredit > 0 ? rp(r.totalKredit) : '-'}</td>
                      <td className="text-right text-sm font-heading font-bold">{r.saldoDebit > 0 ? rp(r.saldoDebit) : '-'}</td>
                      <td className="text-right text-sm font-heading font-bold">{r.saldoKredit > 0 ? rp(r.saldoKredit) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-secondary/30 border-t-2 border-nb-ink font-heading font-bold">
                    <td colSpan={3} className="text-sm text-right">TOTAL</td>
                    <td className="text-right text-sm">{rp(trialBalance.totalDebit)}</td>
                    <td className="text-right text-sm">{rp(trialBalance.totalKredit)}</td>
                    <td className="text-right text-sm">{rp(trialBalance.totalSaldoDebit)}</td>
                    <td className="text-right text-sm">{rp(trialBalance.totalSaldoKredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : tab === 'aruskas' && arusKas ? (
        <>
        <div className="bg-card border-2 border-nb-ink rounded">
          <div className="p-4 border-b-2 border-nb-ink bg-secondary/30">
            <h3 className="font-heading font-bold text-sm uppercase tracking-wider">Laporan Arus Kas — ISAK 35 (Metode Langsung)</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Tahun yang berakhir pada 31 Desember {arusKas.tahun}</p>
          </div>
          <div className="flex items-center justify-end gap-3 px-4 py-1 bg-secondary/10 border-b border-nb-ink/20">
            <span className="text-[11px] font-heading font-bold text-right w-24">{arusKas.tahun}</span>
            <span className="text-[11px] text-muted-foreground">|</span>
            <span className="text-[11px] font-heading font-bold text-right w-24">{arusKas.tahunLalu}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="nb-table">
              <thead>
                <tr>
                  <th className="text-left w-1/2">Aktivitas</th>
                  <th className="text-right w-1/6">Masuk</th>
                  <th className="text-right w-1/6">Keluar</th>
                  <th className="text-right w-1/6">Netto ({arusKas.tahun})</th>
                  <th className="text-right w-1/6">Netto ({arusKas.tahunLalu})</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-secondary/20">
                  <td className="font-heading font-bold text-sm">A. ARUS KAS DARI AKTIVITAS OPERASI</td>
                  <td></td><td></td><td></td><td></td>
                </tr>
                {arusKas.operasiItems?.length > 0 ? arusKas.operasiItems.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="text-sm pl-6">{item.nama}</td>
                    <td className="text-right text-sm text-emerald-700">{item.masuk > 0 ? rp(item.masuk) : '-'}</td>
                    <td className="text-right text-sm text-rose-700">{item.keluar > 0 ? rp(item.keluar) : '-'}</td>
                    <td className="text-right text-sm">{rp(item.masuk - item.keluar)}</td>
                    <td className="text-right text-sm text-muted-foreground">-</td>
                  </tr>
                )) : (
                  <tr><td className="text-sm text-muted-foreground italic pl-6" colSpan={5}>Tidak ada transaksi operasi</td></tr>
                )}
                <tr className="border-t border-nb-ink/30 bg-secondary/10 font-heading font-bold">
                  <td className="text-sm">Jumlah Arus Kas dari Aktivitas Operasi</td>
                  <td className="text-right text-sm text-emerald-700">{rp(arusKas.operasiMasuk)}</td>
                  <td className="text-right text-sm text-rose-700">{rp(arusKas.operasiKeluar)}</td>
                  <td className="text-right text-sm">{rp(arusKas.operasiNet)}</td>
                  <td className="text-right text-sm text-muted-foreground">{rp(arusKas.operasiNetLalu)}</td>
                </tr>

                <tr className="bg-secondary/20">
                  <td className="font-heading font-bold text-sm pt-4">B. ARUS KAS DARI AKTIVITAS INVESTASI</td>
                  <td></td><td></td><td></td><td></td>
                </tr>
                {arusKas.investasiItems?.length > 0 ? arusKas.investasiItems.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="text-sm pl-6">{item.nama}</td>
                    <td className="text-right text-sm text-emerald-700">{item.masuk > 0 ? rp(item.masuk) : '-'}</td>
                    <td className="text-right text-sm text-rose-700">{item.keluar > 0 ? rp(item.keluar) : '-'}</td>
                    <td className="text-right text-sm">{rp(item.masuk - item.keluar)}</td>
                    <td className="text-right text-sm text-muted-foreground">-</td>
                  </tr>
                )) : (
                  <tr><td className="text-sm text-muted-foreground italic pl-6" colSpan={5}>Tidak ada transaksi investasi</td></tr>
                )}
                <tr className="border-t border-nb-ink/30 bg-secondary/10 font-heading font-bold">
                  <td className="text-sm">Jumlah Arus Kas dari Aktivitas Investasi</td>
                  <td className="text-right text-sm">{arusKas.investasiMasuk > 0 ? rp(arusKas.investasiMasuk) : '-'}</td>
                  <td className="text-right text-sm text-rose-700">{arusKas.investasiKeluar > 0 ? rp(arusKas.investasiKeluar) : '-'}</td>
                  <td className="text-right text-sm">{rp(arusKas.investasiNet)}</td>
                  <td className="text-right text-sm text-muted-foreground">{rp(arusKas.investasiNetLalu)}</td>
                </tr>

                <tr className="bg-secondary/20">
                  <td className="font-heading font-bold text-sm pt-4">C. ARUS KAS DARI AKTIVITAS PENDANAAN</td>
                  <td></td><td></td><td></td><td></td>
                </tr>
                {arusKas.pendanaanItems?.length > 0 ? arusKas.pendanaanItems.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="text-sm pl-6">{item.nama}</td>
                    <td className="text-right text-sm text-emerald-700">{item.masuk > 0 ? rp(item.masuk) : '-'}</td>
                    <td className="text-right text-sm text-rose-700">{item.keluar > 0 ? rp(item.keluar) : '-'}</td>
                    <td className="text-right text-sm">{rp(item.masuk - item.keluar)}</td>
                    <td className="text-right text-sm text-muted-foreground">-</td>
                  </tr>
                )) : (
                  <tr><td className="text-sm text-muted-foreground italic pl-6" colSpan={5}>Tidak ada transaksi pendanaan</td></tr>
                )}
                <tr className="border-t border-nb-ink/30 bg-secondary/10 font-heading font-bold">
                  <td className="text-sm">Jumlah Arus Kas dari Aktivitas Pendanaan</td>
                  <td className="text-right text-sm">{arusKas.pendanaanMasuk > 0 ? rp(arusKas.pendanaanMasuk) : '-'}</td>
                  <td className="text-right text-sm text-rose-700">{arusKas.pendanaanKeluar > 0 ? rp(arusKas.pendanaanKeluar) : '-'}</td>
                  <td className="text-right text-sm">{rp(arusKas.pendanaanNet)}</td>
                  <td className="text-right text-sm text-muted-foreground">{rp(arusKas.pendanaanNetLalu)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-secondary/30 border-t-2 border-nb-ink font-heading font-bold">
                  <td className="text-sm">KENAIKAN/(PENURUNAN) NETO KAS</td>
                  <td></td><td></td>
                  <td className="text-right text-sm">{rp(arusKas.kenaikanNeto)}</td>
                  <td className="text-right text-sm text-muted-foreground">{rp(arusKas.kenaikanNetoLalu)}</td>
                </tr>
                <tr>
                  <td className="text-sm">Kas dan Setara Kas Awal Tahun</td>
                  <td></td><td></td>
                  <td className="text-right text-sm">{rp(arusKas.saldoAwal)}</td>
                  <td className="text-right text-sm text-muted-foreground">{rp(arusKas.saldoAwalLalu)}</td>
                </tr>
                <tr className="bg-secondary/10 font-heading font-bold border-t-2 border-nb-ink">
                  <td className="text-sm">KAS DAN SETARA KAS AKHIR TAHUN</td>
                  <td></td><td></td>
                  <td className="text-right text-sm">{rp(arusKas.saldoAkhir)}</td>
                  <td className="text-right text-sm text-muted-foreground">{rp(arusKas.saldoAkhirLalu)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Arus Kas PDF Preview */}
        <div className="bg-card border-2 border-nb-ink rounded" style={{ height: '600px' }}>
          <div className="p-3 border-b-2 border-nb-ink flex items-center justify-between shrink-0">
            <h3 className="font-heading font-bold text-sm">Preview Laporan Arus Kas PDF</h3>
          </div>
          <div style={{ height: '555px' }}>
            <Suspense fallback={<div className="flex items-center justify-center h-full bg-muted"><p className="text-sm font-heading font-bold text-muted-foreground">Loading...</p></div>}>
              <PDFViewer width="100%" height="100%" showToolbar={true} style={{ border: 'none' }}>
                <ArusKasPDF data={arusKas} pengaturan={pengaturan || undefined} />
              </PDFViewer>
            </Suspense>
          </div>
        </div>
      </>
      ) : tab === 'asetneto' && asetNeto ? (
        <div className="space-y-4">
          <div className="bg-card border-2 border-nb-ink rounded">
            <div className="p-4 border-b-2 border-nb-ink bg-secondary/30">
              <h3 className="font-heading font-bold text-sm uppercase tracking-wider">Laporan Perubahan Aset Neto — ISAK 35</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Tahun yang berakhir pada 31 Desember {asetNeto.tahun}</p>
            </div>
            <div className="flex items-center justify-end gap-3 px-4 py-1 bg-secondary/10 border-b border-nb-ink/20">
              <span className="text-[11px] font-heading font-bold text-right w-24">{asetNeto.tahun}</span>
              <span className="text-[11px] text-muted-foreground">|</span>
              <span className="text-[11px] font-heading font-bold text-right w-24">{asetNeto.tahunLalu}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="nb-table">
                <thead>
                  <tr><th>Keterangan</th><th className="text-right">Tahun Ini</th><th className="text-right">Tahun Lalu</th></tr>
                </thead>
                <tbody>
                  <tr className="bg-emerald-50/50 font-heading font-bold text-sm"><td colSpan={3} className="py-2 px-3">ASET NETO TANPA PEMBATASAN DARI PEMBERI SUMBER DAYA</td></tr>
                  <tr><td className="pl-8 text-sm">Saldo Awal</td><td className="text-right text-sm">{rp(asetNeto.tanpaPembatasan.saldoAwal)}</td><td className="text-right text-sm text-muted-foreground">{rp(asetNeto.tanpaPembatasan.saldoAwalLalu)}</td></tr>
                  <tr><td className="pl-8 text-sm">Surplus Tahun Berjalan</td><td className="text-right text-sm" style={asetNeto.tanpaPembatasan.surplus >= 0 ? {} : {color:'#dc2626'}}>{rp(asetNeto.tanpaPembatasan.surplus)}</td><td className="text-right text-sm text-muted-foreground">{rp(asetNeto.tanpaPembatasan.surplusLalu)}</td></tr>
                  <tr><td className="pl-8 text-sm">Aset Neto yang Dibebaskan dari Pembatasan</td><td className="text-right text-sm">{rp(asetNeto.tanpaPembatasan.asetDibebaskan)}</td><td className="text-right text-sm text-muted-foreground">{rp(asetNeto.tanpaPembatasan.asetDibebaskanLalu)}</td></tr>
                  <tr className="bg-emerald-50/30 font-heading font-bold"><td className="pl-6 text-sm">Saldo Akhir</td><td className="text-right text-sm text-emerald-700">{rp(asetNeto.tanpaPembatasan.saldoAkhir)}</td><td className="text-right text-sm text-muted-foreground">{rp(asetNeto.tanpaPembatasan.saldoAkhirLalu)}</td></tr>
                  <tr className="bg-gray-50 font-heading font-bold text-sm"><td colSpan={3} className="py-2 px-3 border-t-2 border-nb-ink">PENGHASILAN KOMPREHENSIF LAIN</td></tr>
                  <tr><td className="pl-8 text-sm">Saldo Awal</td><td className="text-right text-sm">{rp(asetNeto.pkl.saldoAwal)}</td><td className="text-right text-sm text-muted-foreground">{rp(asetNeto.pkl.saldoAwalLalu)}</td></tr>
                  <tr><td className="pl-8 text-sm">Penghasilan Komprehensif Tahun Berjalan</td><td className="text-right text-sm">{rp(asetNeto.pkl.tahunBerjalan)}</td><td className="text-right text-sm text-muted-foreground">{rp(asetNeto.pkl.tahunBerjalanLalu)}</td></tr>
                  <tr className="bg-gray-50/30 font-heading font-bold"><td className="pl-6 text-sm">Saldo Akhir</td><td className="text-right text-sm">{rp(asetNeto.pkl.saldoAkhir)}</td><td className="text-right text-sm text-muted-foreground">{rp(asetNeto.pkl.saldoAkhirLalu)}</td></tr>
                  <tr className="bg-amber-50/50 font-heading font-bold text-sm"><td colSpan={3} className="py-2 px-3 border-t-2 border-nb-ink">ASET NETO DENGAN PEMBATASAN DARI PEMBERI SUMBER DAYA</td></tr>
                  <tr><td className="pl-8 text-sm">Saldo Awal</td><td className="text-right text-sm">{rp(asetNeto.denganPembatasan.saldoAwal)}</td><td className="text-right text-sm text-muted-foreground">{rp(asetNeto.denganPembatasan.saldoAwalLalu)}</td></tr>
                  <tr><td className="pl-8 text-sm">Surplus Tahun Berjalan</td><td className="text-right text-sm" style={asetNeto.denganPembatasan.surplus >= 0 ? {} : {color:'#dc2626'}}>{rp(asetNeto.denganPembatasan.surplus)}</td><td className="text-right text-sm text-muted-foreground">{rp(asetNeto.denganPembatasan.surplusLalu)}</td></tr>
                  <tr><td className="pl-8 text-sm">Aset Neto yang Dibebaskan dari Pembatasan</td><td className="text-right text-sm text-rose-700">({rp(asetNeto.denganPembatasan.asetDibebaskan)})</td><td className="text-right text-sm text-muted-foreground">({rp(asetNeto.denganPembatasan.asetDibebaskanLalu)})</td></tr>
                  <tr className="bg-amber-50/30 font-heading font-bold"><td className="pl-6 text-sm">Saldo Akhir</td><td className="text-right text-sm text-amber-700">{rp(asetNeto.denganPembatasan.saldoAkhir)}</td><td className="text-right text-sm text-muted-foreground">{rp(asetNeto.denganPembatasan.saldoAkhirLalu)}</td></tr>
                  <tr className="bg-blue-50 font-heading font-bold border-t-2 border-nb-ink"><td className="pl-4 text-sm">TOTAL ASET NETO</td><td className="text-right text-sm text-blue-700">{rp(asetNeto.totalAkhir)}</td><td className="text-right text-sm text-muted-foreground">{rp(asetNeto.totalAkhirLalu)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Perubahan Aset Neto PDF Preview */}
          <div className="bg-card border-2 border-nb-ink rounded" style={{ height: '600px' }}>
            <div className="p-3 border-b-2 border-nb-ink flex items-center justify-between shrink-0">
              <h3 className="font-heading font-bold text-sm">Preview Laporan Perubahan Aset Neto PDF</h3>
            </div>
            <div style={{ height: '555px' }}>
              <Suspense fallback={<div className="flex items-center justify-center h-full bg-muted"><p className="text-sm font-heading font-bold text-muted-foreground">Loading...</p></div>}>
                <PDFViewer width="100%" height="100%" showToolbar={true} style={{ border: 'none' }}>
                  <PerubahanAsetNetoPDF data={asetNeto} pengaturan={pengaturan || undefined} />
                </PDFViewer>
              </Suspense>
            </div>
          </div>
        </div>
      ) : tab === 'bukubesar' && bukuBesar ? (
        <div className="space-y-3">
          {bukuBesar?.map((acc: any) => (
            <div key={acc.coa.id} className="bg-card border-2 border-nb-ink rounded">
              <div className="p-3 border-b-2 border-nb-ink bg-secondary/30 flex items-center justify-between">
                <div>
                  <span className="font-heading font-bold text-sm">{acc.coa.kode} — {acc.coa.nama}</span>
                  <span className="text-[11px] text-muted-foreground ml-1">({acc.coa.tipe})</span>
                </div>
                <span className="text-sm font-heading font-bold">{acc.saldo >= 0 ? '' : '-'}{rp(Math.abs(acc.saldo))} {acc.coa.saldoNormal}</span>
              </div>
              {acc.rows?.length > 0 && (
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="nb-table">
                    <thead>
                      <tr>
                        <th className="w-24">Tanggal</th>
                        <th>Keterangan</th>
                        <th className="text-right w-32">Debit</th>
                        <th className="text-right w-32">Kredit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acc.rows.map((r: any, i: number) => (
                        <tr key={i}>
                          <td className="text-sm">{r.tanggal}</td>
                          <td className="text-sm">{r.keterangan || r.jurnalKeterangan || '-'}</td>
                          <td className="text-right text-sm">{r.debit > 0 ? rp(r.debit) : '-'}</td>
                          <td className="text-right text-sm">{r.kredit > 0 ? rp(r.kredit) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="p-2 border-t-2 border-nb-ink bg-secondary/10 flex justify-between text-sm font-heading font-bold">
                <span>Total Debit: {rp(acc.totalDebit)}</span>
                <span>Total Kredit: {rp(acc.totalKredit)}</span>
                <span>Saldo: {rp(acc.saldo)}</span>
              </div>
            </div>
          ))}
          {(!bukuBesar || bukuBesar.length === 0) && (
            <div className="text-center py-8 text-sm text-muted-foreground">Tidak ada data buku besar untuk periode ini</div>
          )}
        </div>
      ) : tab === 'calk' ? (
        <div className="space-y-6">
          {/* Catatan A: Kebijakan Akuntansi */}
          <div className="bg-card border-2 border-nb-ink rounded">
            <div className="p-4 border-b-2 border-nb-ink bg-secondary/30 flex items-start justify-between">
              <div>
                <h3 className="font-heading font-bold text-sm uppercase tracking-wider">Catatan A — Kebijakan Akuntansi</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Ikhtisar kebijakan akuntansi signifikan entitas berorientasi nonlaba</p>
              </div>
            </div>
            <div className="p-4 text-sm space-y-3 text-muted-foreground">
              <p>
                <span className="font-heading font-bold text-foreground">Dasar penyusunan laporan keuangan </span>
                — Laporan keuangan disusun berdasarkan Standar Akuntansi Keuangan Entitas Berorientasi Non-Laba (ISAK 35) 
                dengan menggunakan basis akrual, kecuali untuk laporan arus kas yang disusun menggunakan metode langsung. 
                Mata uang pelaporan adalah Rupiah (IDR). Tahun buku dimulai 1 Januari hingga 31 Desember.
              </p>
              <p>
                <span className="font-heading font-bold text-foreground">Pengakuan pendapatan dan beban </span>
                — Pendapatan diakui ketika hak atas pendapatan tersebut diperoleh (basis akrual). Beban diakui pada saat 
                terjadinya (accrual basis). Pendapatan diterima di muka diakui sebagai liabilitas hingga jasa diberikan.
              </p>
              <p>
                <span className="font-heading font-bold text-foreground">Sumbangan dengan pembatasan dan tanpa pembatasan </span>
                — Entitas menyajikan hibah, wakaf, atau sumbangan, berupa kas atau aset lain, sebagai sumbangan dengan 
                pembatasan jika diterima dengan persyaratan pembatasan baik untuk penggunaan aset atau atas manfaat 
                ekonomik masa depan. Jika pembatasan dari pemberi sumber daya telah kedaluwarsa (masa pembatasan berakhir 
                atau pembatasan penggunaan telah dipenuhi), aset neto dengan pembatasan digolongkan kembali menjadi aset 
                neto tanpa pembatasan dan disajikan dalam laporan perubahan aset neto sebagai aset neto yang dibebaskan 
                dari pembatasan. Tanah, bangunan, dan peralatan disajikan sebagai sumbangan tanpa pembatasan kecuali ada 
                pembatasan eksplisit dari pemberi.
              </p>
              <p>
                <span className="font-heading font-bold text-foreground">Aset tetap </span>
                — Aset tetap dicatat sebesar harga perolehan. Penyusutan dihitung menggunakan metode garis lurus 
                (straight-line method) dan saldo menurun ganda (double declining balance) selama masa manfaat aset.
              </p>
              <p>
                <span className="font-heading font-bold text-foreground">Investasi </span>
                — Investasi dicatat pada nilai wajar. Kelebihan kas di atas kebutuhan harian diinvestasikan dalam 
                instrumen jangka pendek dan jangka panjang sesuai kebijakan entitas.
              </p>
            </div>
          </div>

          {/* Catatan B: Aset Neto dengan Pembatasan */}
          <div className="bg-card border-2 border-nb-ink rounded">
            <div className="p-4 border-b-2 border-nb-ink bg-secondary/30">
              <h3 className="font-heading font-bold text-sm uppercase tracking-wider">Catatan B — Aset Neto dengan Pembatasan dari Pemberi Sumber Daya</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Rincian aset neto yang dibatasi tujuan atau periodenya</p>
            </div>
            <div className="overflow-x-auto">
              <table className="nb-table">
                <thead>
                  <tr>
                    <th>Nama Dana</th><th>Sumber</th><th>Jenis Ikat</th>
                    <th className="text-right">Target</th><th className="text-right">Realisasi</th><th className="text-right">Sisa</th>
                  </tr>
                </thead>
                <tbody>
                  {calkData.dana?.map((d: any) => (
                    <tr key={d.id}>
                      <td className="text-sm font-heading font-semibold">{d.nama}</td>
                      <td className="text-sm">{d.sumber || '-'}</td>
                      <td className="text-sm">{d.jenisIkat === 'terikat_temporer' ? 'Terikat Temporer' : d.jenisIkat === 'terikat_permanen' ? 'Terikat Permanen' : d.jenisIkat || '-'}</td>
                      <td className="text-right text-sm">{rp(d.targetNominal)}</td>
                      <td className="text-right text-sm">{rp(d.realisasi)}</td>
                      <td className="text-right text-sm font-heading font-bold">{rp((d.targetNominal || 0) - (d.realisasi || 0))}</td>
                    </tr>
                  ))}
                  {(!calkData.dana || calkData.dana.length === 0) && (
                    <tr><td colSpan={6} className="text-center text-sm text-muted-foreground py-4">Tidak ada dana dengan pembatasan</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-secondary/20 font-heading font-bold border-t-2 border-nb-ink">
                    <td colSpan={3} className="text-sm">Total Aset Neto dengan Pembatasan</td>
                    <td className="text-right text-sm">{rp(calkData.dana?.reduce((s: number, d: any) => s + (d.targetNominal || 0), 0) || 0)}</td>
                    <td className="text-right text-sm">{rp(calkData.dana?.reduce((s: number, d: any) => s + (d.realisasi || 0), 0) || 0)}</td>
                    <td className="text-right text-sm">{rp(calkData.dana?.reduce((s: number, d: any) => s + (d.targetNominal || 0) - (d.realisasi || 0), 0) || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Catatan C: Aset Neto yang Dibebaskan dari Pembatasan */}
          <div className="bg-card border-2 border-nb-ink rounded">
            <div className="p-4 border-b-2 border-nb-ink bg-secondary/30">
              <h3 className="font-heading font-bold text-sm uppercase tracking-wider">Catatan C — Aset Neto yang Dibebaskan dari Pembatasan</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Pembebasan terjadi karena beban tertentu yang memenuhi tujuan pembatasan atau tercapainya periode waktu</p>
            </div>
            <div className="text-sm space-y-2 text-muted-foreground">
              {calkData.dana?.some((d: any) => (d.realisasi || 0) > 0) ? (
                <table className="nb-table">
                  <thead>
                    <tr><th>Dana</th><th className="text-right">Jumlah Dibebaskan</th><th>Keterangan</th></tr>
                  </thead>
                  <tbody>
                    {calkData.dana.filter((d: any) => (d.realisasi || 0) > 0).map((d: any) => (
                      <tr key={d.id}>
                        <td className="text-sm font-heading font-semibold">{d.nama}</td>
                        <td className="text-right text-sm">{rp(d.realisasi)}</td>
                        <td className="text-sm">Realisasi dana untuk kegiatan sesuai pembatasan</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="italic">Tidak ada pembebasan aset neto dari pembatasan pada periode ini.</p>
              )}
            </div>
          </div>

          {/* Catatan D: Aset Tetap */}
          <div className="bg-card border-2 border-nb-ink rounded">
            <div className="p-4 border-b-2 border-nb-ink bg-secondary/30">
              <h3 className="font-heading font-bold text-sm uppercase tracking-wider">Catatan D — Aset Tetap dan Investasi</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Rincian aset tetap per 31 Desember {tahun}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="nb-table">
                <thead>
                  <tr>
                    <th>Kode</th><th>Nama Aset</th><th>Kategori</th>
                    <th className="text-right">Harga Perolehan</th>
                    <th className="text-right">Akum. Penyusutan</th>
                    <th className="text-right">Nilai Buku</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const asetList = calkData.aset || []
                    const nonTanah = asetList.filter((a: any) => a.kategori !== 'tanah')
                    const totalHargaNonTanah = nonTanah.reduce((s: number, a: any) => s + (a.hargaPerolehan || 0), 0)
                    const totalAkum = calkData.totalAkumulasi || 0
                    const rows: any[] = []
                    let distributed = 0
                    asetList.forEach((a: any, i: number) => {
                      let akumAset = 0
                      if (a.kategori !== 'tanah' && totalHargaNonTanah > 0) {
                        const proporsi = (a.hargaPerolehan || 0) / totalHargaNonTanah
                        if (i === asetList.length - 1 || nonTanah.indexOf(a) === nonTanah.length - 1) {
                          akumAset = totalAkum - distributed
                        } else {
                          akumAset = Math.round(totalAkum * proporsi)
                          distributed += akumAset
                        }
                      }
                      rows.push({ ...a, akumAset })
                    })
                    return rows.length > 0 ? rows.map((a: any) => (
                      <tr key={a.id}>
                        <td className="text-sm font-mono">{a.kodeAset || '-'}</td>
                        <td className="text-sm font-heading font-semibold">{a.nama}</td>
                        <td className="text-sm">{a.kategori}</td>
                        <td className="text-right text-sm">{rp(a.hargaPerolehan)}</td>
                        <td className="text-right text-sm text-rose-600">{rp(a.akumAset)}</td>
                        <td className="text-right text-sm font-heading font-bold">{rp(a.hargaPerolehan - a.akumAset)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="text-center text-sm text-muted-foreground py-4">Tidak ada data aset tetap</td></tr>
                    )
                  })()}
                </tbody>
                <tfoot>
                  <tr className="bg-secondary/20 font-heading font-bold border-t-2 border-nb-ink">
                    <td colSpan={3} className="text-sm">Total</td>
                    <td className="text-right text-sm">{rp(calkData.aset?.reduce((s: number, a: any) => s + (a.hargaPerolehan || 0), 0) || 0)}</td>
                    <td className="text-right text-sm text-rose-600">{rp(calkData.totalAkumulasi || 0)}</td>
                    <td className="text-right text-sm">{rp((calkData.aset?.reduce((s: number, a: any) => s + (a.hargaPerolehan || 0), 0) || 0) - (calkData.totalAkumulasi || 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Catatan E: Beban per Program */}
          <div className="bg-card border-2 border-nb-ink rounded">
            <div className="p-4 border-b-2 border-nb-ink bg-secondary/30">
              <h3 className="font-heading font-bold text-sm uppercase tracking-wider">Catatan E — Beban Menurut Jenis</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Rincian beban yang terjadi selama periode yang berakhir 31 Desember {tahun}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="nb-table">
                <thead>
                  <tr>
                    <th>Jenis Beban</th>
                    <th className="text-right">Program Pendidikan</th>
                    <th className="text-right">Manajemen & Umum</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const bebanItems = (surplus?.items || []).filter((i: any) => i.tipe === 'pengeluaran')
                    if (bebanItems.length === 0) return (
                      <tr><td colSpan={4} className="text-center text-sm text-muted-foreground py-4">Tidak ada data beban</td></tr>
                    )
                    // Group beban by mapped category
                    const CATEGORY_MAP: Record<string, string> = {
                      'Beban Gaji & Honorer': 'Gaji dan upah',
                      'Beban ATK & Perlengkapan': 'Beban ATK & perlengkapan',
                      'Beban Listrik/Air/Telepon': 'Beban listrik, air & telepon',
                      'Beban Operasional': 'Beban kegiatan operasional',
                      'Beban Pemeliharaan': 'Beban pemeliharaan',
                      'Beban Transportasi': 'Beban transportasi',
                      'Beban Penyusutan': 'Depresiasi',
                      'Beban Lainnya': 'Lain-lain',
                    }
                    // Aggregate beban items by category
                    const grouped: Record<string, number> = {}
                    for (const item of bebanItems) {
                      const cat = CATEGORY_MAP[item.nama] || item.nama
                      grouped[cat] = (grouped[cat] || 0) + item.jumlah
                    }
                    return Object.entries(grouped).map(([cat, total]) => (
                      <tr key={cat}>
                        <td className="text-sm">{cat}</td>
                        <td className="text-right text-sm">{rp(total)}</td>
                        <td className="text-right text-sm">-</td>
                        <td className="text-right text-sm font-heading font-bold">{rp(total)}</td>
                      </tr>
                    ))
                  })()}
                </tbody>
                <tfoot>
                  <tr className="bg-secondary/20 font-heading font-bold border-t-2 border-nb-ink">
                    <td className="text-sm">Total Beban</td>
                    <td className="text-right text-sm">{rp(surplus?.totalPengeluaran || 0)}</td>
                    <td className="text-right text-sm">-</td>
                    <td className="text-right text-sm">{rp(surplus?.totalPengeluaran || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* HP PDF Modal */}
      {hpModal && hpData && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full max-w-6xl flex flex-col" style={{ height: '90dvh' }}>
            <div className="p-3 border-b-2 border-nb-ink flex items-center justify-between shrink-0">
              <h3 className="font-heading font-bold text-sm">Laporan Utang Piutang — Coretax</h3>
              <button onClick={() => setHpModal(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 min-h-0 relative">
              <Suspense fallback={
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-heading font-bold text-muted-foreground">Loading...</p>
                  </div>
                </div>
              }>
                <PDFViewer width="100%" height="100%" showToolbar={true} style={{ border: 'none' }}>
                  <LaporanHutangPiutangPDF
                    hutang={hpData.hutang}
                    piutang={hpData.piutang}
                    totalHutang={hpData.totalHutang}
                    totalPiutang={hpData.totalPiutang}
                    agingHutang={hpData.agingHutang}
                    agingPiutang={hpData.agingPiutang}
                  />
                </PDFViewer>
              </Suspense>
            </div>
          </div>
        </div>
      )}

      <PromptDialog
        open={promptCfg !== null}
        onClose={() => setPromptCfg(null)}
        onConfirm={(value) => {
          const cfg = promptCfg
          if (!cfg) return
          setPromptCfg(null)
          if (!activeUnit?.id) { setActionResult({ text: 'Pilih unit terlebih dahulu', ok: false }); return }
          setActionLoading(cfg.action); setActionResult(null)
          cfg.handler(value).then((r) => {
            setActionResult({ text: r, ok: true })
            fetchTabData(tab)
          }).catch((e) => {
            setActionResult({ text: 'Gagal: ' + e.message, ok: false })
          }).finally(() => {
            setActionLoading('')
          })
        }}
        title={promptCfg?.title}
        label={promptCfg?.label || ''}
        defaultValue={promptCfg?.defaultValue}
        mode={promptCfg?.mode}
        loading={actionLoading === promptCfg?.action}
      />
      <ConfirmDialog
        open={confirmCfg !== null}
        onClose={() => setConfirmCfg(null)}
        onConfirm={() => {
          const cfg = confirmCfg
          if (!cfg) return
          setConfirmCfg(null)
          if (!activeUnit?.id) { setActionResult({ text: 'Pilih unit terlebih dahulu', ok: false }); return }
          setActionLoading(cfg.action); setActionResult(null)
          cfg.handler().then((r) => {
            setActionResult({ text: r, ok: true })
            fetchTabData(tab)
          }).catch((e) => {
            setActionResult({ text: 'Gagal: ' + e.message, ok: false })
          }).finally(() => {
            setActionLoading('')
          })
        }}
        title={confirmCfg?.title}
        message={confirmCfg?.message || ''}
        loading={actionLoading === confirmCfg?.action}
        confirmText="Reset"
      />

    </div>
  )
}
