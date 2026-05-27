import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { AlbumClient } from './client'

export default async function AlbumPage({ params }: { params: Promise<{ bookId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { bookId } = await params
  const book = await prisma.book.findFirst({ where: { id: bookId, userId: session.user.id } })
  if (!book) notFound()

  const transactions = await prisma.transaction.findMany({
    where: { bookId, immichAssetId: { not: null } },
    orderBy: { date: 'desc' },
    select: {
      id: true,
      immichAssetId: true,
      note: true,
      category: true,
      amount: true,
      type: true,
      date: true,
    },
  })

  return (
    <AlbumClient
      book={book}
      items={transactions.map(t => ({
        ...t,
        immichAssetId: t.immichAssetId!,
        date: t.date.toISOString(),
      }))}
    />
  )
}
