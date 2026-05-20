import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(_: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })

  const { assetId } = await params
  const immichUrl = process.env.IMMICH_URL
  const apiKey = process.env.IMMICH_API_KEY
  if (!immichUrl || !apiKey) return new NextResponse('Not configured', { status: 503 })

  const res = await fetch(`${immichUrl}/api/assets/${assetId}/thumbnail?size=preview`, {
    headers: { 'x-api-key': apiKey },
  })

  if (!res.ok) return new NextResponse('Not found', { status: res.status })

  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const buffer = await res.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=86400, immutable',
    },
  })
}
