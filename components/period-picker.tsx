'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface PeriodPickerProps {
  bookId: string
  resetDay: number
  startISO: string
  endISO: string
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}

const DAY_OPTIONS = [...Array.from({ length: 28 }, (_, i) => i + 1), 31]

function dayLabel(day: number): string {
  return day === 31 ? 'Last day' : `${ordinal(day)} of month`
}

export function PeriodPicker({ bookId, resetDay, startISO, endISO }: PeriodPickerProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric' })
  const lastDay = new Date(new Date(endISO).getTime() - 86_400_000).toISOString()

  const label =
    resetDay === 1
      ? `${new Date(startISO).toLocaleString('en-US', { month: 'long', year: 'numeric' })} · Month so far`
      : `${fmt(startISO)} – ${fmt(lastDay)} · This period`

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = Number(e.target.value)
    setSaving(true)
    const res = await fetch(`/api/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resetDay: next }),
    })
    setSaving(false)
    if (res.ok) {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <div className="px-5 mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 text-[13px] active:opacity-60 transition-opacity"
        style={{ color: 'var(--muted)' }}
      >
        {label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 flex items-center gap-2 text-[13px]" style={{ color: 'var(--muted)' }}>
          <span>Resets on the</span>
          <select
            defaultValue={resetDay}
            disabled={saving}
            onChange={handleChange}
            className="h-8 px-2 rounded-lg text-[13px] text-[var(--ink)]"
            style={{ background: 'var(--surface)', border: '1px solid var(--hairline)' }}
          >
            {DAY_OPTIONS.map(d => (
              <option key={d} value={d}>{dayLabel(d)}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
