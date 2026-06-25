import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface AccordionProps {
  label: string
  jumlah: React.ReactNode
  children: React.ReactNode
  color?: string
}

export function Accordion({ label, jumlah, children, color }: AccordionProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-nb-ink/20 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted-foreground/5 cursor-pointer text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-0' : '-rotate-90'}`} />
          <span className="text-sm font-heading font-semibold truncate">{label}</span>
        </div>
        <span className={`text-sm font-heading font-bold shrink-0 ml-2 ${color || ''}`}>{jumlah}</span>
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  )
}

export function DetailRow({ label, jumlah, sublabel, color }: { label: string; jumlah: React.ReactNode; sublabel?: string; color?: string }) {
  return (
    <div className="flex items-center justify-between pl-7 pr-1 py-0.5">
      <div className="min-w-0 flex-1">
        <span className="text-sm text-muted-foreground truncate block">{label}</span>
        {sublabel && <span className="text-[11px] text-muted-foreground/60 block">{sublabel}</span>}
      </div>
      <span className={`text-sm font-heading font-semibold shrink-0 ml-2 ${color || ''}`}>{jumlah}</span>
    </div>
  )
}
