import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { ManualEntryClient } from './client'
import { findAccessibleBook } from '@/lib/book-access'

export default async function ManualEntryPage({ params }: { params: Promise<{ bookId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { bookId } = await params
  const book = await findAccessibleBook(bookId, session.user.id)
  if (!book) notFound()

  return <ManualEntryClient book={book} />
}
