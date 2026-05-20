import { formatTHB } from '@/lib/utils'

interface CategoryData {
  category: string
  total: number
}

interface CategoryChartProps {
  data: CategoryData[]
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#e85d3e', Transport: '#3b82f6', Bills: '#8b5cf6',
  Shopping: '#f59e0b', Transfer: '#6b7280', Salary: '#10b981', Other: '#94a3b8',
}

export function CategoryChart({ data }: CategoryChartProps) {
  const max = Math.max(...data.map(d => d.total), 1)

  return (
    <div className="bg-white rounded-2xl p-4 border border-[var(--hairline)] shadow-sm">
      <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-3">
        Spending by Category
      </div>
      <div className="flex flex-col gap-2.5">
        {data.map((item) => (
          <div key={item.category} className="flex items-center gap-2">
            <div className="text-xs text-[var(--muted)] w-16 truncate">{item.category}</div>
            <div className="flex-1 h-2 bg-[var(--bg)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.total / max) * 100}%`,
                  background: CATEGORY_COLORS[item.category] ?? '#94a3b8',
                }}
              />
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--ink)] w-20 text-right">
              {formatTHB(item.total)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
