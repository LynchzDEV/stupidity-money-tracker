import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BookSelectorClient } from './client'
import { listAccessibleBooks } from '@/lib/book-access'
import { listMyInvites } from '@/lib/invites'

export default async function BooksPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  const [books, memberships, invites] = await Promise.all([
    listAccessibleBooks(userId),
    prisma.bookMember.findMany({ where: { userId }, select: { bookId: true, role: true } }),
    session.user.email ? listMyInvites(session.user.email) : Promise.resolve([]),
  ])

  const roleByBook = new Map(memberships.map(m => [m.bookId, m.role]))
  const booksWithRole = books.map(b => ({ ...b, role: roleByBook.get(b.id) ?? 'member' }))

  return <BookSelectorClient books={booksWithRole} invites={invites} currentUserId={userId} />
}
