import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { TabBar } from '@/components/tab-bar'
import { RecentTransactions } from '@/components/recent-transactions'
import { RecurringReminders } from '@/components/recurring-reminders'
import { PeriodPicker } from '@/components/period-picker'
import { listDueReminders } from '@/lib/recurring-reminders'
import { currentPeriod, daysUntil } from '@/lib/period'

const CAT_COLORS: Record<string, string> = {
  Food: '#b2492c', Transport: '#a07212', Shopping: '#3a7d52',
  Bills: '#3548c4', Salary: '#1f8a5b', Transfer: '#0e5c3a', Other: '#7a7d76',
}

function satangToTHB(satang: number) {
  return (satang / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function DashboardPage({ params }: { params: Promise<{ bookId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { bookId } = await params
  const book = await prisma.book.findFirst({ where: { id: bookId, userId: session.user.id } })
  if (!book) notFound()

  const now = new Date()
  const { start: periodStart, end: periodEnd } = currentPeriod(now, book.resetDay)

  const transactions = await prisma.transaction.findMany({
    where: { bookId, date: { gte: periodStart, lt: periodEnd } },
    orderBy: { date: 'desc' },
  })

  const incomeSatang = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenseSatang = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const netSatang = incomeSatang - expenseSatang

  const catMap = new Map<string, number>()
  transactions.filter(t => t.type === 'expense').forEach(t => catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount))
  const cats = [...catMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxCat = cats[0]?.[1] ?? 1

  const remainingDays = daysUntil(now, periodEnd)
  const perDaySatang = remainingDays > 0 && netSatang > 0 ? Math.floor(netSatang / remainingDays) : null

  const recent = transactions.slice(0, 10).map(t => ({ ...t, date: t.date.toISOString() }))
  const dueReminders = await listDueReminders(bookId, now)

  return (
    <main className="min-h-[100dvh] scrollbar-none overflow-auto relative" style={{ background: 'var(--bg)', paddingBottom: 'calc(96px + max(16px, env(safe-area-inset-bottom, 16px)))' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-1">
        <Link href={`/${bookId}/upload`}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-full text-[13.5px] font-medium"
          style={{ background: 'rgba(255,255,255,.85)', border: '1px solid var(--hairline)' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
          {book.name}
        </Link>
        <Link href={`/${bookId}/history`}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--hairline)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>
          </svg>
        </Link>
      </div>

      <PeriodPicker bookId={bookId} resetDay={book.resetDay} startISO={periodStart.toISOString()} endISO={periodEnd.toISOString()} />

      {dueReminders.length > 0 && (
        <div className="px-5 mt-3">
          <RecurringReminders reminders={dueReminders} />
        </div>
      )}

      {/* Balance hero card */}
      <div className="px-5 mt-3">
        <div className="rounded-[22px] p-5" style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="text-[11.5px] font-medium tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Net balance</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-[22px] leading-none" style={{ color: netSatang >= 0 ? 'var(--income)' : 'var(--expense)', fontFamily: 'var(--font-serif), Georgia, serif' }}>
              {netSatang >= 0 ? '+' : '−'}
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[48px] font-semibold tracking-tight leading-none" style={{ color: 'var(--ink)' }}>
              ฿{satangToTHB(Math.abs(netSatang))}
            </span>
          </div>
          <div className="flex gap-2 mt-5">
            <div className="flex-1 rounded-xl px-3 py-2.5" style={{ background: 'var(--income-bg)', border: '1px solid #cbe6d4' }}>
              <div className="text-[11px] font-medium flex items-center gap-1" style={{ color: 'var(--income)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V5m0 0l-6 6m6-6l6 6"/></svg>
                Income
              </div>
              <div className="font-[family-name:var(--font-mono)] text-[18px] font-semibold mt-0.5 tracking-tight" style={{ color: 'var(--income)' }}>
                ฿{satangToTHB(incomeSatang)}
              </div>
            </div>
            <div className="flex-1 rounded-xl px-3 py-2.5" style={{ background: 'var(--expense-bg)', border: '1px solid #e9d3c6' }}>
              <div className="text-[11px] font-medium flex items-center gap-1" style={{ color: 'var(--expense)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v15m0 0l-6-6m6 6l6-6"/></svg>
                Expense
              </div>
              <div className="font-[family-name:var(--font-mono)] text-[18px] font-semibold mt-0.5 tracking-tight" style={{ color: 'var(--expense)' }}>
                ฿{satangToTHB(expenseSatang)}
              </div>
            </div>
          </div>
          {perDaySatang !== null && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--hairline2)' }}>
              <div className="flex items-baseline justify-between">
                <span className="text-[11.5px] font-medium tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                  Est. per day left
                </span>
                <span className="text-[12px]" style={{ color: 'var(--muted)' }}>
                  {remainingDays} days remaining
                </span>
              </div>
              <div className="font-[family-name:var(--font-mono)] text-[28px] font-semibold tracking-tight leading-none mt-1" style={{ color: 'var(--ink)' }}>
                ฿{satangToTHB(perDaySatang)}
                <span className="text-[14px] font-normal ml-1" style={{ color: 'var(--muted)' }}>/day</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Categories */}
      {cats.length > 0 && (
        <div className="px-5 mt-6">
          <div className="flex justify-between items-baseline mb-3">
            <div className="text-[13px] font-semibold text-[var(--ink)]">Where it went</div>
            <Link href={`/${bookId}/trends`} className="text-[12px] font-medium flex items-center gap-0.5" style={{ color: 'var(--accent)' }}>
              Trends
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {cats.map(([cat, total]) => (
              <div key={cat}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[13.5px] font-medium text-[var(--ink)]">{cat}</span>
                  <span className="font-[family-name:var(--font-mono)] text-[13.5px] font-medium" style={{ color: 'var(--expense)' }}>
                    ฿{satangToTHB(total)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--hairline2)' }}>
                  <div className="h-full rounded-full" style={{ width: `${(total / maxCat) * 100}%`, background: CAT_COLORS[cat] ?? 'var(--muted)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="px-5 mt-6">
        <div className="flex justify-between items-baseline mb-3">
          <div className="text-[13px] font-semibold text-[var(--ink)]">Recent</div>
          <Link href={`/${bookId}/history`} className="text-[12px] font-medium" style={{ color: 'var(--accent)' }}>See all</Link>
        </div>

        <RecentTransactions transactions={recent} />
      </div>
      <TabBar bookId={bookId} active="stats" />
    </main>
  )
}
