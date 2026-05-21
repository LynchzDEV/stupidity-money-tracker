'use client'
import { useState } from 'react'
import Image from 'next/image'
import { getThumbnailUrl } from '@/lib/immich'
import { EditTransactionSheet } from '@/components/edit-transaction-sheet'

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

export function RecentTransactions({ transactions: initial }: { transactions: Transaction[] }) {
  const [txs, setTxs] = useState(initial)
  const [editing, setEditing] = useState<Transaction | null>(null)

  function handleSaved(updated: Transaction) {
    setTxs(prev => prev.map(t => t.id === updated.id ? updated : t))
    setEditing(null)
  }

  function handleDeleted(id: string) {
    setTxs(prev => prev.filter(t => t.id !== id))
    setEditing(null)
  }

  if (txs.length === 0) {
    return <div className="text-center py-12 text-[14px]" style={{ color: 'var(--muted)' }}>No transactions this month</div>
  }

  return (
    <>
      <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)' }}>
        {txs.map((tx, i) => {
          const color = CAT_COLORS[tx.category] ?? 'var(--muted)'
          return (
            <div key={tx.id}
              className="flex items-center gap-3 px-3.5 py-3 active:opacity-80 transition-opacity cursor-pointer"
              style={{ borderBottom: i < txs.length - 1 ? '1px solid var(--hairline2)' : 'none' }}
              onClick={() => setEditing(tx)}>
              {tx.immichAssetId ? (
                <Image
                  src={getThumbnailUrl(tx.immichAssetId)}
                  alt=""
                  width={40}
                  height={48}
unoptimized
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
                  {tx.category} · <span className="font-[family-name:var(--font-mono)]">
                    {new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
              <div className="font-[family-name:var(--font-mono)] text-[14.5px] font-semibold tracking-tight flex-shrink-0"
                style={{ color: tx.type === 'income' ? 'var(--income)' : 'var(--ink)' }}>
                {tx.type === 'income' ? '+' : '−'}฿{satangToTHB(tx.amount)}
              </div>
            </div>
          )
        })}
      </div>
      {editing && (
        <EditTransactionSheet
          tx={editing}
          onSave={handleSaved}
          onDelete={handleDeleted}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
