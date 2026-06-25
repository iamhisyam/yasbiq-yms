import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { useUnit } from '#/lib/unit-context'
import {
  getPenggajianList, getPeriodeList, prosesPenggajian, prosesThr,
  updatePenggajian, approvePenggajian, rejectPenggajian, bayarPenggajian,
  deletePenggajian, getPenggajianKomponen, createKomponen, updateKomponen,
  deleteKomponen, seedPenggajianKomponen,
} from '#/server/pegawai'
import { useState, useEffect, lazy, Suspense } from 'react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { Combobox } from '#/components/ui/combobox'
import { SlipGajiPDF } from '#/components/slip-gaji-pdf'
import {
  DollarSign, Plus, X, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, XCircle, Clock,
  Eye, Trash2, Ban, Settings, Printer,
  Check, FileText,
} from 'lucide-react'

const PDFViewer = lazy(() => import('@react-pdf/renderer').then(mod => ({ default: mod.PDFViewer })))

export const Route = createFileRoute('/_dashboard/penggajian')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'admin_yayasan' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: PenggajianPage,
})

type DetailItem = {
  id?: string
  kode: string
  nama: string
  tipe: 'penerimaan' | 'potongan'
  jumlah: number
  objekPajak: boolean
}

type KomponenForm = {
  nama: string
  tipe: 'penerimaan' | 'potongan'
  kode: string
  defaultJumlah: number
  objekPajak: boolean
  hitungOtomatis: boolean
  urutan: number
}

const EMPTY_KOMPONEN: KomponenForm = {
  nama: '', tipe: 'penerimaan', kode: '', defaultJumlah: 0,
  objekPajak: true, hitungOtomatis: false, urutan: 0,
}

function formatRupiah(n: number) {
  return `Rp${(n || 0).toLocaleString('id-ID')}`
}

function PenggajianPage() {
  const { session } = Route.useRouteContext() as any
  const { activeUnit, yayasanFilterUnitId, units } = useUnit()

  const isSuperAdmin = (session?.user as any)?.isSuperAdmin ?? false
  const isBendahara = activeUnit?.isBendahara ?? false
  const canApprove = isSuperAdmin || isBendahara

  const [tab, setTab] = useState<'gaji' | 'persetujuan' | 'komponen'>('gaji')

  // ── Data Gaji State ──
  const [list, setList] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [filterPeriode, setFilterPeriode] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [periodeList, setPeriodeList] = useState<string[]>([])

  // ── Persetujuan State ──
  const [persetujuanList, setPersetujuanList] = useState<any[]>([])
  const [persetujuanTotal, setPersetujuanTotal] = useState(0)
  const [persetujuanLoading, setPersetujuanLoading] = useState(false)
  const [persetujuanPage, setPersetujuanPage] = useState(1)
  const [persetujuanPeriode, setPersetujuanPeriode] = useState('')

  // ── Process Modal ──
  const [prosesOpen, setProsesOpen] = useState(false)
  const [prosesPeriode, setProsesPeriode] = useState('')
  const [prosesLoading, setProsesLoading] = useState(false)
  const [prosesResult, setProsesResult] = useState<any>(null)

  // ── THR Modal ──
  const [thrOpen, setThrOpen] = useState(false)
  const [thrPeriode, setThrPeriode] = useState('')
  const [thrLoading, setThrLoading] = useState(false)
  const [thrResult, setThrResult] = useState<any>(null)

  // ── Edit Detail Modal ──
  const [editItem, setEditItem] = useState<any>(null)
  const [editDetails, setEditDetails] = useState<DetailItem[]>([])
  const [editKeterangan, setEditKeterangan] = useState('')
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // ── View Detail Modal ──
  const [viewItem, setViewItem] = useState<any>(null)

  // ── Slip Gaji Modal ──
  const [slipItem, setSlipItem] = useState<any>(null)

  // ── Cetak Slip Bulk Modal ──
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set())
  const [bulkShowPdf, setBulkShowPdf] = useState(false)

  // ── Confirm Dialog ──
  const [confirmCfg, setConfirmCfg] = useState<{
    title?: string; message: string; confirmText?: string;
    variant?: 'danger' | 'default'; onConfirm: () => void; loading?: boolean
  } | null>(null)

  // ── Komponen State (Tab 3) ──
  const [komponenList, setKomponenList] = useState<any[]>([])
  const [komponenLoading, setKomponenLoading] = useState(false)
  const [komponenForm, setKomponenForm] = useState<KomponenForm>({ ...EMPTY_KOMPONEN })
  const [komponenEditId, setKomponenEditId] = useState<string | null>(null)
  const [komponenOpen, setKomponenOpen] = useState(false)
  const [komponenError, setKomponenError] = useState('')
  const [komponenSaving, setKomponenSaving] = useState(false)
  const [komponenSeeded, setKomponenSeeded] = useState(false)

  const currentMonth = new Date().toISOString().slice(0, 7)

  const komponenUnitId = yayasanFilterUnitId === 'all'
    ? (activeUnit?.id || units[0]?.id || '')
    : yayasanFilterUnitId

  // ── Fetch Data Gaji ──
  const fetchData = () => {
    setLoading(true)
    setFetchError('')
    getPenggajianList({
      data: {
        unitId: yayasanFilterUnitId,
        periode: filterPeriode || undefined,
        status: filterStatus || undefined,
        page, pageSize,
      },
    })
      .then((res) => { setList(res.data); setTotal(res.total) })
      .catch((err: any) => setFetchError(err.message || 'Gagal memuat'))
      .finally(() => setLoading(false))
  }

  // ── Fetch Persetujuan ──
  const fetchPersetujuan = () => {
    if (!canApprove) return
    setPersetujuanLoading(true)
    getPenggajianList({
      data: {
        unitId: yayasanFilterUnitId,
        periode: persetujuanPeriode || undefined,
        status: 'draft',
        page: persetujuanPage, pageSize,
      },
    })
      .then((res) => { setPersetujuanList(res.data); setPersetujuanTotal(res.total) })
      .catch(() => {})
      .finally(() => setPersetujuanLoading(false))
  }

  // ── Fetch Komponen ──
  const fetchKomponen = () => {
    if (!komponenUnitId) return
    setKomponenLoading(true)
    getPenggajianKomponen({ data: { unitId: komponenUnitId } })
      .then((res) => {
        setKomponenList(res)
        setKomponenSeeded(res.length > 0)
      })
      .catch(() => {})
      .finally(() => setKomponenLoading(false))
  }

  useEffect(() => { fetchData() }, [yayasanFilterUnitId, filterPeriode, filterStatus, page])
  useEffect(() => {
    getPeriodeList({ data: { unitId: yayasanFilterUnitId } }).then(setPeriodeList).catch(() => {})
  }, [yayasanFilterUnitId])

  useEffect(() => { fetchPersetujuan() }, [yayasanFilterUnitId, persetujuanPeriode, persetujuanPage])
  useEffect(() => { fetchKomponen() }, [komponenUnitId])

  useEffect(() => {
    if (tab === 'gaji') fetchData()
    else if (tab === 'persetujuan') fetchPersetujuan()
    else if (tab === 'komponen') fetchKomponen()
  }, [tab])

  // ── Reset page on filter change ──
  useEffect(() => { setPage(1) }, [filterPeriode, filterStatus])
  useEffect(() => { setPersetujuanPage(1) }, [persetujuanPeriode])

  const totalPages = Math.ceil(total / pageSize) || 1
  const persetujuanPages = Math.ceil(persetujuanTotal / pageSize) || 1

  // ── Handlers: Proses Penggajian ──
  const handleProses = async (e: React.FormEvent) => {
    e.preventDefault()
    const unitId = yayasanFilterUnitId === 'all' ? (activeUnit?.id || units[0]?.id) : yayasanFilterUnitId
    if (!unitId || !prosesPeriode) return
    setProsesLoading(true)
    setProsesResult(null)
    try {
      const result = await prosesPenggajian({ data: { unitId, periode: prosesPeriode } })
      setProsesResult(result)
      fetchData()
      getPeriodeList({ data: { unitId } }).then(setPeriodeList).catch(() => {})
    } catch (err: any) {
      setProsesResult({ error: err.message || 'Gagal' })
    }
    setProsesLoading(false)
  }

  // ── Handlers: THR ──
  const handleThr = async (e: React.FormEvent) => {
    e.preventDefault()
    const unitId = yayasanFilterUnitId === 'all' ? (activeUnit?.id || units[0]?.id) : yayasanFilterUnitId
    if (!unitId || !thrPeriode) return
    setThrLoading(true)
    setThrResult(null)
    try {
      const result = await prosesThr({ data: { unitId, periode: thrPeriode } })
      setThrResult(result)
      fetchData()
      getPeriodeList({ data: { unitId } }).then(setPeriodeList).catch(() => {})
    } catch (err: any) {
      setThrResult({ error: err.message || 'Gagal' })
    }
    setThrLoading(false)
  }

  // ── Handlers: Approve / Reject ──
  const handleApprove = (id: string) => {
    setConfirmCfg({
      title: 'Setujui Penggajian',
      message: 'Yakin ingin menyetujui penggajian ini?',
      confirmText: 'Setujui',
      variant: 'default',
      onConfirm: () => runApprove(id),
    })
  }

  const runApprove = async (id: string) => {
    try {
      await approvePenggajian({ data: { id } })
      fetchData(); fetchPersetujuan()
      setConfirmCfg(null)
    } catch (err: any) {
      alert(err.message || 'Gagal')
    }
  }

  const handleReject = (id: string) => {
    setConfirmCfg({
      title: 'Batalkan Persetujuan',
      message: 'Yakin ingin mengembalikan ke draft?',
      confirmText: 'Batalkan',
      variant: 'danger',
      onConfirm: () => runReject(id),
    })
  }

  const runReject = async (id: string) => {
    try {
      await rejectPenggajian({ data: { id } })
      fetchData(); fetchPersetujuan()
      setConfirmCfg(null)
    } catch (err: any) {
      alert(err.message || 'Gagal')
    }
  }

  // ── Handlers: Bayar ──
  const handleBayar = (id: string) => {
    setConfirmCfg({
      title: 'Konfirmasi Pembayaran',
      message: 'Yakin ingin menandai penggajian ini sebagai dibayar?',
      confirmText: 'Bayar',
      variant: 'default',
      onConfirm: () => runBayar(id),
    })
  }

  const runBayar = async (id: string) => {
    try {
      await bayarPenggajian({ data: { id } })
      fetchData()
      setConfirmCfg(null)
    } catch (err: any) {
      alert(err.message || 'Gagal')
    }
  }

  // ── Handlers: Delete ──
  const handleDelete = (id: string) => {
    setConfirmCfg({
      title: 'Hapus Penggajian',
      message: 'Yakin ingin menghapus data penggajian ini?',
      confirmText: 'Hapus',
      variant: 'danger',
      onConfirm: () => runDelete(id),
    })
  }

  const runDelete = async (id: string) => {
    try {
      await deletePenggajian({ data: { id } })
      fetchData(); fetchPersetujuan()
      setConfirmCfg(null)
    } catch (err: any) {
      alert(err.message || 'Gagal')
    }
  }

  // ── Handlers: Edit Detail ──
  const openEdit = (item: any) => {
    setEditItem(item)
    const details = (item.details || []).map((d: any) => ({
      id: d.id,
      kode: d.kode || '',
      nama: d.nama || '',
      tipe: d.tipe as 'penerimaan' | 'potongan',
      jumlah: d.jumlah || 0,
      objekPajak: d.objekPajak ?? (d.tipe === 'penerimaan'),
    }))
    setEditDetails(details)
    setEditKeterangan(item.keterangan || '')
    setEditError('')
  }

  const handleSaveEdit = async () => {
    if (!editItem) return
    setEditSaving(true)
    setEditError('')
    try {
      await updatePenggajian({
        data: {
          id: editItem.id,
          detailItems: editDetails.map((d) => ({
            id: d.id,
            kode: d.kode || d.nama.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `item_${Date.now()}`,
            nama: d.nama,
            tipe: d.tipe,
            jumlah: d.jumlah,
            objekPajak: d.objekPajak,
          })),
          keterangan: editKeterangan,
        },
      })
      setEditItem(null)
      fetchData()
    } catch (err: any) {
      setEditError(err.message || 'Gagal menyimpan')
    }
    setEditSaving(false)
  }

  const addDetailItem = () => {
    setEditDetails([...editDetails, {
      kode: '', nama: '', tipe: 'penerimaan', jumlah: 0, objekPajak: true,
    }])
  }

  const removeDetailItem = (idx: number) => {
    setEditDetails(editDetails.filter((_, i) => i !== idx))
  }

  const updateDetailItem = (idx: number, patch: Partial<DetailItem>) => {
    setEditDetails(editDetails.map((d, i) => i === idx ? { ...d, ...patch } : d))
  }

  // ── Komponen Handlers ──
  const openKomponenAdd = () => {
    setKomponenForm({ ...EMPTY_KOMPONEN })
    setKomponenEditId(null)
    setKomponenError('')
    setKomponenOpen(true)
  }

  const openKomponenEdit = (k: any) => {
    setKomponenForm({
      nama: k.nama, tipe: k.tipe, kode: k.kode,
      defaultJumlah: k.defaultJumlah || 0,
      objekPajak: k.objekPajak ?? true,
      hitungOtomatis: k.hitungOtomatis ?? false,
      urutan: k.urutan || 0,
    })
    setKomponenEditId(k.id)
    setKomponenError('')
    setKomponenOpen(true)
  }

  const handleKomponenSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!komponenForm.nama || !komponenForm.kode) {
      setKomponenError('Nama dan Kode wajib diisi')
      return
    }
    setKomponenSaving(true)
    setKomponenError('')
    try {
      if (komponenEditId) {
        await updateKomponen({ data: { id: komponenEditId, ...komponenForm } })
      } else {
        if (!komponenUnitId) { setKomponenError('Unit tidak ditemukan'); setKomponenSaving(false); return }
        await createKomponen({ data: { unitId: komponenUnitId, ...komponenForm } })
      }
      setKomponenOpen(false)
      fetchKomponen()
    } catch (err: any) {
      setKomponenError(err.message || 'Gagal')
    }
    setKomponenSaving(false)
  }

  const handleKomponenDelete = (id: string) => {
    setConfirmCfg({
      title: 'Hapus Komponen',
      message: 'Yakin ingin menghapus komponen ini?',
      confirmText: 'Hapus',
      variant: 'danger',
      onConfirm: () => runDeleteKomponen(id),
    })
  }

  const runDeleteKomponen = async (id: string) => {
    try {
      await deleteKomponen({ data: { id } })
      fetchKomponen()
      setConfirmCfg(null)
    } catch (err: any) {
      alert(err.message || 'Gagal')
    }
  }

  const handleSeedKomponen = async () => {
    if (!komponenUnitId) return
    try {
      await seedPenggajianKomponen({ data: { unitId: komponenUnitId } })
      fetchKomponen()
    } catch (err: any) {
      alert(err.message || 'Gagal')
    }
  }

  // ── Edit totals ──
  const editTotalPenerimaan = editDetails.filter(d => d.tipe === 'penerimaan').reduce((s, d) => s + d.jumlah, 0)
  const editTotalPotongan = editDetails.filter(d => d.tipe === 'potongan').reduce((s, d) => s + d.jumlah, 0)

  // ── Slip PDF props builder ──
  const buildSlipProps = (item: any) => {
    const details = (item.details || []).map((d: any) => ({
      tipe: d.tipe as 'penerimaan' | 'potongan',
      nama: d.nama,
      jumlah: d.jumlah || 0,
    }))
    return {
      penggajian: {
        pegawai: item.pegawai || { nama: '-', nip: '', jabatan: '', bank: '', nomorRekening: '' },
        periode: item.periode || '-',
        unit: { nama: activeUnit?.nama || '' },
      },
      details,
      totalPenerimaan: item.totalPenerimaan || 0,
      totalPotongan: item.totalPotongan || 0,
      totalDiterima: item.totalDiterima || 0,
      pph21: item.pph21 || 0,
      bpjsKaryawan: item.bpjsKaryawan || 0,
    }
  }

  // ── Bulk slip items ──
  const bulkEligible = list.filter((g) => g.status === 'disetujui' || g.status === 'dibayar')

  const toggleBulk = (id: string) => {
    setBulkSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const openBulkModal = () => {
    setBulkSelected(new Set())
    setBulkShowPdf(false)
    setBulkOpen(true)
  }

  // ── Status badge ──
  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'dibayar') return (
      <span className="inline-flex items-center gap-1 text-sm font-heading font-semibold bg-emerald-100 border border-emerald-800 text-emerald-800 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" /> Dibayar
      </span>
    )
    if (status === 'disetujui') return (
      <span className="inline-flex items-center gap-1 text-sm font-heading font-semibold bg-blue-100 border border-blue-800 text-blue-800 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" /> Disetujui
      </span>
    )
    return (
      <span className="inline-flex items-center gap-1 text-sm font-heading font-semibold bg-stone-100 border border-stone-800 text-stone-800 px-2 py-0.5 rounded-full">
        <Clock className="w-3 h-3" /> Draft
      </span>
    )
  }

  // ── Table row actions ──
  const RowActions = ({ g, forPersetujuan }: { g: any; forPersetujuan?: boolean }) => {
    if (forPersetujuan || g.status === 'draft') {
      return (
        <div className="flex gap-1">
          {!forPersetujuan && (
            <button onClick={() => openEdit(g)}
              className="text-sm bg-sky-100 hover:bg-sky-200 border-2 border-nb-ink rounded px-1.5 py-0.5 font-bold cursor-pointer"
              title="Edit">Edit</button>
          )}
          {canApprove && (
            <button onClick={() => handleApprove(g.id)}
              className="text-sm bg-emerald-100 hover:bg-emerald-200 border-2 border-nb-ink rounded px-1.5 py-0.5 font-bold cursor-pointer"
              title="Setujui"><Check className="w-3 h-3" /></button>
          )}
          <button onClick={() => handleDelete(g.id)}
            className="text-sm bg-rose-100 hover:bg-rose-200 border-2 border-nb-ink rounded px-1.5 py-0.5 font-bold cursor-pointer"
            title="Hapus"><Trash2 className="w-3 h-3" /></button>
        </div>
      )
    }
    if (g.status === 'disetujui') {
      return (
        <div className="flex gap-1">
          <button onClick={() => setViewItem(g)}
            className="text-sm bg-slate-100 hover:bg-slate-200 border-2 border-nb-ink rounded px-1.5 py-0.5 font-bold cursor-pointer"
            title="Lihat Detail"><Eye className="w-3 h-3" /></button>
          {canApprove && (
            <button onClick={() => handleReject(g.id)}
              className="text-sm bg-amber-100 hover:bg-amber-200 border-2 border-nb-ink rounded px-1.5 py-0.5 font-bold cursor-pointer"
              title="Batalkan Persetujuan"><Ban className="w-3 h-3" /></button>
          )}
          <button onClick={() => handleBayar(g.id)}
            className="text-sm bg-emerald-100 hover:bg-emerald-200 border-2 border-nb-ink rounded px-1.5 py-0.5 font-bold cursor-pointer"
            title="Bayar"><CheckCircle2 className="w-3 h-3" /></button>
          <button onClick={() => setSlipItem(g)}
            className="text-sm bg-purple-100 hover:bg-purple-200 border-2 border-nb-ink rounded px-1.5 py-0.5 font-bold cursor-pointer"
            title="Slip Gaji"><FileText className="w-3 h-3" /></button>
        </div>
      )
    }
    // dibayar
    return (
      <div className="flex gap-1">
        <button onClick={() => setViewItem(g)}
          className="text-sm bg-slate-100 hover:bg-slate-200 border-2 border-nb-ink rounded px-1.5 py-0.5 font-bold cursor-pointer"
          title="Lihat Detail"><Eye className="w-3 h-3" /></button>
        <button onClick={() => setSlipItem(g)}
          className="text-sm bg-purple-100 hover:bg-purple-200 border-2 border-nb-ink rounded px-1.5 py-0.5 font-bold cursor-pointer"
          title="Slip Gaji"><FileText className="w-3 h-3" /></button>
      </div>
    )
  }

  // ── Pagination ──
  const Pagination = ({ page, totalPages, total, count, onPrev, onNext }: {
    page: number; totalPages: number; total: number; count: number;
    onPrev: () => void; onNext: () => void;
  }) => (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-card border-2 border-nb-ink rounded p-4">
      <span className="text-sm text-muted-foreground">{count} dari {total}</span>
      <div className="flex gap-2">
        <button onClick={onPrev} disabled={page === 1}
          className="nb-btn nb-btn-secondary px-2 py-1 disabled:opacity-40 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
        <span className="font-heading text-sm flex items-center px-3 border-2 border-nb-ink rounded">{page} / {totalPages}</span>
        <button onClick={onNext} disabled={page === totalPages}
          className="nb-btn nb-btn-secondary px-2 py-1 disabled:opacity-40 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  )

  // ── Data Table ──
  const renderTable = (rows: any[], loading: boolean, actionsRenderer: (g: any) => React.ReactNode) => {
    if (loading) return <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Memuat data...</div>
    if (rows.length === 0) {
      return (
        <div className="p-12 text-center">
          <DollarSign className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
          <h3 className="font-heading font-bold text-sm">Belum Ada Data Penggajian</h3>
          <p className="text-sm text-muted-foreground mt-1">Proses penggajian untuk periode tertentu.</p>
        </div>
      )
    }
    return (
      <table className="nb-table">
        <thead>
          <tr>
            <th>Periode</th>
            <th>Pegawai</th>
            <th>Gaji Pokok</th>
            <th>Total Penerimaan</th>
            <th>Total Potongan</th>
            <th>PPh 21</th>
            <th>Total Diterima</th>
            <th>Status</th>
            <th className="w-[140px]">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g) => (
            <tr key={g.id}>
              <td className="font-heading font-bold text-sm">{g.periode}</td>
              <td>
                <div className="font-heading font-semibold text-sm">
                  <Link to="/penggajian_pegawai/$id" params={{ id: g.pegawai?.id }} className="hover:underline cursor-pointer">
                    {g.pegawai?.nama}
                  </Link>
                </div>
                <div className="text-sm text-muted-foreground">{g.pegawai?.nip || '—'}</div>
              </td>
              <td className="font-heading font-semibold text-sm">{formatRupiah(g.gajiPokok)}</td>
              <td className="text-emerald-700 font-semibold text-sm">{formatRupiah(g.totalPenerimaan)}</td>
              <td className="text-rose-700 font-semibold text-sm">{formatRupiah(g.totalPotongan)}</td>
              <td className="text-orange-700 font-semibold text-sm">{formatRupiah(g.pph21)}</td>
              <td className="font-heading font-bold text-sm">{formatRupiah(g.totalDiterima)}</td>
              <td><StatusBadge status={g.status} /></td>
              <td>{actionsRenderer(g)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // ── Combined Bulk Slip PDF ──
  const BulkSlipPDF = () => {
    const selectedItems = bulkEligible.filter(g => bulkSelected.has(g.id))
    if (selectedItems.length === 0) {
      return <div className="p-8 text-center text-sm text-muted-foreground">Pilih minimal satu slip untuk dicetak.</div>
    }
    return (
      <SlipGajiPDF
        penggajian={{
          pegawai: { nama: `${selectedItems.length} Slip Gaji`, nip: '', jabatan: '', bank: '', nomorRekening: '' },
          periode: filterPeriode || 'Semua Periode',
          unit: { nama: activeUnit?.nama || '' },
        }}
        details={selectedItems.flatMap((g, i) => [
          { tipe: 'penerimaan' as const, nama: `[${i + 1}] ${g.pegawai?.nama || '-'}`, jumlah: g.totalDiterima || 0 },
        ])}
        totalPenerimaan={selectedItems.reduce((s, g) => s + (g.totalPenerimaan || 0), 0)}
        totalPotongan={selectedItems.reduce((s, g) => s + (g.totalPotongan || 0), 0)}
        totalDiterima={selectedItems.reduce((s, g) => s + (g.totalDiterima || 0), 0)}
        pph21={selectedItems.reduce((s, g) => s + (g.pph21 || 0), 0)}
        bpjsKaryawan={selectedItems.reduce((s, g) => s + (g.bpjsKaryawan || 0), 0)}
        yayasanNama={activeUnit?.nama}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="nb-page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="nb-page-title">Penggajian</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Proses dan kelola penggajian pegawai per periode.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => {
            setProsesPeriode(currentMonth)
            setProsesResult(null)
            setProsesOpen(true)
          }} className="nb-btn nb-btn-primary cursor-pointer text-sm">
            <Plus className="w-4 h-4" /> Proses Penggajian
          </button>
          <button onClick={() => {
            setThrPeriode(`THR-${new Date().getFullYear()}`)
            setThrResult(null)
            setThrOpen(true)
          }} className="nb-btn nb-btn-secondary cursor-pointer text-sm">
            <DollarSign className="w-4 h-4" /> Generate THR
          </button>
          <button onClick={openBulkModal} disabled={bulkEligible.length === 0}
            className="nb-btn nb-btn-secondary cursor-pointer text-sm disabled:opacity-40">
            <Printer className="w-4 h-4" /> Cetak Slip
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-card border-2 border-nb-ink rounded w-fit">
        <button
          onClick={() => setTab('gaji')}
          className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'gaji' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}
        ><DollarSign className="w-3.5 h-3.5 inline mr-1.5" />Penggajian</button>
        {canApprove && (
          <button
            onClick={() => setTab('persetujuan')}
            className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'persetujuan' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}
          ><CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" />Persetujuan</button>
        )}
        <button
          onClick={() => setTab('komponen')}
          className={`px-4 py-2 text-sm font-heading font-bold rounded cursor-pointer ${tab === 'komponen' ? 'bg-secondary border-2 border-nb-ink' : 'hover:bg-muted-foreground/10'}`}
        ><Settings className="w-3.5 h-3.5 inline mr-1.5" />Komponen</button>
      </div>

      {/* ── Error banner ── */}
      {fetchError && tab === 'gaji' && (
        <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> <span>{fetchError}</span>
          <button onClick={fetchData} className="ml-auto text-sm underline font-bold cursor-pointer">Coba Lagi</button>
        </div>
      )}

      {/* ═══════ Tab 1: Penggajian ═══════ */}
      {tab === 'gaji' && (
        <>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-card border-2 border-nb-ink rounded">
            <div>
              <Combobox
                options={[{value: '', label: 'Semua Periode'}, ...periodeList.map((p) => ({value: p, label: p}))]}
                value={filterPeriode}
                onValueChange={setFilterPeriode}
                className="w-full"
              />
            </div>
            <div>
              <Combobox
                options={[
                  {value: '', label: 'Semua Status'},
                  {value: 'draft', label: 'Draft'},
                  {value: 'disetujui', label: 'Disetujui'},
                  {value: 'dibayar', label: 'Dibayar'},
                ]}
                value={filterStatus}
                onValueChange={setFilterStatus}
                className="w-full"
              />
            </div>
          </div>

          {/* Table */}
          <div className="nb-table-wrapper bg-card">
            {renderTable(list, loading, (g) => <RowActions g={g} />)}
          </div>

          {!loading && total > 0 && (
            <Pagination
              page={page} totalPages={totalPages} total={total} count={list.length}
              onPrev={() => setPage(Math.max(1, page - 1))}
              onNext={() => setPage(Math.min(totalPages, page + 1))}
            />
          )}
        </>
      )}

      {/* ═══════ Tab 2: Persetujuan ═══════ */}
      {tab === 'persetujuan' && canApprove && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-card border-2 border-nb-ink rounded">
            <div>
              <Combobox
                options={[{value: '', label: 'Semua Periode'}, ...periodeList.map((p) => ({value: p, label: p}))]}
                value={persetujuanPeriode}
                onValueChange={setPersetujuanPeriode}
                className="w-full"
              />
            </div>
          </div>

          <div className="nb-table-wrapper bg-card">
            {renderTable(persetujuanList, persetujuanLoading, (g) => <RowActions g={g} forPersetujuan />)}
          </div>

          {!persetujuanLoading && persetujuanTotal > 0 && (
            <Pagination
              page={persetujuanPage} totalPages={persetujuanPages} total={persetujuanTotal} count={persetujuanList.length}
              onPrev={() => setPersetujuanPage(Math.max(1, persetujuanPage - 1))}
              onNext={() => setPersetujuanPage(Math.min(persetujuanPages, persetujuanPage + 1))}
            />
          )}
        </>
      )}

      {/* ═══════ Tab 3: Komponen ═══════ */}
      {tab === 'komponen' && (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Template komponen gaji untuk unit ini.</p>
            <div className="flex gap-2">
              {!komponenSeeded && (
                <button onClick={handleSeedKomponen} className="nb-btn nb-btn-secondary cursor-pointer text-sm">
                  <Settings className="w-3.5 h-3.5" /> Seed Default
                </button>
              )}
              <button onClick={openKomponenAdd} className="nb-btn nb-btn-primary cursor-pointer text-sm">
                <Plus className="w-3.5 h-3.5" /> Tambah Komponen
              </button>
            </div>
          </div>

          <div className="nb-table-wrapper bg-card">
            {komponenLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Memuat data...</div>
            ) : komponenList.length === 0 ? (
              <div className="p-12 text-center">
                <Settings className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
                <h3 className="font-heading font-bold text-sm">Belum Ada Komponen</h3>
                <p className="text-sm text-muted-foreground mt-1">Tambah atau seed komponen gaji.</p>
              </div>
            ) : (
              <table className="nb-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Tipe</th>
                    <th>Default</th>
                    <th>Objek Pajak</th>
                    <th>Hitung Otomatis</th>
                    <th>Aktif</th>
                    <th className="w-[80px]">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {komponenList.map((k) => (
                    <tr key={k.id}>
                      <td>
                        <div className="font-heading font-semibold text-sm">{k.nama}</div>
                        <div className="text-sm text-muted-foreground">{k.kode}</div>
                      </td>
                      <td>
                        <span className={`inline-flex text-sm font-heading font-semibold px-2 py-0.5 rounded-full border ${
                          k.tipe === 'penerimaan' ? 'bg-emerald-100 border-emerald-700 text-emerald-800' : 'bg-rose-100 border-rose-700 text-rose-800'
                        }`}>{k.tipe === 'penerimaan' ? 'Penerimaan' : 'Potongan'}</span>
                      </td>
                      <td className="font-heading font-semibold text-sm">{formatRupiah(k.defaultJumlah)}</td>
                      <td className="text-sm">{k.objekPajak ? 'Ya' : 'Tidak'}</td>
                      <td className="text-sm">{k.hitungOtomatis ? 'Ya' : 'Tidak'}</td>
                      <td className="text-sm">{k.aktif !== false ? 'Ya' : 'Tidak'}</td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => openKomponenEdit(k)}
                            className="text-sm bg-sky-100 hover:bg-sky-200 border-2 border-nb-ink rounded px-1.5 py-0.5 font-bold cursor-pointer"
                            title="Edit">Edit</button>
                          <button onClick={() => handleKomponenDelete(k.id)}
                            className="text-sm bg-rose-100 hover:bg-rose-200 border-2 border-nb-ink rounded px-1.5 py-0.5 font-bold cursor-pointer"
                            title="Hapus"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ═══════ MODALS ═══════ */}

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

      {/* Proses Penggajian Modal */}
      {prosesOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-sm md:mx-4 shadow-lg">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Proses Penggajian</h3>
              <button onClick={() => setProsesOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleProses} className="p-4 md:p-6 space-y-4">
              {prosesResult && (
                <div className={`p-3 text-sm font-semibold rounded flex items-center gap-2 ${
                  prosesResult.error ? 'bg-rose-100 border-2 border-rose-800 text-rose-800'
                    : 'bg-emerald-100 border-2 border-emerald-800 text-emerald-800'
                }`}>
                  {prosesResult.error ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>{prosesResult.error || `${prosesResult.created} pegawai diproses, ${prosesResult.skipped} sudah ada`}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Periode (Bulan-Tahun)</label>
                <input type="month" required value={prosesPeriode}
                  onChange={(e) => setProsesPeriode(e.target.value)}
                  className="nb-input" />
              </div>
              <p className="text-sm text-muted-foreground">
                Sistem akan membuat data gaji untuk seluruh pegawai aktif berdasarkan gaji pokok yang telah ditetapkan.
              </p>
              <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setProsesOpen(false)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="submit" disabled={prosesLoading}
                  className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center disabled:opacity-50">
                  {prosesLoading ? 'Memproses...' : 'Proses'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* THR Modal */}
      {thrOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-sm md:mx-4 shadow-lg">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Generate THR</h3>
              <button onClick={() => setThrOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleThr} className="p-4 md:p-6 space-y-4">
              {thrResult && (
                <div className={`p-3 text-sm font-semibold rounded flex items-center gap-2 ${
                  thrResult.error ? 'bg-rose-100 border-2 border-rose-800 text-rose-800'
                    : 'bg-emerald-100 border-2 border-emerald-800 text-emerald-800'
                }`}>
                  {thrResult.error ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>{thrResult.error || `${thrResult.created} pegawai diproses, ${thrResult.skipped} sudah ada`}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Label Periode THR</label>
                <input type="text" required value={thrPeriode}
                  onChange={(e) => setThrPeriode(e.target.value)}
                  placeholder="THR-2025"
                  className="nb-input" />
              </div>
              <p className="text-sm text-muted-foreground">
                Sistem akan membuat data THR untuk seluruh pegawai aktif berdasarkan masa kerja dan gaji pokok.
              </p>
              <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setThrOpen(false)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="submit" disabled={thrLoading}
                  className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center disabled:opacity-50">
                  {thrLoading ? 'Memproses...' : 'Generate THR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Detail Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-start justify-center z-[9999] pt-[5vh] overflow-y-auto">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-xl md:mx-4 shadow-lg my-4">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0 sticky top-0 z-10">
              <h3 className="font-heading font-bold text-sm">Edit Penggajian — {editItem.periode}</h3>
              <button onClick={() => setEditItem(null)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> <span>{editError}</span>
                </div>
              )}
              <div className="text-sm p-3 bg-muted/30 border-2 border-nb-ink rounded">
                <span className="font-heading font-bold">{editItem.pegawai?.nama}</span>
                <span className="text-muted-foreground"> — NIP: {editItem.pegawai?.nip || '—'} — Jabatan: {editItem.pegawai?.jabatan || '—'}</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-heading font-bold text-sm uppercase tracking-wider">Rincian Gaji</h4>
                  <button type="button" onClick={addDetailItem}
                    className="text-sm bg-emerald-100 hover:bg-emerald-200 border-2 border-nb-ink rounded px-2 py-0.5 font-bold cursor-pointer flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Tambah Item
                  </button>
                </div>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {editDetails.map((d, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 bg-muted/20 border-2 border-nb-ink rounded">
                      <select
                        value={d.tipe}
                        onChange={(e) => updateDetailItem(idx, { tipe: e.target.value as 'penerimaan' | 'potongan', objekPajak: e.target.value === 'penerimaan' })}
                        className="col-span-3 nb-input text-sm !py-1"
                      >
                        <option value="penerimaan">Penerimaan</option>
                        <option value="potongan">Potongan</option>
                      </select>
                      <input
                        value={d.nama}
                        onChange={(e) => updateDetailItem(idx, { nama: e.target.value })}
                        placeholder="Nama item"
                        className="col-span-4 nb-input text-sm !py-1"
                      />
                      <input
                        type="number"
                        value={d.jumlah || ''}
                        onChange={(e) => updateDetailItem(idx, { jumlah: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className="col-span-3 nb-input text-sm !py-1"
                      />
                      <button type="button" onClick={() => removeDetailItem(idx)}
                        className="col-span-2 text-sm bg-rose-100 hover:bg-rose-200 border-2 border-nb-ink rounded px-1 py-0.5 font-bold cursor-pointer flex items-center justify-center gap-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {editDetails.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Belum ada item rincian. Klik "Tambah Item" untuk menambahkan.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 border-2 border-nb-ink rounded">
                <div className="text-sm font-heading font-bold text-emerald-700">
                  Total Penerimaan: {formatRupiah(editTotalPenerimaan)}
                </div>
                <div className="text-sm font-heading font-bold text-rose-700">
                  Total Potongan: {formatRupiah(editTotalPotongan)}
                </div>
                <div className="text-sm font-heading font-bold col-span-2 text-nb-ink">
                  Total Diterima: {formatRupiah(editTotalPenerimaan - editTotalPotongan)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Keterangan</label>
                <textarea value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className="nb-input h-16 resize-none" />
              </div>

              <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setEditItem(null)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="button" onClick={handleSaveEdit} disabled={editSaving}
                  className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center disabled:opacity-50">
                  {editSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-start justify-center z-[9999] pt-[5vh] overflow-y-auto">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-lg md:mx-4 shadow-lg my-4">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0 sticky top-0 z-10">
              <h3 className="font-heading font-bold text-sm">Detail Penggajian — {viewItem.periode}</h3>
              <button onClick={() => setViewItem(null)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div className="text-sm p-3 bg-muted/30 border-2 border-nb-ink rounded">
                <div className="font-heading font-bold">{viewItem.pegawai?.nama}</div>
                <div className="text-muted-foreground">NIP: {viewItem.pegawai?.nip || '—'} — Jabatan: {viewItem.pegawai?.jabatan || '—'}</div>
                <div className="text-muted-foreground mt-1">Status: <StatusBadge status={viewItem.status} /></div>
              </div>

              <div>
                <h4 className="font-heading font-bold text-sm uppercase tracking-wider mb-2 text-emerald-700">Penerimaan</h4>
                <div className="space-y-1">
                  {(viewItem.details || []).filter((d: any) => d.tipe === 'penerimaan').map((d: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm py-1.5 px-2 border-b border-nb-ink/20">
                      <span>{d.nama}</span>
                      <span className="font-heading font-semibold">{formatRupiah(d.jumlah)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-heading font-bold py-1.5 px-2 bg-emerald-50 border-2 border-nb-ink rounded">
                    <span>Total Penerimaan</span>
                    <span>{formatRupiah(viewItem.totalPenerimaan)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-heading font-bold text-sm uppercase tracking-wider mb-2 text-rose-700">Potongan</h4>
                <div className="space-y-1">
                  {(viewItem.details || []).filter((d: any) => d.tipe === 'potongan').map((d: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm py-1.5 px-2 border-b border-nb-ink/20">
                      <span>{d.nama}{d.objekPajak ? '' : ' (non-pajak)'}</span>
                      <span className="font-heading font-semibold">{formatRupiah(d.jumlah)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-heading font-bold py-1.5 px-2 bg-rose-50 border-2 border-nb-ink rounded">
                    <span>Total Potongan</span>
                    <span>{formatRupiah(viewItem.totalPotongan)}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-nb-ink/10 border-2 border-nb-ink rounded flex justify-between text-sm font-heading font-bold">
                <span>Total Diterima</span>
                <span>{formatRupiah(viewItem.totalDiterima)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>PPh 21: <span className="font-semibold text-nb-ink">{formatRupiah(viewItem.pph21)}</span></div>
                <div>BPJS Karyawan: <span className="font-semibold text-nb-ink">{formatRupiah(viewItem.bpjsKaryawan)}</span></div>
                <div>BPJS Perusahaan: <span className="font-semibold text-nb-ink">{formatRupiah(viewItem.bpjsPerusahaan)}</span></div>
                <div>Tanggal Bayar: <span className="font-semibold text-nb-ink">{viewItem.tanggalBayar || '—'}</span></div>
              </div>

              <div className="border-t-2 border-nb-ink pt-4 flex justify-end">
                <button type="button" onClick={() => setViewItem(null)} className="nb-btn nb-btn-secondary cursor-pointer">Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slip Gaji Modal */}
      {slipItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-[800px] md:mx-4 shadow-lg max-h-[90vh] flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Slip Gaji — {slipItem.pegawai?.nama} ({slipItem.periode})</h3>
              <button onClick={() => setSlipItem(null)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-hidden" style={{ minHeight: '600px' }}>
              <Suspense fallback={<div className="p-12 text-center text-sm text-muted-foreground animate-pulse">Memuat PDF Viewer...</div>}>
                <PDFViewer width="100%" height="600px" showToolbar>
                  <SlipGajiPDF {...buildSlipProps(slipItem)} yayasanNama={activeUnit?.nama} />
                </PDFViewer>
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Cetak Slip Modal */}
      {bulkOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-[900px] md:mx-4 shadow-lg max-h-[90vh] flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">Cetak Slip Gaji</h3>
              <button onClick={() => { setBulkOpen(false); setBulkShowPdf(false) }} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            {!bulkShowPdf ? (
              <>
                <div className="p-4 max-h-[50vh] overflow-y-auto">
                  <table className="nb-table">
                    <thead>
                      <tr>
                        <th className="w-10">#</th>
                        <th>Periode</th>
                        <th>Pegawai</th>
                        <th>Total Diterima</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkEligible.map((g) => (
                        <tr key={g.id} className="cursor-pointer hover:bg-muted/30" onClick={() => toggleBulk(g.id)}>
                          <td>
                            <input type="checkbox" checked={bulkSelected.has(g.id)} readOnly
                              className="w-4 h-4 accent-nb-ink" />
                          </td>
                          <td className="font-heading font-bold text-sm">{g.periode}</td>
                          <td className="text-sm">{g.pegawai?.nama}</td>
                          <td className="font-heading font-bold text-sm">{formatRupiah(g.totalDiterima)}</td>
                          <td><StatusBadge status={g.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {bulkEligible.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">Tidak ada slip yang tersedia untuk dicetak.</p>
                  )}
                </div>
                <div className="border-t-2 border-nb-ink p-4 shrink-0 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{bulkSelected.size} slip dipilih</span>
                  <div className="flex gap-3">
                    <button onClick={() => { setBulkOpen(false); setBulkShowPdf(false) }}
                      className="nb-btn nb-btn-secondary cursor-pointer text-sm">Batal</button>
                    <button onClick={() => setBulkShowPdf(true)} disabled={bulkSelected.size === 0}
                      className="nb-btn nb-btn-primary cursor-pointer text-sm disabled:opacity-50">
                      <Printer className="w-3.5 h-3.5" /> Cetak
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-hidden" style={{ minHeight: '600px' }}>
                <Suspense fallback={<div className="p-12 text-center text-sm text-muted-foreground animate-pulse">Memuat PDF Viewer...</div>}>
                  <PDFViewer width="100%" height="600px" showToolbar>
                    <BulkSlipPDF />
                  </PDFViewer>
                </Suspense>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Komponen Modal */}
      {komponenOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-sm md:mx-4 shadow-lg">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">{komponenEditId ? 'Edit Komponen' : 'Tambah Komponen'}</h3>
              <button onClick={() => setKomponenOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleKomponenSave} className="p-4 md:p-6 space-y-4">
              {komponenError && (
                <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> <span>{komponenError}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Nama</label>
                <input value={komponenForm.nama} onChange={(e) => setKomponenForm({ ...komponenForm, nama: e.target.value, kode: komponenForm.kode || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') })}
                  className="nb-input" placeholder="Contoh: Tunjangan Transport" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Kode</label>
                <input value={komponenForm.kode} onChange={(e) => setKomponenForm({ ...komponenForm, kode: e.target.value })}
                  className="nb-input" placeholder="tunjangan_transport" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Tipe</label>
                <select value={komponenForm.tipe} onChange={(e) => setKomponenForm({ ...komponenForm, tipe: e.target.value as 'penerimaan' | 'potongan' })}
                  className="nb-input">
                  <option value="penerimaan">Penerimaan</option>
                  <option value="potongan">Potongan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Default Jumlah</label>
                <input type="number" value={komponenForm.defaultJumlah || ''} onChange={(e) => setKomponenForm({ ...komponenForm, defaultJumlah: parseInt(e.target.value) || 0 })}
                  className="nb-input" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase tracking-wider">Urutan</label>
                <input type="number" value={komponenForm.urutan || ''} onChange={(e) => setKomponenForm({ ...komponenForm, urutan: parseInt(e.target.value) || 0 })}
                  className="nb-input" placeholder="0" />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={komponenForm.objekPajak} onChange={(e) => setKomponenForm({ ...komponenForm, objekPajak: e.target.checked })}
                    className="w-4 h-4 accent-nb-ink" />
                  <span className="text-sm font-heading font-bold">Objek Pajak</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={komponenForm.hitungOtomatis} onChange={(e) => setKomponenForm({ ...komponenForm, hitungOtomatis: e.target.checked })}
                    className="w-4 h-4 accent-nb-ink" />
                  <span className="text-sm font-heading font-bold">Hitung Otomatis</span>
                </label>
              </div>
              <div className="border-t-2 border-nb-ink pt-4 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setKomponenOpen(false)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="submit" disabled={komponenSaving}
                  className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center disabled:opacity-50">
                  {komponenSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
