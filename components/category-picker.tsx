'use client'
import { useState, useRef, useEffect } from 'react'

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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setCustom(loadCustom()) }, [])
  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  const isBase = BASE_CATEGORIES.includes(value)
  const isCustom = !isBase

  function confirm(val: string) {
    const v = val.trim()
    if (!v) return
    const list = loadCustom()
    if (!list.includes(v) && !BASE_CATEGORIES.includes(v)) {
      const updated = [...list, v]
      saveCustom(updated)
      setCustom(updated)
    }
    onChange(v)
    setOpen(false)
    setInput('')
  }

  const all = [...BASE_CATEGORIES, ...custom]

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

      {/* Other — shows selected custom value when closed, input when open */}
      {!open ? (
        <button
          onClick={() => { setOpen(true); setInput('') }}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all active:scale-95 whitespace-nowrap"
          style={{
            background: isCustom ? CUSTOM_COLOR + '18' : 'var(--surface)',
            border: `1.5px solid ${isCustom ? CUSTOM_COLOR : 'var(--hairline)'}`,
            color: isCustom ? CUSTOM_COLOR : 'var(--ink2)',
          }}>
          {isCustom ? value : '+ Other'}
        </button>
      ) : (
        <div className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full"
          style={{ border: '1.5px solid var(--accent)', background: 'var(--surface)', minWidth: 0 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') confirm(input)
              if (e.key === 'Escape') setOpen(false)
            }}
            placeholder="Category…"
            list="__custom_cats__"
            className="bg-transparent text-[13px] outline-none text-[var(--ink)] placeholder:text-[var(--muted)]"
            style={{ width: 100 }}
          />
          <datalist id="__custom_cats__">
            {custom.map(c => <option key={c} value={c} />)}
          </datalist>
          {input.trim() && (
            <button
              onMouseDown={e => { e.preventDefault(); confirm(input) }}
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--accent)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>
            </button>
          )}
          <button
            onMouseDown={e => { e.preventDefault(); setOpen(false) }}
            className="text-[15px] leading-none opacity-40 active:opacity-70 flex-shrink-0"
            style={{ color: 'var(--ink)' }}>
            ×
          </button>
        </div>
      )}
    </div>
  )
}
