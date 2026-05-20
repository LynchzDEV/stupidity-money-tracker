import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Find default book, or any book, or create Personal automatically
  let book = await prisma.book.findFirst({
    where: { userId: session.user.id, isDefault: true },
  })

  if (!book) {
    book = await prisma.book.findFirst({ where: { userId: session.user.id } })
  }

  if (!book) {
    book = await prisma.book.create({
      data: { userId: session.user.id, name: 'Personal', emoji: '📒', isDefault: true },
    })
  }

  redirect(`/${book.id}/upload`)
}
