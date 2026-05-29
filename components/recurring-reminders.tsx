'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Reminder {
  id: string
  amount: number
  type: string
  category: string
  note: string | null
  merchantName: string | null
  dueDate: string
}

const CAT_COLORS: Record<string, string> = {
  Food: '#b2492c', Transport: '#a07212', Shopping: '#3a7d52',
  Bills: '#3548c4', Salary: '#1f8a5b', Transfer: '#0e5c3a', Other: '#7a7d76',
}

function satangToTHB(satang: number) {
  return (satang / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function RecurringReminders({ reminders: initial }: { reminders: Reminder[] }) {
  const [reminders, setReminders] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const router = useRouter()

  function remove(id: string) {
    setReminders(prev => prev.filter(r => r.id !== id))
    router.refresh()
  }

  async function act(id: string, path: string, method: 'POST' | 'DELETE') {
    if (busy) return
    setBusy(id)
    try {
      const res = await fetch(path, { method })
      if (!res.ok) throw new Error('failed')
      remove(id)
    } catch {
      setBusy(null)
    }
  }

  if (reminders.length === 0) return null

  return (
    <div className="flex flex-col gap-2.5">
      {reminders.map(r => {
        const color = CAT_COLORS[r.category] ?? 'var(--accent)'
        const label = r.note || r.merchantName || r.category
        const due = new Date(r.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        const isBusy = busy === r.id
        return (
          <div key={r.id} className="rounded-[18px] p-3.5"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-mid)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{ background: color + '1a', border: `1px solid ${color}33`, color }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 2v6h6M21 12a9 9 0 1 1-3-6.7L21 8"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14.5px] font-medium text-[var(--ink)] truncate">{label}</div>
                <div className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  Recurring · {r.category} · due {due}
                </div>
              </div>
              <div className="font-[family-name:var(--font-mono)] text-[14.5px] font-semibold tracking-tight flex-shrink-0"
                style={{ color: r.type === 'income' ? 'var(--income)' : 'var(--expense)' }}>
                {r.type === 'income' ? '+' : '−'}฿{satangToTHB(r.amount)}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => act(r.id, `/api/recurring/${r.id}/confirm`, 'POST')}
                disabled={isBusy}
                className="flex-1 h-10 rounded-xl text-white text-[13.5px] font-semibold flex items-center justify-center gap-1.5 active:scale-[.97] transition-transform disabled:opacity-50"
                style={{ background: 'var(--accent)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12.5l5 5L20 6.5"/>
                </svg>
                {isBusy ? 'Adding…' : `Add ฿${satangToTHB(r.amount)}`}
              </button>
              <button
                onClick={() => act(r.id, `/api/recurring/${r.id}/skip`, 'POST')}
                disabled={isBusy}
                className="h-10 px-4 rounded-xl text-[13.5px] font-medium active:opacity-70 disabled:opacity-50"
                style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', color: 'var(--ink2)' }}>
                Skip
              </button>
            </div>
            <button
              onClick={() => act(r.id, `/api/recurring/${r.id}`, 'DELETE')}
              disabled={isBusy}
              className="mt-2 text-[11.5px] font-medium active:opacity-60 disabled:opacity-50"
              style={{ color: 'var(--muted)' }}>
              Stop repeating
            </button>
          </div>
        )
      })}
    </div>
  )
}
