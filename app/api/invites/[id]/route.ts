import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { acceptInvite, declineInvite } from '@/lib/invites'

// POST = accept, DELETE = decline
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const bookId = await acceptInvite(id, session.user.id, session.user.email)
  if (!bookId) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  return NextResponse.json({ bookId }, { status: 200 })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const ok = await declineInvite(id, session.user.email)
  if (!ok) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
