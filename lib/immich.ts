export function getThumbnailUrl(assetId: string): string {
  return `${process.env.IMMICH_URL}/api/assets/${assetId}/thumbnail?size=preview`
}

export async function uploadAsset(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const form = new FormData()
  form.append('assetData', new Blob([buffer], { type: mimeType }), filename)
  form.append('deviceAssetId', `sliptrack-${Date.now()}`)
  form.append('deviceId', 'sliptrack-web')
  form.append('fileCreatedAt', new Date().toISOString())
  form.append('fileModifiedAt', new Date().toISOString())

  const res = await fetch(`${process.env.IMMICH_URL}/api/assets`, {
    method: 'POST',
    headers: { 'x-api-key': process.env.IMMICH_API_KEY! },
    body: form,
  })

  if (!res.ok) throw new Error(`Immich upload failed: ${res.status}`)

  const data = await res.json()
  const assetId: string = data.id

  // Add to SlipTrack album
  if (process.env.IMMICH_ALBUM_ID) {
    await fetch(`${process.env.IMMICH_URL}/api/albums/${process.env.IMMICH_ALBUM_ID}/assets`, {
      method: 'PUT',
      headers: {
        'x-api-key': process.env.IMMICH_API_KEY!,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ids: [assetId] }),
    })
  }

  return assetId
}
