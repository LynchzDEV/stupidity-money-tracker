'use client'
import { useState } from 'react'
import { formatTHB } from '@/lib/utils'
import { getThumbnailUrl } from '@/lib/immich'
import { format } from 'date-fns'
import { ChevronDown } from 'lucide-react'

interface Transaction {
  id: string
  amount: number
  type: string
  category: string
  date: string
  note: string | null
  immichAssetId: string | null
}

interface TransactionListProps {
  transactions: Transaction[]
}

export function TransactionList({ transactions }: TransactionListProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--muted)] text-sm">
        No transactions yet
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="bg-white rounded-2xl border border-[var(--hairline)] overflow-hidden cursor-pointer"
          onClick={() => setExpanded(expanded === tx.id ? null : tx.id)}
        >
          <div className="flex items-center gap-3 p-3.5">
            {tx.immichAssetId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getThumbnailUrl(tx.immichAssetId)}
                alt="Receipt"
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-[var(--bg)]"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[var(--bg)] flex items-center justify-center text-lg flex-shrink-0">
                🧾
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-[var(--ink)] truncate">
                {tx.note || tx.category}
              </div>
              <div className="text-xs text-[var(--muted)]">
                {format(new Date(tx.date), 'd MMM')} · {tx.category}
              </div>
            </div>
            <div
              className="font-[family-name:var(--font-geist-mono)] font-semibold text-sm flex-shrink-0"
              style={{ color: tx.type === 'income' ? 'var(--income)' : 'var(--expense)' }}
            >
              {tx.type === 'income' ? '+' : '-'}{formatTHB(tx.amount)}
            </div>
            <ChevronDown
              size={14}
              className={`text-[var(--muted)] transition-transform ${expanded === tx.id ? 'rotate-180' : ''}`}
            />
          </div>

          {expanded === tx.id && tx.immichAssetId && (
            <div className="px-3.5 pb-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getThumbnailUrl(tx.immichAssetId)}
                alt="Receipt full"
                className="w-full rounded-xl object-contain max-h-64 bg-[var(--bg)]"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
