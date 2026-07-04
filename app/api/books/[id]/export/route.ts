import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findAccessibleBook } from '@/lib/book-access'
import { transactionsToCsv } from '@/lib/export-csv'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const book = await findAccessibleBook(id, session.user.id)
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const dateFilter = {
    ...(from && { gte: new Date(from) }),
    ...(to && { lte: new Date(to + 'T23:59:59') }),
  }

  const transactions = await prisma.transaction.findMany({
    where: { bookId: id, ...(from || to ? { date: dateFilter } : {}) },
    orderBy: { date: 'desc' },
    select: { date: true, type: true, category: true, amount: true, merchantName: true, note: true },
  })

  const csv = transactionsToCsv(transactions)
  const slug = book.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'book'
  const stamp = new Date().toISOString().split('T')[0]

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}-${stamp}.csv"`,
    },
  })
}
