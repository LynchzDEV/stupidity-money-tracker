import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { BookSelectorClient } from './client'

export default async function BooksPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const books = await prisma.book.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { transactions: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return <BookSelectorClient books={books} />
}
