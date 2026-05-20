import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { ManualEntryClient } from './client'

export default async function ManualEntryPage({ params }: { params: Promise<{ bookId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { bookId } = await params
  const book = await prisma.book.findFirst({ where: { id: bookId, userId: session.user.id } })
  if (!book) notFound()

  return <ManualEntryClient book={book} />
}
