import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getBookRole } from '@/lib/book-access'

// Mark a share paid/unpaid and attach a slip. Allowed for the share's own
// member, or the book owner.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const share = await prisma.expenseShare.findUnique({
    where: { id },
    include: { transaction: { select: { bookId: true } } },
  })
  if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const role = await getBookRole(share.transaction.bookId, session.user.id)
  const isSelf = share.userId === session.user.id
  if (!isSelf && role !== 'owner') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const body = await req.json()
  const data: { paidAt?: Date | null; slipAssetId?: string | null } = {}
  if (body.paid !== undefined) data.paidAt = body.paid ? new Date() : null
  if (body.slipAssetId !== undefined) data.slipAssetId = body.slipAssetId || null

  const updated = await prisma.expenseShare.update({ where: { id }, data })
  return NextResponse.json({
    id: updated.id,
    userId: updated.userId,
    amountOwed: updated.amountOwed,
    slipAssetId: updated.slipAssetId,
    paidAt: updated.paidAt ? updated.paidAt.toISOString() : null,
  })
}
