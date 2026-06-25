import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession, requireRole } from '#/server/auth'
import { useUnit } from '#/lib/unit-context'
import { getBankAccountList, createBankAccount, updateBankAccount, deleteBankAccount } from '#/server/keuangan'
import { useState, useEffect } from 'react'
import { Plus, Pencil, X, AlertCircle, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { Combobox } from '#/components/ui/combobox'

export const Route = createFileRoute('/_dashboard/bank')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/login' })
    const { allowed } = await requireRole({ data: { minimumRole: 'admin_yayasan' } })
    if (!allowed) throw redirect({ to: '/siswa' })
  },

  component: BankPage,
})

function BankPage() {
  const { activeUnit, yayasanFilterUnitId, units } = useUnit()

  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [formError, setFormError] = useState('')
  const [formUnitId, setFormUnitId] = useState('')
  const [formData, setFormData] = useState({ namaBank: '', atasNama: '', nomorRekening: '', saldoAwal: 0, jenis: 'bank', keterangan: '' })
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const fetchData = () => {
    setLoading(true)
    setFetchError('')
    getBankAccountList({ data: { unitId: yayasanFilterUnitId } })
      .then(setList)
      .catch((err) => setFetchError(err.message || 'Gagal memuat data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [yayasanFilterUnitId])

  const openModal = (item: any) => {
    setEditItem(item)
    setFormUnitId(item ? item.unitId || '' : yayasanFilterUnitId === 'all' ? '' : yayasanFilterUnitId)
    setFormData(item ? { namaBank: item.namaBank, atasNama: item.atasNama, nomorRekening: item.nomorRekening, saldoAwal: item.saldoAwal, jenis: item.jenis || 'bank', keterangan: item.keterangan || '' } : { namaBank: '', atasNama: '', nomorRekening: '', saldoAwal: 0, jenis: 'bank', keterangan: '' })
    setFormError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!formUnitId) { setFormError('Pilih unit terlebih dahulu'); return }
    try {
      if (editItem) {
        await updateBankAccount({ data: { id: editItem.id, ...formData, unitId: formUnitId } })
      } else {
        await createBankAccount({ data: { unitId: formUnitId, ...formData, jenis: formData.jenis as any } })
      }
      setModalOpen(false)
      setEditItem(null)
      fetchData()
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data')
    }
  }

  const handleDelete = (item: any) => {
    setDeleteError('')
    setConfirmDelete({
      message: `Hapus "${item.namaBank}"? Pastikan tidak ada transaksi yang merujuk ke bank ini.`,
      onConfirm: async () => {
        try {
          await deleteBankAccount({ data: { id: item.id } })
          setConfirmDelete(null)
          fetchData()
        } catch (err: any) {
          setDeleteError(err.message || 'Gagal menghapus')
          setConfirmDelete(null)
        }
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="nb-page-header">
        <div>
          <h2 className="nb-page-title">Bank & Kas</h2>
          <p className="text-sm text-muted-foreground mt-1">Kelola rekening bank, kas tunai, dan deposito.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => openModal(null)} className="nb-btn nb-btn-primary text-sm cursor-pointer w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4" /> Tambah Baru
        </button>
      </div>

      {fetchError && (
        <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {fetchError}
          <button onClick={fetchData} className="ml-auto text-sm underline font-bold cursor-pointer">Coba Lagi</button>
        </div>
      )}
      {deleteError && (
        <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {deleteError}
          <button onClick={() => setDeleteError('')} className="ml-auto text-sm underline font-bold cursor-pointer">Tutup</button>
        </div>
      )}

      <div className="nb-table-wrapper bg-card">
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1,2,3].map((i) => <div key={i} className="h-12 bg-muted rounded border-2 border-nb-ink" />)}
          </div>
        ) : (
          <table className="nb-table">
            <thead>
              <tr>
                <th>Nama Bank</th>
                <th>Unit</th>
                <th>Atas Nama</th>
                <th>No. Rekening</th>
                <th>Jenis</th>
                <th>Saldo</th>
                <th className="w-[80px]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item: any) => (
                <tr key={item.id}>
                  <td className="font-heading font-bold text-sm">{item.namaBank}</td>
                  <td className="text-sm text-muted-foreground">{item.unit?.nama || '-'}</td>
                  <td className="text-sm">{item.atasNama || '-'}</td>
                  <td className="text-sm">{item.nomorRekening || '-'}</td>
                  <td><span className="text-sm uppercase border px-1 py-0.5 rounded-sm font-heading font-semibold">{item.jenis || 'bank'}</span></td>
                  <td className="font-heading font-bold text-sm">{new Intl.NumberFormat('id-ID').format(item.saldoAwal)}</td>
                  <td>
                    <div className="flex gap-1.5">
                      <button onClick={() => openModal(item)} className="p-1.5 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(item)} className="p-1.5 bg-card border-2 border-nb-ink rounded hover:bg-rose-100 cursor-pointer" title="Hapus">
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Belum ada data</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
          <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-md md:mx-4 shadow-lg max-h-[90dvh] flex flex-col">
            <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0">
              <h3 className="font-heading font-bold text-sm">{editItem ? 'Edit' : 'Tambah'} Rekening</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 bg-card border-2 border-nb-ink rounded hover:bg-muted-foreground/10 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 overflow-y-auto">
              {formError && <div className="p-3 bg-rose-100 border-2 border-rose-800 text-rose-800 text-sm font-semibold rounded flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{formError}</span></div>}

              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Unit</label>
                <Combobox
                  options={[{value: '', label: 'Pilih Unit...'}, ...units.map((u: any) => ({value: u.id, label: `${u.nama} (${u.jenjang})`}))]}
                  value={formUnitId}
                  onValueChange={setFormUnitId}
                  triggerClassName="nb-input"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Nama Bank / Kas</label>
                <input type="text" required value={formData.namaBank} onChange={(e) => setFormData({...formData, namaBank: e.target.value})} className="nb-input" placeholder="e.g. Bank Syariah Indonesia" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Atas Nama</label>
                <input type="text" value={formData.atasNama} onChange={(e) => setFormData({...formData, atasNama: e.target.value})} className="nb-input" placeholder="Yayasan Annahl" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">No. Rekening</label>
                <input type="text" value={formData.nomorRekening} onChange={(e) => setFormData({...formData, nomorRekening: e.target.value})} className="nb-input" placeholder="1234567890" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Jenis</label>
                <Combobox
                  options={[
                    { value: 'bank', label: 'Bank' },
                    { value: 'kas', label: 'Kas Tunai' },
                    { value: 'ems', label: 'Deposito' },
                  ]}
                  value={formData.jenis}
                  onValueChange={(v) => setFormData({...formData, jenis: v})}
                  triggerClassName="nb-input text-sm"
                  className="w-full"
                  placeholder="Pilih..."
                  searchPlaceholder="Cari..."
                  emptyMessage="Tidak ada data"
                />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Saldo Awal</label>
                <input type="number" required value={formData.saldoAwal} onChange={(e) => setFormData({...formData, saldoAwal: Number(e.target.value)})} className="nb-input" />
              </div>
              <div>
                <label className="block text-sm font-heading font-bold mb-1 uppercase">Keterangan</label>
                <input type="text" value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} className="nb-input" />
              </div>

              <div className="border-t-2 border-nb-ink pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="nb-btn nb-btn-secondary cursor-pointer w-full sm:w-auto justify-center">Batal</button>
                <button type="submit" className="nb-btn nb-btn-primary cursor-pointer w-full sm:w-auto justify-center">{editItem ? 'Simpan' : 'Tambah'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} onConfirm={() => confirmDelete?.onConfirm()} message={confirmDelete?.message || ''} />
    </div>
  )
}
