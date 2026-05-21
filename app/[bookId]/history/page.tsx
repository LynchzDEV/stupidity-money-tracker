import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { HistoryClient } from './client'
import { paramsToFilters } from '@/lib/search'

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string }>
  searchParams: Promise<{
    q?: string
    category?: string
    type?: string
    aiMode?: string
    aiMin?: string
    aiMax?: string
    aiCat?: string
    aiType?: string
    aiKey?: string
    aiFrom?: string
    aiTo?: string
  }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { bookId } = await params
  const sp = await searchParams
  const book = await prisma.book.findFirst({
    where: { id: bookId, userId: session.user.id },
  })
  if (!book) notFound()

  const where: Record<string, unknown> = { bookId }

  const aiFilters = paramsToFilters(new URLSearchParams(
    Object.entries(sp).filter(([, v]) => v != null) as [string, string][]
  ))

  if (aiFilters) {
    if (aiFilters.category) where.category = aiFilters.category
    else if (sp.category) where.category = sp.category
    if (aiFilters.type) where.type = aiFilters.type
    else if (sp.type) where.type = sp.type
    if (aiFilters.keyword) where.note = { contains: aiFilters.keyword, mode: 'insensitive' }
    if (aiFilters.amountMin != null || aiFilters.amountMax != null) {
      where.amount = {
        ...(aiFilters.amountMin != null ? { gte: aiFilters.amountMin } : {}),
        ...(aiFilters.amountMax != null ? { lte: aiFilters.amountMax } : {}),
      }
    }
    if (aiFilters.dateFrom || aiFilters.dateTo) {
      where.date = {
        ...(aiFilters.dateFrom ? { gte: new Date(aiFilters.dateFrom) } : {}),
        ...(aiFilters.dateTo ? { lte: new Date(aiFilters.dateTo + 'T23:59:59') } : {}),
      }
    }
  } else {
    if (sp.category) where.category = sp.category
    if (sp.type) where.type = sp.type
    if (sp.q) where.note = { contains: sp.q, mode: 'insensitive' }
  }

  const [transactions, allCats] = await Promise.all([
    prisma.transaction.findMany({ where, orderBy: { date: 'desc' }, take: 100 }),
    prisma.transaction.findMany({ where: { bookId }, select: { category: true }, distinct: ['category'] }),
  ])

  return (
    <HistoryClient
      book={book}
      transactions={transactions.map(t => ({ ...t, date: t.date.toISOString() }))}
      allCategories={allCats.map(t => t.category).sort()}
      query={sp.q ?? ''}
      initialAiMode={!!sp.aiMode}
    />
  )
}
