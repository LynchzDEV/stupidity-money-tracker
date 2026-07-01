import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createBookWithOwner, listAccessibleBooks } from '@/lib/book-access'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const books = await listAccessibleBooks(session.user.id)
  return NextResponse.json(books)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, emoji = '📒' } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const book = await createBookWithOwner(session.user.id, { name: name.trim(), emoji })
  return NextResponse.json(book, { status: 201 })
}
