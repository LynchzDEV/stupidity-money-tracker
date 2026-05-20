import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const books = await prisma.book.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { transactions: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(books)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, emoji = '📒' } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const book = await prisma.book.create({
    data: { name: name.trim(), emoji, userId: session.user.id },
  })
  return NextResponse.json(book, { status: 201 })
}
