import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isRuleDue, dueDateForToday, periodOf } from '@/lib/recurring'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const rule = await prisma.recurringRule.findFirst({
    where: { id, book: { members: { some: { userId: session.user.id } } } },
  })
  if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  if (!isRuleDue(rule, now)) {
    return NextResponse.json({ ok: true, alreadyHandled: true })
  }

  const period = periodOf(now)
  const tx = await prisma.$transaction(async db => {
    const created = await db.transaction.create({
      data: {
        bookId: rule.bookId,
        amount: rule.amount,
        type: rule.type,
        category: rule.category,
        date: dueDateForToday(rule, now),
        note: rule.note,
        merchantName: rule.merchantName,
        recurringRuleId: rule.id,
      },
    })
    await db.recurringRule.update({ where: { id: rule.id }, data: { lastRunPeriod: period } })
    await db.book.update({ where: { id: rule.bookId }, data: { updatedAt: now } })
    return created
  })

  return NextResponse.json({ ok: true, transaction: tx }, { status: 201 })
}
