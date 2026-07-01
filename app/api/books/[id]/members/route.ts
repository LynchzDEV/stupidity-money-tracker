import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getBookRole } from '@/lib/book-access'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: bookId } = await params
  const role = await getBookRole(bookId, session.user.id)
  if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const members = await prisma.bookMember.findMany({
    where: { bookId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(members)
}
