import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeEqualShares, sharesSumTo, type ShareAmount } from '@/lib/split'

async function accessibleTx(txId: string, userId: string) {
  return prisma.transaction.findFirst({
    where: { id: txId, book: { members: { some: { userId } } } },
    include: { book: { select: { id: true } } },
  })
}

function serialize(shares: {
  id: string
  userId: string
  amountOwed: number
  slipAssetId: string | null
  paidAt: Date | null
  user: { id: string; name: string | null; email: string; image: string | null }
}[]) {
  return shares.map(s => ({
    id: s.id,
    userId: s.userId,
    amountOwed: s.amountOwed,
    slipAssetId: s.slipAssetId,
    paidAt: s.paidAt ? s.paidAt.toISOString() : null,
    user: s.user,
  }))
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tx = await accessibleTx(id, session.user.id)
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const shares = await prisma.expenseShare.findMany({
    where: { transactionId: id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ splitMode: tx.splitMode, shares: serialize(shares) })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tx = await accessibleTx(id, session.user.id)
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const mode = body.mode === 'manual' ? 'manual' : 'equal'

  const members = await prisma.bookMember.findMany({
    where: { bookId: tx.book.id },
    select: { userId: true },
  })
  const memberIds = new Set(members.map(m => m.userId))

  let amounts: ShareAmount[]
  if (mode === 'equal') {
    amounts = computeEqualShares(tx.amount, members.map(m => m.userId))
  } else {
    const raw = (body.shares ?? []) as ShareAmount[]
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json({ error: 'shares required for manual split' }, { status: 400 })
    }
    if (raw.some(s => !memberIds.has(s.userId) || !Number.isInteger(s.amount) || s.amount < 0)) {
      return NextResponse.json({ error: 'each share needs a member and a non-negative satang amount' }, { status: 400 })
    }
    if (!sharesSumTo(tx.amount, raw)) {
      return NextResponse.json({ error: 'shares must add up to the transaction amount' }, { status: 400 })
    }
    amounts = raw
  }

  await prisma.$transaction([
    prisma.expenseShare.deleteMany({ where: { transactionId: id } }),
    prisma.expenseShare.createMany({
      data: amounts.map(a => ({ transactionId: id, userId: a.userId, amountOwed: a.amount })),
    }),
    prisma.transaction.update({ where: { id }, data: { splitMode: mode } }),
  ])

  const shares = await prisma.expenseShare.findMany({
    where: { transactionId: id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ splitMode: mode, shares: serialize(shares) }, { status: 201 })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tx = await accessibleTx(id, session.user.id)
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.$transaction([
    prisma.expenseShare.deleteMany({ where: { transactionId: id } }),
    prisma.transaction.update({ where: { id }, data: { splitMode: null } }),
  ])
  return new NextResponse(null, { status: 204 })
}
