import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { createBookWithOwner, memberFilter } from '@/lib/book-access'

export default async function RootPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Find the user's own default book, or any accessible book, or create Personal automatically
  let book = await prisma.book.findFirst({
    where: { members: { some: { userId: session.user.id, isDefault: true } } },
  })

  if (!book) {
    book = await prisma.book.findFirst({ where: memberFilter(session.user.id) })
  }

  if (!book) {
    book = await createBookWithOwner(session.user.id, { name: 'Personal', emoji: '📒' }, { isDefault: true })
  }

  redirect(`/${book.id}/upload`)
}
