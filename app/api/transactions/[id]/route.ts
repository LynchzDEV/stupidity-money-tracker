import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { thbToSatang, parseDateString } from '@/lib/utils'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tx = await prisma.transaction.findFirst({
    where: { id, book: { members: { some: { userId: session.user.id } } } },
  })
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...(body.amount != null && { amount: thbToSatang(body.amount) }),
      ...(body.type && { type: body.type }),
      ...(body.category && { category: body.category }),
      ...(body.date && { date: parseDateString(body.date) }),
      ...(body.note !== undefined && { note: body.note }),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tx = await prisma.transaction.findFirst({
    where: { id, book: { members: { some: { userId: session.user.id } } } },
  })
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.transaction.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
