import { formatTHB } from '@/lib/utils'

interface SummaryProps {
  incomeSatang: number
  expenseSatang: number
}

export function DashboardSummary({ incomeSatang, expenseSatang }: SummaryProps) {
  const balance = incomeSatang - expenseSatang

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white rounded-2xl p-4 border border-[var(--hairline)] shadow-sm">
        <div className="text-xs text-[var(--muted)] mb-1">Income</div>
        <div className="font-[family-name:var(--font-geist-mono)] font-semibold text-[var(--income)] text-sm leading-tight">
          {formatTHB(incomeSatang)}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 border border-[var(--hairline)] shadow-sm">
        <div className="text-xs text-[var(--muted)] mb-1">Expenses</div>
        <div className="font-[family-name:var(--font-geist-mono)] font-semibold text-[var(--expense)] text-sm leading-tight">
          {formatTHB(expenseSatang)}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 border border-[var(--hairline)] shadow-sm">
        <div className="text-xs text-[var(--muted)] mb-1">Balance</div>
        <div
          className="font-[family-name:var(--font-geist-mono)] font-semibold text-sm leading-tight"
          style={{ color: balance >= 0 ? 'var(--income)' : 'var(--expense)' }}
        >
          {formatTHB(Math.abs(balance))}
        </div>
      </div>
    </div>
  )
}
