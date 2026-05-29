'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CategoryPicker } from '@/components/category-picker'

interface Book { id: string; name: string; emoji: string }

export function ManualEntryClient({ book }: { book: Book }) {
  const router = useRouter()
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amountStr, setAmountStr] = useState('')
  const [category, setCategory] = useState('Food')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDate, setShowDate] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [repeatMonthly, setRepeatMonthly] = useState(false)

  const displayAmount = amountStr || '0'
  const amountNum = parseFloat(amountStr) || 0
  const formatted = amountNum > 0
    ? amountNum.toLocaleString('en-US', { minimumFractionDigits: amountStr.includes('.') ? (amountStr.split('.')[1]?.length ?? 0) : 0, maximumFractionDigits: 2 })
    : displayAmount

  function press(key: string) {
    if (key === '⌫') {
      setAmountStr(s => s.slice(0, -1))
      return
    }
    if (key === '.') {
      if (amountStr.includes('.')) return
      setAmountStr(s => (s || '0') + '.')
      return
    }
    if (amountStr === '0') { setAmountStr(key); return }
    const [, dec] = amountStr.split('.')
    if (dec !== undefined && dec.length >= 2) return
    setAmountStr(s => s + key)
  }

  const dateLabel = (() => {
    const d = new Date(date + 'T00:00:00')
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    if (d.getTime() === today.getTime()) return 'Today'
    if (d.getTime() === yesterday.getTime()) return 'Yesterday'
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  })()

  async function handleSave() {
    if (!amountNum || saving) return
    setSaving(true)
    try {
      const payload = { bookId: book.id, amount: amountNum, type, category, date, note }
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...payload, immichAssetId: null }),
      })
      if (!res.ok) throw new Error('save failed')

      if (repeatMonthly) {
        const ruleRes = await fetch('/api/recurring', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!ruleRes.ok) throw new Error('recurring failed')
      }

      router.refresh()
      router.push(`/${book.id}/upload`)
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-2 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-70 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--hairline)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18"/>
          </svg>
        </button>
        <span className="text-[15px] font-semibold text-[var(--ink)]">New entry</span>
        <button
          className="inline-flex items-center gap-2 h-9 px-3 rounded-full text-[13.5px] font-medium"
          style={{ background: 'rgba(255,255,255,.85)', border: '1px solid var(--hairline)' }}>
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
          {book.name}
        </button>
      </div>

      {/* Type toggle */}
      <div className="flex justify-center px-4 pt-3 pb-0 flex-shrink-0">
        <div className="flex gap-0.5 p-0.5 rounded-full" style={{ background: 'var(--surface)', border: '1px solid var(--hairline)' }}>
          <button
            onClick={() => setType('expense')}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors active:opacity-80"
            style={{
              background: type === 'expense' ? 'var(--expense-bg)' : 'transparent',
              color: type === 'expense' ? 'var(--expense)' : 'var(--muted)',
            }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v15m0 0l-6-6m6 6l6-6"/>
            </svg>
            Expense
          </button>
          <button
            onClick={() => setType('income')}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors active:opacity-80"
            style={{
              background: type === 'income' ? 'var(--income-bg)' : 'transparent',
              color: type === 'income' ? 'var(--income)' : 'var(--muted)',
            }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V5m0 0l-6 6m6-6l6 6"/>
            </svg>
            Income
          </button>
        </div>
      </div>

      {/* Amount display */}
      <div className="flex flex-col items-center pt-8 pb-5 flex-shrink-0">
        <div className="text-[11.5px] font-medium tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Amount · THB</div>
        <div className="flex items-baseline gap-1">
          <span className="font-[family-name:var(--font-mono)] text-[40px] font-medium" style={{ color: 'var(--muted)' }}>฿</span>
          <span className="font-[family-name:var(--font-mono)] text-[72px] font-semibold tracking-tight leading-none" style={{ color: 'var(--ink)' }}>
            {formatted}
          </span>
          <span className="inline-block w-0.5 h-[0.85em] self-end mb-1" style={{ background: 'var(--accent)', animation: 'caret-blink 1s step-end infinite' }} />
        </div>
      </div>

      {/* Category strip */}
      <div className="flex-shrink-0 px-4 pb-3">
        <div className="text-[11.5px] font-medium tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Category</div>
        <CategoryPicker value={category} onChange={setCategory} scrollable />
      </div>

      {/* Meta rows */}
      <div className="flex-shrink-0 px-4 pb-3 flex flex-col gap-2">
        <button
          onClick={() => setShowDate(d => !d)}
          className="flex items-center justify-between px-3.5 py-3 rounded-xl active:opacity-80 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)' }}>
          <span className="text-[13px]" style={{ color: 'var(--muted)' }}>When</span>
          <div className="flex items-center gap-1.5">
            <span className="font-[family-name:var(--font-mono)] text-[14px] font-medium text-[var(--ink)]">{dateLabel}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6"/>
            </svg>
          </div>
        </button>
        {showDate && (
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3.5 py-3 rounded-xl text-[14px] outline-none text-[var(--ink)]"
            style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)' }} />
        )}
        <button
          onClick={() => setShowNote(d => !d)}
          className="flex items-center justify-between px-3.5 py-3 rounded-xl active:opacity-80 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)' }}>
          <span className="text-[13px]" style={{ color: 'var(--muted)' }}>Note</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[14px]" style={{ color: note ? 'var(--ink)' : 'var(--muted)' }}>{note || 'Add a note'}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6"/>
            </svg>
          </div>
        </button>
        {showNote && (
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="e.g. 7-Eleven, KBank transfer…"
            autoFocus
            className="px-3.5 py-3 rounded-xl text-[14px] outline-none text-[var(--ink)] placeholder:text-[var(--muted)]"
            style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)' }} />
        )}
        <button
          onClick={() => setRepeatMonthly(v => !v)}
          className="flex items-center justify-between px-3.5 py-3 rounded-xl active:opacity-80 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)' }}>
          <span className="text-[13px] flex items-center gap-2" style={{ color: 'var(--muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 2v6h6M21 12a9 9 0 1 1-3-6.7L21 8"/>
            </svg>
            Repeat monthly
          </span>
          <span className="relative inline-block w-[42px] h-[24px] rounded-full transition-colors flex-shrink-0"
            style={{ background: repeatMonthly ? 'var(--accent)' : 'var(--hairline)' }}>
            <span className="absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white transition-all"
              style={{ left: repeatMonthly ? 20 : 2, boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
          </span>
        </button>
      </div>

      {/* Keypad */}
      <div className="flex-shrink-0 pb-0" style={{ borderTop: '1px solid var(--hairline2)', background: 'var(--surface)' }}>
        <div className="grid gap-1.5 p-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k => (
            <button key={k} onClick={() => press(k)}
              className="flex items-center justify-center rounded-xl active:scale-95 transition-transform"
              style={{
                height: 48,
                background: k === '⌫' ? 'var(--hairline2)' : '#fafaf6',
                border: '1px solid var(--hairline2)',
                fontFamily: 'var(--font-mono), ui-monospace, monospace',
                fontSize: 22, fontWeight: 500, color: 'var(--ink)',
              }}>
              {k}
            </button>
          ))}
        </div>
        <div className="px-3 pb-10">
          <button
            onClick={handleSave}
            disabled={!amountNum || saving}
            className="w-full h-[52px] rounded-2xl text-white text-base font-semibold flex items-center justify-center gap-2 active:scale-[.97] transition-transform disabled:opacity-40"
            style={{ background: 'var(--accent)', boxShadow: '0 1px 0 rgba(255,255,255,.18) inset, 0 -1px 0 rgba(0,0,0,.15) inset, 0 2px 6px rgba(14,92,58,.25)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12.5l5 5L20 6.5"/>
            </svg>
            {amountNum > 0 ? `Save · ฿${amountNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Enter amount'}
          </button>
        </div>
      </div>
    </div>
  )
}
