import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { uploadAsset } from '@/lib/immich'
import { extractFromImage } from '@/lib/openrouter'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'image required' }, { status: 400 })
  const mode = (formData.get('mode') as string | null) === 'bank_slip' ? 'bank_slip' : 'receipt'

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')

  // Run Immich upload and OpenRouter extraction in parallel
  const [assetId, extraction] = await Promise.all([
    uploadAsset(buffer, file.name || 'receipt.jpg', file.type || 'image/jpeg'),
    extractFromImage(base64, mode),
  ])

  return NextResponse.json({ assetId, extraction })
}
