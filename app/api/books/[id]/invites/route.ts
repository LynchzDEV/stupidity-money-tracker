import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getBookRole } from '@/lib/book-access'
import { inviteToBook } from '@/lib/invites'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: bookId } = await params
  const role = await getBookRole(bookId, session.user.id)
  if (role !== 'owner') return NextResponse.json({ error: 'Only the owner can invite' }, { status: 403 })

  const { email } = await req.json()
  if (!email?.trim() || !email.includes('@')) {
    return NextResponse.json({ error: 'valid email required' }, { status: 400 })
  }

  const result = await inviteToBook(bookId, email, session.user.email ?? null)
  return NextResponse.json(result, { status: result.status === 'already-member' ? 409 : 201 })
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: bookId } = await params
  const role = await getBookRole(bookId, session.user.id)
  if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const invites = await prisma.bookInvite.findMany({
    where: { bookId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(invites)
}
