import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BookSelectorClient } from './client'
import { listAccessibleBooks } from '@/lib/book-access'

export default async function BooksPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const books = await listAccessibleBooks(session.user.id)

  return <BookSelectorClient books={books} />
}
