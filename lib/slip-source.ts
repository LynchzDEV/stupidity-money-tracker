export type UploadSource = 'camera' | 'gallery'

export interface SourceMeta {
  uploadSource: UploadSource
  sourceFileName: string | null
  sourceTakenAt: string | null
}

export function buildSourceMeta(
  file: { name?: string; lastModified?: number },
  source: UploadSource,
  now: Date = new Date(),
): SourceMeta {
  if (source === 'camera') {
    return { uploadSource: 'camera', sourceFileName: null, sourceTakenAt: now.toISOString() }
  }
  return {
    uploadSource: 'gallery',
    sourceFileName: file.name || null,
    sourceTakenAt: file.lastModified ? new Date(file.lastModified).toISOString() : null,
  }
}

export async function hashFile(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export interface ResumeCandidate {
  id: string
  sourceTakenAt: Date | null
  createdAt: Date
}

export function pickResumeMarker<T extends ResumeCandidate>(transactions: T[]): T | null {
  if (transactions.length === 0) return null
  return transactions.reduce((best, tx) => {
    const bestTime = (best.sourceTakenAt ?? best.createdAt).getTime()
    const txTime = (tx.sourceTakenAt ?? tx.createdAt).getTime()
    return txTime > bestTime ? tx : best
  })
}
