'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getThumbnailUrl } from '@/lib/immich'
import { TabBar } from '@/components/tab-bar'
import { EditTransactionSheet } from '@/components/edit-transaction-sheet'
import { isNaturalLanguage, filtersToParams } from '@/lib/search'
import type { AiSearchFilters } from '@/lib/search'

interface Book { id: string; name: string; emoji: string }
interface Transaction {
  id: string; amount: number; type: string; category: string
  date: string; note: string | null; immichAssetId: string | null
}

const CAT_COLORS: Record<string, string> = {
  Food: '#b2492c', Transport: '#a07212', Shopping: '#3a7d52',
  Bills: '#3548c4', Salary: '#1f8a5b', Transfer: '#0e5c3a', Other: '#7a7d76',
}

function satangToTHB(satang: number) {
  return (satang / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function groupByDay(txs: Transaction[]) {
  const map = new Map<string, Transaction[]>()
  for (const tx of txs) {
    const key = tx.date.split('T')[0]
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(tx)
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
}

function dayLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.getTime() === today.getTime()) return `Today · ${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`
  if (d.getTime() === yesterday.getTime()) return `Yesterday · ${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })
}

export function HistoryClient({ book, transactions: initial, allCategories, query, initialAiMode }: { book: Book; transactions: Transaction[]; allCategories: string[]; query: string; initialAiMode: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState(query)
  const [activeType, setActiveType] = useState<'all' | 'income' | 'expense'>('all')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [txs, setTxs] = useState(initial)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMode, setAiMode] = useState(initialAiMode)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setTxs(initial) }, [initial])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function applyFilters(q: string, type: 'all' | 'income' | 'expense', cat: string | null, extraParams?: URLSearchParams) {
    const params = extraParams ? new URLSearchParams(extraParams) : new URLSearchParams()
    if (q) params.set('q', q)
    if (type === 'expense') params.set('type', 'expense')
    else if (type === 'income') params.set('type', 'income')
    if (cat) params.set('category', cat)
    startTransition(() => router.replace(`${pathname}?${params.toString()}`))
  }

  const runAiSearch = useCallback(async (q: string, type: 'all' | 'income' | 'expense', cat: string | null) => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/search/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      if (!res.ok) throw new Error('failed')
      const filters = await res.json() as AiSearchFilters
      const aiParams = filtersToParams(filters)
      setAiMode(true)
      applyFilters(q, type, cat, aiParams)
    } catch {
      setAiMode(false)
      applyFilters(q, type, cat)
    } finally {
      setAiLoading(false)
    }
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!value.trim()) {
      setAiMode(false)
      applyFilters('', activeType, activeCategory)
      return
    }

    if (isNaturalLanguage(value)) {
      debounceRef.current = setTimeout(() => {
        runAiSearch(value, activeType, activeCategory)
      }, 500)
    } else {
      setAiMode(false)
      applyFilters(value, activeType, activeCategory)
    }
  }

  function handleSaved(updated: Transaction) {
    setTxs(prev => prev.map(t => t.id === updated.id ? updated : t))
    setEditing(null)
    router.refresh()
  }

  function handleDeleted(id: string) {
    setTxs(prev => prev.filter(t => t.id !== id))
    setEditing(null)
    router.refresh()
  }

  const grouped = groupByDay(txs)

  return (
    <main className="min-h-screen flex flex-col relative" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[24px] font-semibold tracking-tight text-[var(--ink)]">History</div>
          <Link href={`/${book.id}/upload`}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--hairline)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h3l1.5-2h6l1.5 2h3A1.5 1.5 0 0 1 21 7.5v10A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-10Z"/><circle cx="12" cy="13" r="3.5"/>
            </svg>
          </Link>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="var(--muted)" strokeWidth="1.6" strokeLinecap="round"
            style={{ animation: aiLoading ? 'pulse 1s ease-in-out infinite' : 'none' }}>
            <circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>
          </svg>
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search merchants, notes, ฿amount…"
            className="flex-1 bg-transparent text-[14px] outline-none text-[var(--ink)] placeholder:text-[var(--muted)]"
          />
          {aiMode && !aiLoading && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'var(--ink)', color: '#fff', fontFamily: 'var(--font-mono)' }}>
              ✦ AI
            </span>
          )}
          {search && (
            <button onClick={() => { setSearch(''); setAiMode(false); applyFilters('', activeType, activeCategory) }}
              className="text-[11px] px-1.5 py-0.5 rounded font-[family-name:var(--font-mono)]"
              style={{ color: 'var(--muted)', background: 'var(--hairline2)' }}>
              ×
            </button>
          )}
        </div>

        {/* Type row */}
        <div className="flex gap-1.5 mb-2">
          <button
            onClick={() => {
              setActiveType('all')
              if (aiMode) runAiSearch(search, 'all', activeCategory)
              else applyFilters(search, 'all', activeCategory)
            }}
            className="px-3 py-1.5 rounded-full text-[12.5px] font-medium whitespace-nowrap active:opacity-80 transition-opacity flex-shrink-0"
            style={{
              background: activeType === 'all' ? 'var(--ink)' : 'transparent',
              color: activeType === 'all' ? '#fff' : 'var(--ink2)',
              border: `1px solid ${activeType === 'all' ? 'var(--ink)' : 'var(--hairline)'}`,
            }}>
            All
          </button>
          <button
            onClick={() => {
              setActiveType('income')
              if (aiMode) runAiSearch(search, 'income', activeCategory)
              else applyFilters(search, 'income', activeCategory)
            }}
            className="flex-1 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap active:opacity-80 transition-opacity"
            style={{
              background: activeType === 'income' ? 'var(--income)' : 'transparent',
              color: activeType === 'income' ? '#fff' : 'var(--ink2)',
              border: `1px solid ${activeType === 'income' ? 'var(--income)' : 'var(--hairline)'}`,
            }}>
            Income
          </button>
          <button
            onClick={() => {
              setActiveType('expense')
              if (aiMode) runAiSearch(search, 'expense', activeCategory)
              else applyFilters(search, 'expense', activeCategory)
            }}
            className="flex-1 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap active:opacity-80 transition-opacity"
            style={{
              background: activeType === 'expense' ? 'var(--expense)' : 'transparent',
              color: activeType === 'expense' ? '#fff' : 'var(--ink2)',
              border: `1px solid ${activeType === 'expense' ? 'var(--expense)' : 'var(--hairline)'}`,
            }}>
            Expense
          </button>
        </div>

        {/* Category row — always all categories */}
        {allCategories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {allCategories.map((cat) => {
              const active = activeCategory === cat
              return (
                <button key={cat}
                  onClick={() => {
                    const next = active ? null : cat
                    setActiveCategory(next)
                    if (aiMode) runAiSearch(search, activeType, next)
                    else applyFilters(search, activeType, next)
                  }}
                  className="px-2.5 py-1.5 rounded-full text-[12.5px] font-medium whitespace-nowrap active:opacity-80 transition-opacity flex-shrink-0"
                  style={{
                    background: active ? 'var(--ink)' : 'transparent',
                    color: active ? '#fff' : 'var(--ink2)',
                    border: `1px solid ${active ? 'var(--ink)' : 'var(--hairline)'}`,
                  }}>
                  {cat}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto scrollbar-none px-5 pb-28">
        {grouped.length === 0 ? (
          <div className="text-center py-16 text-[14px]" style={{ color: 'var(--muted)' }}>No transactions found</div>
        ) : grouped.map(([day, txs]) => {
          const dayNet = txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)
          return (
            <div key={day} className="mb-5">
              <div className="flex justify-between items-baseline py-2 px-1">
                <div className="text-[12px] font-medium tracking-wide" style={{ color: 'var(--muted)' }}>{dayLabel(day)}</div>
                <div className="font-[family-name:var(--font-mono)] text-[12px] font-semibold tracking-tight"
                  style={{ color: dayNet >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                  {dayNet >= 0 ? '+' : '−'}฿{satangToTHB(Math.abs(dayNet))}
                </div>
              </div>
              <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)' }}>
                {txs.map((tx, j) => {
                  const color = CAT_COLORS[tx.category] ?? 'var(--muted)'
                  const time = new Date(tx.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <div key={tx.id} className="flex items-center gap-3 px-3.5 py-3 active:opacity-80 transition-opacity cursor-pointer"
                      style={{ borderBottom: j < txs.length - 1 ? '1px solid var(--hairline2)' : 'none' }}
                      onClick={() => setEditing(tx)}>
                      {tx.immichAssetId ? (
                        <Image
                          src={getThumbnailUrl(tx.immichAssetId)}
                          alt=""
                          width={40}
                          height={48}
                          className="rounded-[6px] object-cover flex-shrink-0"
                          style={{ border: '1px solid var(--hairline)' }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
                          style={{ background: color + '14', border: `1px solid ${color}22`, color }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 8h13l-3-3M20 16H7l3 3"/>
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[14.5px] font-medium text-[var(--ink)] truncate">{tx.note || tx.category}</div>
                        <div className="text-[12px] flex items-center gap-1.5 mt-0.5" style={{ color: 'var(--muted)' }}>
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                          {tx.category} · <span className="font-[family-name:var(--font-mono)]">{time}</span>
                        </div>
                      </div>
                      <div className="font-[family-name:var(--font-mono)] text-[15px] font-semibold tracking-tight flex-shrink-0"
                        style={{ color: tx.type === 'income' ? 'var(--income)' : 'var(--expense)' }}>
                        {tx.type === 'income' ? '+' : '−'}฿{satangToTHB(tx.amount)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <TabBar bookId={book.id} active="history" />
      {editing && (
        <EditTransactionSheet
          tx={editing}
          onSave={handleSaved}
          onDelete={handleDeleted}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  )
}
