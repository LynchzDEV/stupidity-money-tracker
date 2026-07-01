import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findAccessibleBook } from '@/lib/book-access'
import { thbToSatang } from '@/lib/utils'
import { periodOf } from '@/lib/recurring'
import { listDueReminders } from '@/lib/recurring-reminders'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bookId = searchParams.get('bookId')
  if (!bookId) return NextResponse.json({ error: 'bookId required' }, { status: 400 })

  const book = await findAccessibleBook(bookId, session.user.id)
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const reminders = await listDueReminders(bookId)
  return NextResponse.json(reminders)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { bookId, amount, type, category, note, merchantName, date } = body

  if (!bookId || amount == null || !type || !category || !date) {
    return NextResponse.json({ error: 'bookId, amount, type, category, date required' }, { status: 400 })
  }

  const book = await findAccessibleBook(bookId, session.user.id)
  if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

  const seed = new Date(date)
  if (Number.isNaN(seed.getTime())) {
    return NextResponse.json({ error: 'invalid date' }, { status: 400 })
  }
  const period = periodOf(seed)

  const rule = await prisma.recurringRule.create({
    data: {
      bookId,
      amount: thbToSatang(amount),
      type,
      category,
      note: note || null,
      merchantName: merchantName || null,
      dayOfMonth: seed.getDate(),
      startPeriod: period,
      lastRunPeriod: period,
      isActive: true,
    },
  })

  return NextResponse.json(rule, { status: 201 })
}
