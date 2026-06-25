import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search, X } from 'lucide-react'
import { cn } from '#/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Pilih...',
  searchPlaceholder = 'Cari...',
  emptyMessage = 'Tidak ada data',
  disabled = false,
  className,
  triggerClassName,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const selected = options.find((o) => o.value === value)

  const filtered = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => { if (!disabled) setOpen(!open) }}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between gap-2 p-2.5 text-sm font-heading font-semibold',
          'bg-card border-2 border-nb-ink rounded',
          'hover:bg-muted-foreground/10',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          !selected && 'text-muted-foreground',
          open && 'ring-2 ring-nb-sage',
          triggerClassName,
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={cn('w-4 h-4 shrink-0 text-nb-ink transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)} />
          <div className={cn(
            'absolute left-0 right-0 top-full mt-1.5 z-50',
            'bg-card border-2 border-nb-ink rounded',
            'shadow-[4px_4px_0px_#1A1A1A]',
            'max-h-64 flex flex-col',
          )}>
            <div className="flex items-center gap-2 p-2 border-b-2 border-nb-ink">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="flex-1 text-sm font-sans bg-transparent outline-none placeholder:text-muted-foreground/50"
              />
              {search && (
                <button onClick={() => setSearch('')} className="p-0.5 hover:bg-muted-foreground/10 rounded cursor-pointer">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1 min-h-0">
              {filtered.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center font-sans">{emptyMessage}</div>
              ) : (
                filtered.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onValueChange?.(option.value)
                      setSearch('')
                      setOpen(false)
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm font-heading font-semibold flex items-center justify-between gap-2',
                      'hover:bg-secondary/40 border-b border-nb-ink last:border-b-0',
                      option.value === value && 'bg-secondary/70 text-foreground',
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {option.value === value && <Check className="w-4 h-4 shrink-0 text-nb-sage" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
