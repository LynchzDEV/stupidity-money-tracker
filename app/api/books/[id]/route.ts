import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findAccessibleBook, getBookRole } from '@/lib/book-access'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const book = await findAccessibleBook(id, session.user.id)
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  if (body.resetDay != null) {
    const d = Number(body.resetDay)
    if (!Number.isInteger(d) || d < 1 || d > 31) {
      return NextResponse.json({ error: 'resetDay must be an integer 1-31' }, { status: 400 })
    }
  }

  // Default is per-member: touch only the caller's own membership rows.
  if (body.isDefault === true) {
    await prisma.$transaction([
      prisma.bookMember.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } }),
      prisma.bookMember.update({
        where: { bookId_userId: { bookId: id, userId: session.user.id } },
        data: { isDefault: true },
      }),
    ])
  } else if (body.isDefault === false) {
    await prisma.bookMember.update({
      where: { bookId_userId: { bookId: id, userId: session.user.id } },
      data: { isDefault: false },
    })
  }

  const bookData = {
    ...(body.name != null && { name: body.name }),
    ...(body.emoji != null && { emoji: body.emoji }),
    ...(body.resetDay != null && { resetDay: Number(body.resetDay) }),
  }
  if (Object.keys(bookData).length > 0) {
    await prisma.book.update({ where: { id }, data: bookData })
  }

  const updated = await findAccessibleBook(id, session.user.id)
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const role = await getBookRole(id, session.user.id)
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Only the owner can delete this book' }, { status: 403 })
  }

  // Cascade removes members, invites, transactions, and their shares.
  await prisma.book.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
