import { useState, useRef, useEffect, useCallback } from 'react'
import { MoreHorizontal } from 'lucide-react'

interface ActionItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'danger' | 'success' | 'warning'
  show?: boolean
}

interface ActionMenuProps {
  items: ActionItem[]
  size?: 'sm' | 'md'
}

const variants: Record<string, string> = {
  default: 'text-nb-ink hover:bg-muted-foreground/10',
  danger: 'text-rose-700 hover:bg-rose-100',
  success: 'text-emerald-700 hover:bg-emerald-100',
  warning: 'text-amber-700 hover:bg-amber-100',
}

export function ActionMenu({ items, size = 'sm' }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, right: 0 })

  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (
        btnRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      ) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const visible = items.filter((i) => i.show !== false)

  if (visible.length === 0) return null

  const btnSize = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8'
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => { updatePos(); setOpen(!open) }}
        className={`${btnSize} flex items-center justify-center rounded border-2 border-nb-ink bg-card hover:bg-muted-foreground/10 cursor-pointer`}
        title="Aksi"
      >
        <MoreHorizontal className={iconSize} />
      </button>
      {open && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
          className="min-w-[160px] bg-card border-2 border-nb-ink rounded shadow-lg py-1"
        >
          {visible.map((item, i) => (
            <button
              key={i}
              onClick={() => { setOpen(false); item.onClick() }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-heading font-semibold text-left cursor-pointer ${variants[item.variant || 'default']}`}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
