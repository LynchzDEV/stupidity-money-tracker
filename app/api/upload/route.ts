import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { uploadAsset } from '@/lib/immich'

// Upload an image (e.g. a payment slip) to Immich and return its asset id.
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'image required' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const assetId = await uploadAsset(buffer, file.name || 'slip.jpg', file.type || 'image/jpeg')
  return NextResponse.json({ assetId }, { status: 201 })
}
