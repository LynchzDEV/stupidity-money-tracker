import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { uploadAsset, getThumbnailUrl } from '../immich'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.IMMICH_URL = 'https://immich.example.com'
  process.env.IMMICH_API_KEY = 'test-key'
  process.env.IMMICH_ALBUM_ID = 'album-123'
})

describe('getThumbnailUrl', () => {
  it('returns correct thumbnail URL', () => {
    const url = getThumbnailUrl('asset-abc')
    expect(url).toBe('/api/immich/asset-abc/thumbnail')
  })
})

describe('uploadAsset', () => {
  it('uploads file and returns assetId', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-asset-id', status: 'created' }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    const buffer = Buffer.from('fake-image-data')
    const assetId = await uploadAsset(buffer, 'receipt.jpg', 'image/jpeg')
    expect(assetId).toBe('new-asset-id')
  })

  it('throws on upload failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })
    const buffer = Buffer.from('fake')
    await expect(uploadAsset(buffer, 'r.jpg', 'image/jpeg')).rejects.toThrow('Immich upload failed: 401')
  })
})
