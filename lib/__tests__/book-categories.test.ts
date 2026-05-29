import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../prisma', () => ({
  prisma: {
    transaction: {
      groupBy: vi.fn(),
    },
  },
}))

import { prisma } from '../prisma'
import { listBookCategories } from '../book-categories'

const mockGroupBy = prisma.transaction.groupBy as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('listBookCategories', () => {
  it('returns empty array when book has no transactions', async () => {
    mockGroupBy.mockResolvedValueOnce([])
    const result = await listBookCategories('book-1')
    expect(result).toEqual([])
  })

  it('returns categories ordered by usage count desc', async () => {
    mockGroupBy.mockResolvedValueOnce([
      { category: 'Food', _count: { category: 20 } },
      { category: 'ชาร์จรถไฟฟ้า', _count: { category: 8 } },
      { category: 'Transport', _count: { category: 3 } },
    ])
    const result = await listBookCategories('book-1')
    expect(result).toEqual(['Food', 'ชาร์จรถไฟฟ้า', 'Transport'])
  })

  it('filters out empty or non-string category values', async () => {
    mockGroupBy.mockResolvedValueOnce([
      { category: 'Food', _count: { category: 5 } },
      { category: '', _count: { category: 2 } },
      { category: null, _count: { category: 1 } },
    ])
    const result = await listBookCategories('book-1')
    expect(result).toEqual(['Food'])
  })

  it('queries with the correct bookId scope', async () => {
    mockGroupBy.mockResolvedValueOnce([])
    await listBookCategories('book-abc')
    expect(mockGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['category'],
        where: { bookId: 'book-abc' },
      }),
    )
  })
})
