import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { UploadPageClient } from './client'
import { listDueReminders } from '@/lib/recurring-reminders'
import { findAccessibleBook, listAccessibleBooks } from '@/lib/book-access'

export default async function UploadPage({ params }: { params: Promise<{ bookId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { bookId } = await params
  const book = await findAccessibleBook(bookId, session.user.id)
  if (!book) notFound()

  const books = await listAccessibleBooks(session.user.id)

  const dueCount = (await listDueReminders(bookId)).length

  return <UploadPageClient book={book} books={books} dueRecurringCount={dueCount} />
}
