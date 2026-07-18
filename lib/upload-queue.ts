export type QueueStatus =
  | 'reading'
  | 'ready'
  | 'rejected'
  | 'error'
  | 'saved'
  | 'skipped'

export interface QueueExtraction {
  amount?: number
  type?: string
  category?: string
  date?: string
  note?: string
  merchantName?: string
  confidence?: { amount: number; type: number; category: number; date: number }
}

export interface QueueItem {
  id: string
  previewUrl: string
  status: QueueStatus
  assetId?: string
  extraction?: QueueExtraction
  errorMsg?: string
  savedAmount?: number
}

export interface QueueState {
  items: QueueItem[]
  currentIndex: number
}

interface Seed {
  id: string
  previewUrl: string
}

export function createQueue(seeds: Seed[]): QueueState {
  return {
    items: seeds.map(s => ({ id: s.id, previewUrl: s.previewUrl, status: 'reading' })),
    currentIndex: 0,
  }
}

function patchItem(state: QueueState, id: string, patch: Partial<QueueItem>): QueueState {
  return {
    ...state,
    items: state.items.map(item => (item.id === id ? { ...item, ...patch } : item)),
  }
}

export function markReady(
  state: QueueState,
  id: string,
  assetId: string,
  extraction: QueueExtraction,
): QueueState {
  return patchItem(state, id, { status: 'ready', assetId, extraction, errorMsg: undefined })
}

export function markRejected(state: QueueState, id: string, reason: string): QueueState {
  return patchItem(state, id, { status: 'rejected', errorMsg: reason })
}

export function markError(state: QueueState, id: string, msg: string): QueueState {
  return patchItem(state, id, { status: 'error', errorMsg: msg })
}

export function resetToReading(state: QueueState, id: string): QueueState {
  return patchItem(state, id, { status: 'reading', errorMsg: undefined })
}

export function saveCurrent(state: QueueState, amount: number): QueueState {
  const item = currentItem(state)
  if (!item) return state
  const next = patchItem(state, item.id, { status: 'saved', savedAmount: amount })
  return { ...next, currentIndex: state.currentIndex + 1 }
}

export function skipCurrent(state: QueueState): QueueState {
  const item = currentItem(state)
  if (!item) return state
  const skippable = item.status === 'ready' || item.status === 'reading'
  const next = skippable ? patchItem(state, item.id, { status: 'skipped' }) : state
  return { ...next, currentIndex: state.currentIndex + 1 }
}

export function cancelRemaining(state: QueueState): QueueState {
  return {
    items: state.items.map((item, i) =>
      i >= state.currentIndex && (item.status === 'reading' || item.status === 'ready')
        ? { ...item, status: 'skipped' }
        : item,
    ),
    currentIndex: state.items.length,
  }
}

export function currentItem(state: QueueState): QueueItem | null {
  return state.items[state.currentIndex] ?? null
}

export function isDone(state: QueueState): boolean {
  return state.currentIndex >= state.items.length
}

export function readyCount(state: QueueState): number {
  return state.items.filter(i => i.status !== 'reading').length
}

export interface QueueSummary {
  saved: number
  skipped: number
  failed: number
  total: number
  totalAmount: number
}

export function summary(state: QueueState): QueueSummary {
  return state.items.reduce<QueueSummary>(
    (acc, item) => {
      if (item.status === 'saved') {
        acc.saved += 1
        acc.totalAmount += item.savedAmount ?? 0
      } else if (item.status === 'skipped') {
        acc.skipped += 1
      } else if (item.status === 'rejected' || item.status === 'error') {
        acc.failed += 1
      }
      return acc
    },
    { saved: 0, skipped: 0, failed: 0, total: state.items.length, totalAmount: 0 },
  )
}
