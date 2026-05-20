'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Transaction {
  id: string; amount: number; type: string; category: string
  date: string; note: string | null; immichAssetId: string | null
}

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Salary', 'Transfer', 'Other']

const CAT_COLORS: Record<string, string> = {
  Food: '#b2492c', Transport: '#a07212', Shopping: '#3a7d52',
  Bills: '#3548c4', Salary: '#1f8a5b', Transfer: '#0e5c3a', Other: '#7a7d76',
}

function satangToTHB(satang: number) {
  return (satang / 100).toFixed(2)
}

interface Props {
  tx: Transaction
  onSave: (updated: Transaction) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function EditTransactionSheet({ tx, onSave, onDelete, onClose }: Props) {
  const [amount, setAmount] = useState(satangToTHB(tx.amount))
  const [type, setType] = useState(tx.type)
  const [category, setCategory] = useState(tx.category)
  const [date, setDate] = useState(tx.date.split('T')[0])
  const [note, setNote] = useState(tx.note ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount), type, category, date, note }),
      })
      if (!res.ok) throw new Error('failed')
      const updated = await res.json()
      onSave({ ...updated, date: new Date(updated.date).toISOString() })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    try {
      await fetch(`/api/transactions/${tx.id}`, { method: 'DELETE' })
      onDelete(tx.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 flex flex-col justify-end"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ background: 'rgba(0,0,0,.35)' }}
      >
        <motion.div
          className="w-full rounded-t-[28px] flex flex-col"
          style={{
            background: 'var(--bg)',
            boxShadow: 'var(--shadow-sheet)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
            maxHeight: '92dvh',
            overflowY: 'auto',
          }}
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-9 h-1 rounded-full" style={{ background: 'var(--hairline)' }} />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-1 pb-4 flex-shrink-0">
            <div className="text-[18px] font-semibold text-[var(--ink)]">Edit</div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center active:opacity-70"
              style={{ background: 'var(--surface)', border: '1px solid var(--hairline)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18"/>
              </svg>
            </button>
          </div>

          <div className="px-5 flex flex-col gap-4">
            {/* Amount */}
            <div>
              <div className="text-[12px] font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Amount (THB)</div>
              <div className="flex items-center gap-2 px-3.5 py-3 rounded-2xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)' }}>
                <span className="text-[15px] font-semibold" style={{ color: 'var(--muted)' }}>฿</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  inputMode="decimal"
                  className="flex-1 bg-transparent text-[18px] font-[family-name:var(--font-mono)] font-semibold outline-none text-[var(--ink)]"
                />
              </div>
            </div>

            {/* Type toggle */}
            <div>
              <div className="text-[12px] font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Type</div>
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map(t => (
                  <button key={t} onClick={() => setType(t)}
                    className="flex-1 h-10 rounded-2xl text-[13.5px] font-medium transition-all active:scale-95"
                    style={{
                      background: type === t ? (t === 'income' ? 'var(--income-bg)' : 'var(--expense-bg)') : 'var(--surface)',
                      border: `1.5px solid ${type === t ? (t === 'income' ? 'var(--income)' : 'var(--expense)') : 'var(--hairline)'}`,
                      color: type === t ? (t === 'income' ? 'var(--income)' : 'var(--expense)') : 'var(--ink2)',
                    }}>
                    {t === 'income' ? 'Income' : 'Expense'}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <div className="text-[12px] font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Category</div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => {
                  const color = CAT_COLORS[cat] ?? 'var(--muted)'
                  const active = category === cat
                  return (
                    <button key={cat} onClick={() => setCategory(cat)}
                      className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-all active:scale-95"
                      style={{
                        background: active ? color + '18' : 'var(--surface)',
                        border: `1.5px solid ${active ? color : 'var(--hairline)'}`,
                        color: active ? color : 'var(--ink2)',
                      }}>
                      {cat}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date */}
            <div>
              <div className="text-[12px] font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Date</div>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3.5 py-3 rounded-2xl text-[14px] outline-none text-[var(--ink)]"
                style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)' }}
              />
            </div>

            {/* Note */}
            <div>
              <div className="text-[12px] font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Note</div>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Optional note…"
                className="w-full px-3.5 py-3 rounded-2xl text-[14px] outline-none text-[var(--ink)] placeholder:text-[var(--muted)]"
                style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)' }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-1 pb-1">
              {/* Delete */}
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)}
                  className="w-14 h-[52px] rounded-2xl flex items-center justify-center active:opacity-70 flex-shrink-0"
                  style={{ background: 'var(--expense-bg)', border: '1.5px solid #e9d3c6' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--expense)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                  </svg>
                </button>
              ) : (
                <button onClick={handleDelete} disabled={deleting}
                  className="w-14 h-[52px] rounded-2xl flex items-center justify-center text-[11px] font-semibold active:opacity-70 flex-shrink-0 disabled:opacity-50"
                  style={{ background: 'var(--expense)', color: '#fff' }}>
                  {deleting ? '…' : 'Sure?'}
                </button>
              )}
              {/* Save */}
              <button onClick={handleSave} disabled={saving || !amount}
                className="flex-1 h-[52px] rounded-2xl text-white text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[.97] transition-transform disabled:opacity-40"
                style={{ background: 'var(--accent)', boxShadow: '0 1px 0 rgba(255,255,255,.18) inset, 0 -1px 0 rgba(0,0,0,.15) inset, 0 2px 6px rgba(14,92,58,.25)' }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
