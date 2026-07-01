import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { periodOf } from '@/lib/recurring'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const rule = await prisma.recurringRule.findFirst({
    where: { id, book: { members: { some: { userId: session.user.id } } } },
  })
  if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.recurringRule.update({
    where: { id },
    data: { lastRunPeriod: periodOf(new Date()) },
  })

  return NextResponse.json({ ok: true })
}
