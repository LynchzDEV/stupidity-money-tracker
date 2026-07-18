import { describe, it, expect } from 'vitest'
import {
  createQueue,
  markReady,
  markRejected,
  markError,
  resetToReading,
  saveCurrent,
  skipCurrent,
  cancelRemaining,
  currentItem,
  isDone,
  readyCount,
  summary,
} from '../upload-queue'

const seeds = [
  { id: 'a', previewUrl: 'blob:a' },
  { id: 'b', previewUrl: 'blob:b' },
  { id: 'c', previewUrl: 'blob:c' },
]

describe('createQueue', () => {
  it('starts every item reading, pointer at 0', () => {
    const s = createQueue(seeds)
    expect(s.items.map(i => i.status)).toEqual(['reading', 'reading', 'reading'])
    expect(s.currentIndex).toBe(0)
    expect(currentItem(s)?.id).toBe('a')
    expect(isDone(s)).toBe(false)
  })
})

describe('mark*', () => {
  it('markReady attaches extraction and flips status', () => {
    const s = markReady(createQueue(seeds), 'a', 'asset-a', { amount: 100 })
    const a = s.items.find(i => i.id === 'a')!
    expect(a.status).toBe('ready')
    expect(a.assetId).toBe('asset-a')
    expect(a.extraction).toEqual({ amount: 100 })
  })

  it('does not mutate the input state', () => {
    const before = createQueue(seeds)
    const after = markReady(before, 'a', 'asset-a', { amount: 100 })
    expect(before.items[0].status).toBe('reading')
    expect(after).not.toBe(before)
  })

  it('markRejected stores reason', () => {
    const s = markRejected(createQueue(seeds), 'b', 'Not a receipt')
    const b = s.items.find(i => i.id === 'b')!
    expect(b.status).toBe('rejected')
    expect(b.errorMsg).toBe('Not a receipt')
  })

  it('markError stores message', () => {
    const s = markError(createQueue(seeds), 'c', 'HTTP 500')
    const c = s.items.find(i => i.id === 'c')!
    expect(c.status).toBe('error')
    expect(c.errorMsg).toBe('HTTP 500')
  })

  it('resetToReading clears prior error for retry', () => {
    let s = markError(createQueue(seeds), 'a', 'HTTP 500')
    s = resetToReading(s, 'a')
    const a = s.items.find(i => i.id === 'a')!
    expect(a.status).toBe('reading')
    expect(a.errorMsg).toBeUndefined()
  })
})

describe('readyCount', () => {
  it('counts items that finished reading regardless of outcome', () => {
    let s = createQueue(seeds)
    expect(readyCount(s)).toBe(0)
    s = markReady(s, 'a', 'asset-a', { amount: 100 })
    s = markRejected(s, 'b', 'nope')
    expect(readyCount(s)).toBe(2)
  })
})

describe('advance via saveCurrent / skipCurrent', () => {
  it('saveCurrent marks saved, records amount, advances pointer', () => {
    let s = markReady(createQueue(seeds), 'a', 'asset-a', { amount: 250.5 })
    s = saveCurrent(s, 250.5)
    expect(s.items[0].status).toBe('saved')
    expect(s.items[0].savedAmount).toBe(250.5)
    expect(s.currentIndex).toBe(1)
    expect(currentItem(s)?.id).toBe('b')
  })

  it('skipCurrent marks skipped and advances', () => {
    const s = skipCurrent(createQueue(seeds))
    expect(s.items[0].status).toBe('skipped')
    expect(s.currentIndex).toBe(1)
  })

  it('reaching past the last item is done', () => {
    let s = createQueue(seeds)
    s = skipCurrent(s)
    s = skipCurrent(s)
    s = skipCurrent(s)
    expect(isDone(s)).toBe(true)
    expect(currentItem(s)).toBeNull()
  })
})

describe('cancelRemaining', () => {
  it('skips every unprocessed item and marks done', () => {
    let s = markReady(createQueue(seeds), 'a', 'asset-a', { amount: 100 })
    s = saveCurrent(s, 100)
    s = cancelRemaining(s)
    expect(isDone(s)).toBe(true)
    expect(s.items[0].status).toBe('saved')
    expect(s.items[1].status).toBe('skipped')
    expect(s.items[2].status).toBe('skipped')
  })
})

describe('summary', () => {
  const four = [
    { id: 'a', previewUrl: 'blob:a' },
    { id: 'b', previewUrl: 'blob:b' },
    { id: 'c', previewUrl: 'blob:c' },
    { id: 'd', previewUrl: 'blob:d' },
  ]

  it('tallies saved, skipped, failed and sums saved amounts', () => {
    let s = createQueue(four)
    s = markReady(s, 'a', 'asset-a', { amount: 100 })
    s = saveCurrent(s, 100)
    s = markReady(s, 'b', 'asset-b', { amount: 42.5 })
    s = skipCurrent(s)
    s = markRejected(s, 'c', 'not a receipt')
    s = skipCurrent(s)
    s = markError(s, 'd', 'boom')
    s = skipCurrent(s)
    expect(summary(s)).toEqual({ saved: 1, skipped: 1, failed: 2, total: 4, totalAmount: 100 })
  })

  it('skipping a terminal error item keeps it counted as failed, not skipped', () => {
    let s = markError(createQueue([{ id: 'a', previewUrl: 'blob:a' }]), 'a', 'boom')
    s = skipCurrent(s)
    expect(summary(s)).toEqual({ saved: 0, skipped: 0, failed: 1, total: 1, totalAmount: 0 })
  })

  it('counts a skipped-but-readable item as skipped only', () => {
    let s = markReady(createQueue([{ id: 'a', previewUrl: 'blob:a' }]), 'a', 'x', { amount: 10 })
    s = skipCurrent(s)
    expect(summary(s)).toEqual({ saved: 0, skipped: 1, failed: 0, total: 1, totalAmount: 0 })
  })
})
