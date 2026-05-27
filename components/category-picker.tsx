'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export const BASE_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Salary', 'Transfer']
export const CAT_COLORS: Record<string, string> = {
  Food: '#b2492c', Transport: '#a07212', Shopping: '#3a7d52',
  Bills: '#3548c4', Salary: '#1f8a5b', Transfer: '#0e5c3a',
}
const CUSTOM_COLOR = '#7a7d76'
const LS_KEY = 'custom_categories'

function loadCustom(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') } catch { return [] }
}
function saveCustom(cats: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(cats))
}

interface Props {
  value: string
  onChange: (v: string) => void
  scrollable?: boolean
}

export function CategoryPicker({ value, onChange, scrollable = false }: Props) {
  const [custom, setCustom] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [highlighted, setHighlighted] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setCustom(loadCustom()) }, [])
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      if (anchorRef.current) {
        const rect = anchorRef.current.getBoundingClientRect()
        setDropdownPos({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 140) })
      }
    } else {
      setDropdownPos(null)
    }
  }, [open])

  // total 8 tags including base; remaining slots go to most recent custom
  const customSlots = Math.max(0, 7 - BASE_CATEGORIES.length)
  const shownCustom = custom.slice(-customSlots)
  const all = [...BASE_CATEGORIES, ...shownCustom]

  const isBase = BASE_CATEGORIES.includes(value)
  const isShownCustom = shownCustom.includes(value)
  // selected is a custom cat not visible in the tag list
  const isHiddenCustom = !isBase && !isShownCustom && value !== ''

  // autocomplete: filter all custom by input, exclude already-shown tags
  const suggestions = input.trim()
    ? custom.filter(c => c.toLowerCase().includes(input.toLowerCase()) && !shownCustom.includes(c))
    : []

  function confirm(val: string) {
    const v = val.trim()
    if (!v) return
    const list = loadCustom()
    if (!list.includes(v) && !BASE_CATEGORIES.includes(v)) {
      const updated = [...list, v]
      saveCustom(updated)
      setCustom(updated)
    } else if (list.includes(v)) {
      // move to end (most recent)
      const updated = [...list.filter(c => c !== v), v]
      saveCustom(updated)
      setCustom(updated)
    }
    onChange(v)
    setOpen(false)
    setInput('')
    setHighlighted(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlighted >= 0 && suggestions[highlighted]) {
        confirm(suggestions[highlighted])
      } else {
        confirm(input)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setInput('')
      setHighlighted(-1)
    }
  }

  const wrapClass = scrollable
    ? 'flex gap-2 overflow-x-auto pb-1 flex-nowrap'
    : 'flex flex-wrap gap-2'

  return (
    <div className={wrapClass} style={scrollable ? { scrollbarWidth: 'none' } : undefined}>
      {all.map(cat => {
        const c = CAT_COLORS[cat] ?? CUSTOM_COLOR
        const active = value === cat && !open
        return (
          <button key={cat}
            onClick={() => { onChange(cat); setOpen(false) }}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all active:scale-95 whitespace-nowrap"
            style={{
              background: active ? c + '18' : 'var(--surface)',
              border: `1.5px solid ${active ? c : 'var(--hairline)'}`,
              color: active ? c : 'var(--ink2)',
            }}>
            {cat}
          </button>
        )
      })}

      {!open ? (
        <button
          onClick={() => { setOpen(true); setInput('') }}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all active:scale-95 whitespace-nowrap"
          style={{
            background: isHiddenCustom ? CUSTOM_COLOR + '18' : 'var(--surface)',
            border: `1.5px solid ${isHiddenCustom ? CUSTOM_COLOR : 'var(--hairline)'}`,
            color: isHiddenCustom ? CUSTOM_COLOR : 'var(--ink2)',
          }}>
          {isHiddenCustom ? value : '+ Other'}
        </button>
      ) : (
        <div ref={anchorRef} className="flex-shrink-0 relative" style={{ minWidth: 0 }}>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{ border: '1.5px solid var(--accent)', background: 'var(--surface)' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); setHighlighted(-1) }}
              onKeyDown={handleKeyDown}
              placeholder="Category…"
              className="bg-transparent text-[13px] outline-none text-[var(--ink)] placeholder:text-[var(--muted)]"
              style={{ width: 100 }}
            />
            {input.trim() && (
              <button
                onMouseDown={e => { e.preventDefault(); confirm(highlighted >= 0 ? suggestions[highlighted] : input) }}
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--accent)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>
              </button>
            )}
            <button
              onMouseDown={e => { e.preventDefault(); setOpen(false); setInput(''); setHighlighted(-1) }}
              className="text-[15px] leading-none opacity-40 active:opacity-70 flex-shrink-0"
              style={{ color: 'var(--ink)' }}>
              ×
            </button>
          </div>

          {mounted && suggestions.length > 0 && dropdownPos && createPortal(
            <div
              ref={dropdownRef}
              className="rounded-xl overflow-hidden"
              style={{
                position: 'fixed',
                top: dropdownPos.top,
                left: dropdownPos.left,
                minWidth: dropdownPos.width,
                background: 'var(--surface)',
                border: '1.5px solid var(--hairline)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                zIndex: 9999,
              }}>
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  onMouseDown={e => { e.preventDefault(); confirm(s) }}
                  className="w-full text-left px-3 py-2 text-[13px] font-medium transition-colors"
                  style={{
                    background: i === highlighted ? 'var(--accent)' + '18' : 'transparent',
                    color: i === highlighted ? 'var(--accent)' : 'var(--ink2)',
                  }}>
                  {s}
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>
      )}
    </div>
  )
}
