import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../prisma', () => ({
  prisma: {
    transaction: {
      groupBy: vi.fn(),
    },
  },
}))

import { prisma } from '../prisma'
import { buildMerchantSummary } from '../merchant-summary'

const mockGroupBy = prisma.transaction.groupBy as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('buildMerchantSummary', () => {
  it('returns empty string when no transactions exist', async () => {
    mockGroupBy.mockResolvedValueOnce([])
    const result = await buildMerchantSummary('book-1')
    expect(result).toBe('')
  })

  it('formats a single merchant with one category', async () => {
    mockGroupBy.mockResolvedValueOnce([
      { note: 'LINE MAN', category: 'Food', _count: { note: 15 } },
    ])
    const result = await buildMerchantSummary('book-1')
    expect(result).toBe('LINE MAN: Food×15')
  })

  it('formats a merchant with multiple categories, sorted by count desc', async () => {
    mockGroupBy.mockResolvedValueOnce([
      { note: 'LINE MAN', category: 'Food', _count: { note: 15 } },
      { note: 'LINE MAN', category: 'Transport', _count: { note: 4 } },
    ])
    const result = await buildMerchantSummary('book-1')
    expect(result).toBe('LINE MAN: Food×15, Transport×4')
  })

  it('lists multiple merchants sorted by total usage desc', async () => {
    mockGroupBy.mockResolvedValueOnce([
      { note: 'LINE MAN', category: 'Food', _count: { note: 15 } },
      { note: 'Grab', category: 'Food', _count: { note: 8 } },
      { note: 'LINE MAN', category: 'Transport', _count: { note: 4 } },
    ])
    const result = await buildMerchantSummary('book-1')
    const lines = result.split('\n')
    expect(lines[0]).toBe('LINE MAN: Food×15, Transport×4')
    expect(lines[1]).toBe('Grab: Food×8')
  })

  it('skips rows with null note', async () => {
    mockGroupBy.mockResolvedValueOnce([
      { note: null, category: 'Food', _count: { note: 5 } },
      { note: 'LINE MAN', category: 'Food', _count: { note: 3 } },
    ])
    const result = await buildMerchantSummary('book-1')
    expect(result).toBe('LINE MAN: Food×3')
  })

  it('queries with correct bookId and null filter', async () => {
    mockGroupBy.mockResolvedValueOnce([])
    await buildMerchantSummary('book-abc')
    expect(mockGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bookId: 'book-abc', note: { not: null } },
      }),
    )
  })
})
