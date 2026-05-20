import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { UploadPageClient } from './client'

export default async function UploadPage({ params }: { params: Promise<{ bookId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { bookId } = await params
  const book = await prisma.book.findFirst({
    where: { id: bookId, userId: session.user.id },
  })
  if (!book) notFound()

  const books = await prisma.book.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { transactions: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return <UploadPageClient book={book} books={books} />
}
