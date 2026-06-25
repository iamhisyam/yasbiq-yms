import { X, Edit3 } from 'lucide-react'
import { useState } from 'react'

interface PromptDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (value: string) => void
  title?: string
  label: string
  defaultValue?: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
  mode?: 'text' | 'month'
}

const MONTHS = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
]

export function PromptDialog({ open, onClose, onConfirm, title, label, defaultValue, confirmText, cancelText, loading, mode }: PromptDialogProps) {
  const now = new Date()
  const initialYear = defaultValue ? defaultValue.slice(0, 4) : String(now.getFullYear())
  const initialMonth = defaultValue ? defaultValue.slice(5, 7) : String(now.getMonth() + 1).padStart(2, '0')
  const [value, setValue] = useState(mode === 'month' ? '' : (defaultValue || ''))
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)

  if (!open) return null

  const handleConfirm = () => {
    if (mode === 'month') {
      if (year && month) onConfirm(`${year}-${month}`)
    } else {
      if (value.trim()) onConfirm(value.trim())
    }
  }

  const isValid = mode === 'month' ? !!(year && month) : !!value.trim()

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
      <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-sm md:mx-4 shadow-lg">
        <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0 rounded-t-lg">
          <h3 className="font-heading font-bold text-sm flex items-center gap-2">
            <Edit3 className="w-4 h-4 shrink-0" />
            {title || 'Input'}
          </h3>
          <button onClick={onClose} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 md:p-6 space-y-3">
          {mode === 'month' ? (
            <>
              <label className="block text-sm font-heading font-bold">{label}</label>
              <div className="flex gap-2">
                <select value={year} onChange={(e) => setYear(e.target.value)} className="nb-input text-sm flex-1">
                  {Array.from({ length: 11 }, (_, i) => now.getFullYear() - 5 + i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select value={month} onChange={(e) => setMonth(e.target.value)} className="nb-input text-sm flex-1">
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <label className="block text-sm font-heading font-bold">{label}</label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="nb-input w-full text-sm"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && isValid) handleConfirm() }}
              />
            </>
          )}
        </div>
        <div className="border-t-2 border-nb-ink p-4 shrink-0 flex gap-3 justify-end bg-card rounded-b-lg">
          <button onClick={onClose} className="nb-btn nb-btn-secondary cursor-pointer px-4 py-1.5 text-sm">
            {cancelText || 'Batal'}
          </button>
          <button onClick={handleConfirm} disabled={loading || !isValid}
            className="nb-btn nb-btn-primary cursor-pointer px-4 py-1.5 text-sm disabled:opacity-50">
            {loading ? 'Memproses...' : (confirmText || 'Konfirmasi')}
          </button>
        </div>
      </div>
    </div>
  )
}
