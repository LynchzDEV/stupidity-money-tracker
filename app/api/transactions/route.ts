import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { thbToSatang } from '@/lib/utils'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bookId = searchParams.get('bookId')
  const month = searchParams.get('month') // YYYY-MM
  const category = searchParams.get('category')
  const type = searchParams.get('type')
  const search = searchParams.get('search')

  if (bookId) {
    const book = await prisma.book.findFirst({ where: { id: bookId, userId: session.user.id } })
    if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const where: Record<string, unknown> = {
    book: { userId: session.user.id },
    ...(bookId && { bookId }),
    ...(category && { category }),
    ...(type && { type }),
    ...(search && { note: { contains: search, mode: 'insensitive' } }),
  }

  if (month) {
    const [year, mon] = month.split('-').map(Number)
    const start = new Date(year, mon - 1, 1)
    const end = new Date(year, mon, 1)
    where.date = { gte: start, lt: end }
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: 'desc' },
    take: 100,
  })
  return NextResponse.json(transactions)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { bookId, amount, type, category, date, note, immichAssetId, confidenceJson } = body

  if (!bookId || amount == null || !type || !category || !date) {
    return NextResponse.json({ error: 'bookId, amount, type, category, date required' }, { status: 400 })
  }

  const book = await prisma.book.findFirst({ where: { id: bookId, userId: session.user.id } })
  if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

  const tx = await prisma.transaction.create({
    data: {
      bookId,
      amount: thbToSatang(amount),
      type,
      category,
      date: new Date(date),
      note: note || null,
      immichAssetId: immichAssetId || null,
      confidenceJson: confidenceJson || null,
    },
  })

  await prisma.book.update({ where: { id: bookId }, data: { updatedAt: new Date() } })

  return NextResponse.json(tx, { status: 201 })
}
