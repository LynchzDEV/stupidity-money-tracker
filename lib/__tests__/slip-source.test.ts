import { describe, it, expect } from 'vitest'
import { buildSourceMeta, hashFile, pickResumeMarker } from '../slip-source'

describe('buildSourceMeta', () => {
  const now = new Date('2026-07-31T00:00:00Z')

  it('camera capture: no filename, taken time = now', () => {
    const meta = buildSourceMeta({ name: 'capture.jpg', lastModified: now.getTime() }, 'camera', now)
    expect(meta).toEqual({
      uploadSource: 'camera',
      sourceFileName: null,
      sourceTakenAt: now.toISOString(),
    })
  })

  it('gallery file: keeps filename and lastModified as taken time', () => {
    const taken = new Date('2026-07-30T07:22:00Z')
    const meta = buildSourceMeta({ name: 'IMG_1240.HEIC', lastModified: taken.getTime() }, 'gallery', now)
    expect(meta).toEqual({
      uploadSource: 'gallery',
      sourceFileName: 'IMG_1240.HEIC',
      sourceTakenAt: taken.toISOString(),
    })
  })

  it('gallery file without usable lastModified falls back to null taken time', () => {
    const meta = buildSourceMeta({ name: 'IMG_9.jpg', lastModified: 0 }, 'gallery', now)
    expect(meta.sourceTakenAt).toBeNull()
    expect(meta.sourceFileName).toBe('IMG_9.jpg')
  })

  it('gallery file with empty name stores null filename', () => {
    const meta = buildSourceMeta({ name: '', lastModified: now.getTime() }, 'gallery', now)
    expect(meta.sourceFileName).toBeNull()
  })
})

describe('hashFile', () => {
  it('produces the sha256 hex of the blob content', async () => {
    const blob = new Blob(['hello'])
    expect(await hashFile(blob)).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    )
  })

  it('same content same hash, different content different hash', async () => {
    const a = await hashFile(new Blob(['slip-a']))
    const b = await hashFile(new Blob(['slip-a']))
    const c = await hashFile(new Blob(['slip-b']))
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
})

describe('pickResumeMarker', () => {
  const tx = (id: string, takenAt: string | null, createdAt: string) => ({
    id,
    sourceTakenAt: takenAt ? new Date(takenAt) : null,
    createdAt: new Date(createdAt),
  })

  it('returns null for empty list', () => {
    expect(pickResumeMarker([])).toBeNull()
  })

  it('picks max sourceTakenAt regardless of upload order', () => {
    const marker = pickResumeMarker([
      tx('late-upload-old-photo', '2026-07-01T10:00:00Z', '2026-07-30T10:00:00Z'),
      tx('newest-photo', '2026-07-29T18:00:00Z', '2026-07-20T10:00:00Z'),
    ])
    expect(marker?.id).toBe('newest-photo')
  })

  it('falls back to createdAt when sourceTakenAt missing', () => {
    const marker = pickResumeMarker([
      tx('legacy', null, '2026-07-30T10:00:00Z'),
      tx('tracked', '2026-07-29T18:00:00Z', '2026-07-01T10:00:00Z'),
    ])
    expect(marker?.id).toBe('legacy')
  })
})
