import { X, AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText, cancelText, loading }: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-3xl flex items-center justify-center z-[9999]">
      <div className="bg-card border-2 md:border-4 border-nb-ink rounded-lg w-full md:max-w-sm md:mx-4 shadow-lg">
        <div className="bg-secondary p-3 md:p-4 border-b-2 md:border-b-4 border-nb-ink flex justify-between items-center shrink-0 rounded-t-lg">
          <h3 className="font-heading font-bold text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            {title || 'Konfirmasi'}
          </h3>
          <button onClick={onClose} className="p-1 bg-card border-2 border-nb-ink rounded cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 md:p-6">
          <p className="text-sm text-foreground">{message}</p>
        </div>
        <div className="border-t-2 border-nb-ink p-4 shrink-0 flex gap-3 justify-end bg-card rounded-b-lg">
          <button onClick={onClose} className="nb-btn nb-btn-secondary cursor-pointer px-4 py-1.5 text-sm">
            {cancelText || 'Batal'}
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="nb-btn nb-btn-primary cursor-pointer px-4 py-1.5 text-sm bg-rose-600 hover:bg-rose-700 border-rose-800 disabled:opacity-50">
            {loading ? 'Memproses...' : (confirmText || 'Hapus')}
          </button>
        </div>
      </div>
    </div>
  )
}
