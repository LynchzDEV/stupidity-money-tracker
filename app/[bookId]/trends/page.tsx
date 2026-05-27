import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { TabBar } from '@/components/tab-bar'
import { TrendsClient } from './client'

export default async function TrendsPage({ params }: { params: Promise<{ bookId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { bookId } = await params
  const book = await prisma.book.findFirst({ where: { id: bookId, userId: session.user.id } })
  if (!book) notFound()

  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const txs = await prisma.transaction.findMany({
    where: { bookId, date: { gte: startDate } },
    select: { date: true, type: true, amount: true, category: true },
    orderBy: { date: 'asc' },
  })

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return {
      month,
      label: d.toLocaleString('en-US', { month: 'short' }),
      year: String(d.getFullYear()).slice(2),
      income: 0,
      expense: 0,
      net: 0,
      isCurrent: i === 11,
    }
  })

  for (const t of txs) {
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`
    const m = months.find(m => m.month === key)
    if (!m) continue
    if (t.type === 'income') m.income += t.amount
    else m.expense += t.amount
  }
  for (const m of months) m.net = m.income - m.expense

  const cur = months[11]
  const prev = months[10]

  const catCurrent: Record<string, number> = {}
  const catPrev: Record<string, number> = {}

  for (const t of txs) {
    if (t.type !== 'expense') continue
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`
    if (key === cur.month) catCurrent[t.category] = (catCurrent[t.category] ?? 0) + t.amount
    else if (key === prev.month) catPrev[t.category] = (catPrev[t.category] ?? 0) + t.amount
  }

  const daysIn = now.getDate()
  const currentLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevLabel = prevDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  return (
    <main className="min-h-[100dvh]" style={{ background: 'var(--bg)' }}>
      <TrendsClient
        bookName={book.name}
        bookId={bookId}
        months={months}
        catCurrent={catCurrent}
        catPrev={catPrev}
        daysIn={daysIn}
        currentLabel={currentLabel}
        prevLabel={prevLabel}
      />
      <TabBar bookId={bookId} active="stats" />
    </main>
  )
}
