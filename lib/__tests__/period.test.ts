import { describe, it, expect } from 'vitest'
import { currentPeriod, daysUntil } from '../period'

describe('currentPeriod', () => {
  it('matches the calendar month when resetDay is 1', () => {
    const { start, end } = currentPeriod(new Date(2026, 5, 15), 1)
    expect(start).toEqual(new Date(2026, 5, 1))
    expect(end).toEqual(new Date(2026, 6, 1))
  })

  it('uses this month when today is on or after the reset day', () => {
    const { start, end } = currentPeriod(new Date(2026, 5, 25), 25)
    expect(start).toEqual(new Date(2026, 5, 25))
    expect(end).toEqual(new Date(2026, 6, 25))
  })

  it('uses last month when today is before the reset day', () => {
    const { start, end } = currentPeriod(new Date(2026, 5, 10), 25)
    expect(start).toEqual(new Date(2026, 4, 25))
    expect(end).toEqual(new Date(2026, 5, 25))
  })

  it('clamps reset day 31 to month-end across short months', () => {
    const feb = currentPeriod(new Date(2026, 1, 28), 31)
    expect(feb.start).toEqual(new Date(2026, 1, 28))
    expect(feb.end).toEqual(new Date(2026, 2, 31))
  })

  it('rolls the year over when the period spans December', () => {
    const { start, end } = currentPeriod(new Date(2026, 11, 20), 25)
    expect(start).toEqual(new Date(2026, 10, 25))
    expect(end).toEqual(new Date(2026, 11, 25))
  })
})

describe('daysUntil', () => {
  it('counts whole days from today to the period end', () => {
    expect(daysUntil(new Date(2026, 5, 20), new Date(2026, 5, 25))).toBe(5)
  })

  it('never goes negative', () => {
    expect(daysUntil(new Date(2026, 5, 26), new Date(2026, 5, 25))).toBe(0)
  })
})
