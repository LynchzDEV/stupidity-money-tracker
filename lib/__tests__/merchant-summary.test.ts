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
    mockGroupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([])
    const result = await buildMerchantSummary('book-1')
    expect(result).toBe('')
  })

  it('formats a single named merchant with one category', async () => {
    mockGroupBy
      .mockResolvedValueOnce([
        { merchantName: 'LINE MAN', category: 'Food', _count: { merchantName: 15 } },
      ])
      .mockResolvedValueOnce([])
    const result = await buildMerchantSummary('book-1')
    expect(result).toBe('LINE MAN: Food×15')
  })

  it('formats a named merchant with multiple categories, sorted by count desc', async () => {
    mockGroupBy
      .mockResolvedValueOnce([
        { merchantName: 'LINE MAN', category: 'Food', _count: { merchantName: 15 } },
        { merchantName: 'LINE MAN', category: 'Transport', _count: { merchantName: 4 } },
      ])
      .mockResolvedValueOnce([])
    const result = await buildMerchantSummary('book-1')
    expect(result).toBe('LINE MAN: Food×15, Transport×4')
  })

  it('lists multiple named merchants sorted by total usage desc', async () => {
    mockGroupBy
      .mockResolvedValueOnce([
        { merchantName: 'LINE MAN', category: 'Food', _count: { merchantName: 15 } },
        { merchantName: 'Grab', category: 'Food', _count: { merchantName: 8 } },
        { merchantName: 'LINE MAN', category: 'Transport', _count: { merchantName: 4 } },
      ])
      .mockResolvedValueOnce([])
    const result = await buildMerchantSummary('book-1')
    const lines = result.split('\n')
    expect(lines[0]).toBe('LINE MAN: Food×15, Transport×4')
    expect(lines[1]).toBe('Grab: Food×8')
  })

  it('falls back to note for legacy rows without merchantName', async () => {
    mockGroupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { note: 'Old Merchant', category: 'Shopping', _count: { note: 5 } },
      ])
    const result = await buildMerchantSummary('book-1')
    expect(result).toBe('Old Merchant: Shopping×5')
  })

  it('merges named and legacy rows, sorted by total', async () => {
    mockGroupBy
      .mockResolvedValueOnce([
        { merchantName: 'LINE MAN', category: 'Food', _count: { merchantName: 10 } },
      ])
      .mockResolvedValueOnce([
        { note: 'Legacy Shop', category: 'Shopping', _count: { note: 20 } },
      ])
    const result = await buildMerchantSummary('book-1')
    const lines = result.split('\n')
    expect(lines[0]).toBe('Legacy Shop: Shopping×20')
    expect(lines[1]).toBe('LINE MAN: Food×10')
  })

  it('caps output at 50 merchants even when more exist', async () => {
    const manyMerchants = Array.from({ length: 60 }, (_, i) => ({
      merchantName: `Merchant ${i + 1}`,
      category: 'Food',
      _count: { merchantName: 60 - i },
    }))
    mockGroupBy.mockResolvedValueOnce(manyMerchants).mockResolvedValueOnce([])
    const result = await buildMerchantSummary('book-1')
    const lines = result.split('\n')
    expect(lines).toHaveLength(50)
    expect(lines[0]).toBe('Merchant 1: Food×60')
    expect(lines[49]).toBe('Merchant 50: Food×11')
  })

  it('queries named rows with correct bookId and filter', async () => {
    mockGroupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([])
    await buildMerchantSummary('book-abc')
    expect(mockGroupBy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { bookId: 'book-abc', merchantName: { not: null } },
      }),
    )
  })

  it('queries legacy rows with correct bookId and null merchantName filter', async () => {
    mockGroupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([])
    await buildMerchantSummary('book-abc')
    expect(mockGroupBy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { bookId: 'book-abc', merchantName: null, note: { not: null } },
      }),
    )
  })
})
