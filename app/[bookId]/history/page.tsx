import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { HistoryClient } from './client'

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string }>
  searchParams: Promise<{ q?: string; category?: string; type?: string }>
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
  if (sp.category) where.category = sp.category
  if (sp.type) where.type = sp.type
  if (sp.q) where.note = { contains: sp.q, mode: 'insensitive' }

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
    />
  )
}
