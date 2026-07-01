import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getBookRole } from '@/lib/book-access'

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: bookId, userId: targetId } = await params
  const myRole = await getBookRole(bookId, session.user.id)
  if (!myRole) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isSelf = targetId === session.user.id
  if (!isSelf && myRole !== 'owner') {
    return NextResponse.json({ error: 'Only the owner can remove members' }, { status: 403 })
  }

  const target = await prisma.bookMember.findUnique({
    where: { bookId_userId: { bookId, userId: targetId } },
  })
  if (!target) return NextResponse.json({ error: 'Not a member' }, { status: 404 })

  if (target.role === 'owner') {
    const ownerCount = await prisma.bookMember.count({ where: { bookId, role: 'owner' } })
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: 'The last owner cannot leave — delete the book instead' },
        { status: 400 },
      )
    }
  }

  await prisma.bookMember.delete({ where: { bookId_userId: { bookId, userId: targetId } } })
  return new NextResponse(null, { status: 204 })
}
