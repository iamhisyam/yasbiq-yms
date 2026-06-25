import { useState } from 'react'
import { Bold, Italic, Heading, List, Link, Eye, Edit3 } from 'lucide-react'

function toHtml(md: string): string {
  if (!md) return ''
  return md
    .replace(/### (.+)/g, '<h3 class="text-sm font-heading font-bold mt-2 mb-1">$1</h3>')
    .replace(/## (.+)/g, '<h2 class="text-base font-heading font-bold mt-3 mb-1">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

interface RichTextEditorProps {
  value: string
  onChange: (val: string) => void
  viewMode?: boolean
  onEdit?: () => void
  placeholder?: string
  label?: string
}

export function RichTextEditor({ value, onChange, viewMode, onEdit, placeholder, label }: RichTextEditorProps) {
  const [preview, setPreview] = useState(false)
  const textarea = viewMode === true

  const insert = (before: string, after = '') => {
    const ta = document.querySelector<HTMLTextAreaElement>('.rte-textarea')
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = value.substring(start, end)
    const next = value.substring(0, start) + before + selected + after + value.substring(end)
    onChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }

  if (textarea && !onEdit) {
    return (
      <div
        className="p-3 bg-secondary/20 border-2 border-nb-ink rounded text-sm min-h-[60px] prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: toHtml(value) || '<span class="text-muted-foreground italic">Kosong</span>' }}
      />
    )
  }

  if (textarea && onEdit) {
    return (
      <div
        className="p-3 bg-secondary/20 border-2 border-nb-ink rounded text-sm min-h-[60px] cursor-pointer hover:bg-secondary/40"
        onClick={onEdit}
      >
        {value ? (
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: toHtml(value) }} />
        ) : (
          <span className="text-muted-foreground italic">Klik untuk edit</span>
        )}
      </div>
    )
  }

  return (
    <div className="border-2 border-nb-ink rounded">
      <div className="flex items-center gap-0.5 p-1 bg-secondary/30 border-b-2 border-nb-ink flex-wrap">
        <button type="button" onClick={() => insert('**', '**')} className="p-1.5 hover:bg-card rounded cursor-pointer" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={() => insert('*', '*')} className="p-1.5 hover:bg-card rounded cursor-pointer" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={() => insert('## ')} className="p-1.5 hover:bg-card rounded cursor-pointer" title="Heading"><Heading className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={() => insert('\n- ')} className="p-1.5 hover:bg-card rounded cursor-pointer" title="List"><List className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={() => insert('[', '](url)')} className="p-1.5 hover:bg-card rounded cursor-pointer" title="Link"><Link className="w-3.5 h-3.5" /></button>
        <span className="flex-1" />
        <button type="button" onClick={() => setPreview(!preview)} className={`p-1.5 rounded cursor-pointer ${preview ? 'bg-card border border-nb-ink' : 'hover:bg-card'}`} title={preview ? 'Edit' : 'Preview'}>
          {preview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
      {preview ? (
        <div className="p-3 text-sm min-h-[80px] prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: toHtml(value) || '<span class="text-muted-foreground italic">Kosong</span>' }} />
      ) : (
        <textarea
          className="rte-textarea w-full p-3 text-sm font-mono resize-y min-h-[80px] bg-card outline-none border-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Tulis konten...'}
        />
      )}
    </div>
  )
}

export function renderMarkdown(md: string): string {
  return toHtml(md)
}
