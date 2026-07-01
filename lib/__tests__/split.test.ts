import { describe, it, expect } from 'vitest'
import { computeEqualShares, sharesSumTo } from '../split'

describe('computeEqualShares', () => {
  it('splits an evenly divisible total equally', () => {
    const shares = computeEqualShares(30000, ['a', 'b', 'c'])
    expect(shares).toEqual([
      { userId: 'a', amount: 10000 },
      { userId: 'b', amount: 10000 },
      { userId: 'c', amount: 10000 },
    ])
  })

  it('spreads the remainder one satang at a time and preserves the total', () => {
    const shares = computeEqualShares(10000, ['a', 'b', 'c'])
    expect(shares.map(s => s.amount)).toEqual([3334, 3333, 3333])
    expect(shares.reduce((s, x) => s + x.amount, 0)).toBe(10000)
  })

  it('handles a single member taking the whole amount', () => {
    expect(computeEqualShares(4567, ['solo'])).toEqual([{ userId: 'solo', amount: 4567 }])
  })

  it('returns nothing for no members', () => {
    expect(computeEqualShares(1000, [])).toEqual([])
  })

  it('never loses a satang for an awkward total', () => {
    const shares = computeEqualShares(10001, ['a', 'b', 'c', 'd', 'e', 'f', 'g'])
    expect(sharesSumTo(10001, shares)).toBe(true)
  })
})

describe('sharesSumTo', () => {
  it('is true only when manual shares add up to the total', () => {
    expect(sharesSumTo(500, [{ userId: 'a', amount: 200 }, { userId: 'b', amount: 300 }])).toBe(true)
    expect(sharesSumTo(500, [{ userId: 'a', amount: 200 }, { userId: 'b', amount: 250 }])).toBe(false)
  })
})
