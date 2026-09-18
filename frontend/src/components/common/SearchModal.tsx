import { useEffect, useMemo, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { CornerDownLeft, Search } from 'lucide-react'

export interface SearchItem {
  id: string
  label: string
  sub: string
  icon: string
  to: string
}

interface SearchModalProps {
  open: boolean
  onClose: () => void
  items: SearchItem[]
  iconMap: Record<string, LucideIcon>
  placeholder: string
  onSelect: (to: string) => void
  footer?: React.ReactNode
}

export default function SearchModal({
  open,
  onClose,
  items,
  iconMap,
  placeholder,
  onSelect,
  footer,
}: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items.slice(0, 8)
    return items
      .filter((i) => i.label.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q))
      .slice(0, 8)
  }, [items, query])

  // Reset + focus on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Keyboard navigation
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      onSelect(results[active].to)
      onClose()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 anim-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-line overflow-hidden anim-pop-in">
        <div className="flex items-center gap-3 px-4 h-13 py-3.5 border-b border-line">
          <Search size={17} className="text-muted shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-muted"
            aria-label="Search"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-line bg-cream text-muted">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">No results for “{query}”</p>
          ) : (
            results.map((item, idx) => {
              const Icon = iconMap[item.icon] ?? Search
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => {
                    onSelect(item.to)
                    onClose()
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    idx === active ? 'bg-lavender-soft' : 'hover:bg-cream/60'
                  }`}
                >
                  <span
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      idx === active ? 'bg-lavender text-white' : 'bg-cream text-muted'
                    }`}
                  >
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink truncate">{item.label}</span>
                    <span className="block text-xs text-muted truncate">{item.sub}</span>
                  </span>
                  {idx === active && <CornerDownLeft size={14} className="text-muted shrink-0" aria-hidden="true" />}
                </button>
              )
            })
          )}
        </div>

        {footer && <div className="border-t border-line">{footer}</div>}
      </div>
    </div>
  )
}
