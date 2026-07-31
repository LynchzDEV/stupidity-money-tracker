import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const hashes: unknown = body?.hashes
  if (!Array.isArray(hashes) || hashes.length === 0 || hashes.length > 50) {
    return NextResponse.json({ error: 'hashes: non-empty array of at most 50 required' }, { status: 400 })
  }
  const valid = hashes.filter((h): h is string => typeof h === 'string' && /^[0-9a-f]{64}$/.test(h))

  const existing = await prisma.transaction.findMany({
    where: {
      sourceHash: { in: valid },
      book: { members: { some: { userId: session.user.id } } },
    },
    select: { sourceHash: true, id: true, merchantName: true, amount: true, createdAt: true },
  })

  const duplicates = Object.fromEntries(
    existing.map(tx => [tx.sourceHash!, { id: tx.id, merchantName: tx.merchantName, amount: tx.amount, createdAt: tx.createdAt }]),
  )
  return NextResponse.json({ duplicates })
}
