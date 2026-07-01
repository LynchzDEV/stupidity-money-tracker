import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { listMyInvites } from '@/lib/invites'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const invites = await listMyInvites(session.user.email)
  return NextResponse.json(invites)
}
