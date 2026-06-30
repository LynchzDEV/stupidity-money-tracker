import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const book = await prisma.book.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  if (body.resetDay != null) {
    const d = Number(body.resetDay)
    if (!Number.isInteger(d) || d < 1 || d > 31) {
      return NextResponse.json({ error: 'resetDay must be an integer 1-31' }, { status: 400 })
    }
  }

  // Setting a new default: unset all others first
  if (body.isDefault === true) {
    await prisma.book.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    })
  }

  const updated = await prisma.book.update({
    where: { id },
    data: {
      ...(body.name != null && { name: body.name }),
      ...(body.emoji != null && { emoji: body.emoji }),
      ...(body.isDefault != null && { isDefault: body.isDefault }),
      ...(body.resetDay != null && { resetDay: Number(body.resetDay) }),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.book.deleteMany({
    where: { id, userId: session.user.id },
  })
  return new NextResponse(null, { status: 204 })
}
