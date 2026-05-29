import { describe, it, expect } from 'vitest'
import { periodOf, clampDay, isRuleDue, dueDateForToday, type RecurrenceState } from '../recurring'

const base: RecurrenceState = {
  dayOfMonth: 1,
  startPeriod: '2026-01',
  endPeriod: null,
  lastRunPeriod: null,
  isActive: true,
}

describe('periodOf', () => {
  it('formats a date as zero-padded YYYY-MM', () => {
    expect(periodOf(new Date(2026, 0, 5))).toBe('2026-01')
    expect(periodOf(new Date(2026, 11, 31))).toBe('2026-12')
  })
})

describe('clampDay', () => {
  it('returns the day unchanged when the month is long enough', () => {
    expect(clampDay(2026, 5, 15)).toBe(15)
    expect(clampDay(2026, 1, 31)).toBe(31)
  })

  it('clamps day 31 down to the last day of a short month', () => {
    expect(clampDay(2026, 4, 31)).toBe(30)
    expect(clampDay(2026, 2, 31)).toBe(28)
  })

  it('respects leap-year February', () => {
    expect(clampDay(2028, 2, 31)).toBe(29)
  })
})

describe('isRuleDue', () => {
  it('is due when active, in range, day reached, and not yet run this period', () => {
    const rule = { ...base, dayOfMonth: 10 }
    expect(isRuleDue(rule, new Date(2026, 4, 10))).toBe(true)
    expect(isRuleDue(rule, new Date(2026, 4, 25))).toBe(true)
  })

  it('is not due before the day-of-month is reached', () => {
    const rule = { ...base, dayOfMonth: 10 }
    expect(isRuleDue(rule, new Date(2026, 4, 9))).toBe(false)
  })

  it('is not due when already run this period', () => {
    const rule = { ...base, dayOfMonth: 10, lastRunPeriod: '2026-05' }
    expect(isRuleDue(rule, new Date(2026, 4, 20))).toBe(false)
  })

  it('becomes due again the next period after being run', () => {
    const rule = { ...base, dayOfMonth: 10, lastRunPeriod: '2026-05' }
    expect(isRuleDue(rule, new Date(2026, 5, 10))).toBe(true)
  })

  it('is not due before the start period', () => {
    const rule = { ...base, dayOfMonth: 1, startPeriod: '2026-06' }
    expect(isRuleDue(rule, new Date(2026, 4, 15))).toBe(false)
  })

  it('is not due after the end period', () => {
    const rule = { ...base, dayOfMonth: 1, endPeriod: '2026-04' }
    expect(isRuleDue(rule, new Date(2026, 4, 15))).toBe(false)
  })

  it('is not due when inactive', () => {
    const rule = { ...base, dayOfMonth: 1, isActive: false }
    expect(isRuleDue(rule, new Date(2026, 4, 15))).toBe(false)
  })

  it('clamps the day for short months so end-of-month rules still fire', () => {
    const rule = { ...base, dayOfMonth: 31 }
    expect(isRuleDue(rule, new Date(2026, 1, 28))).toBe(true)
  })
})

describe('dueDateForToday', () => {
  it('returns the clamped due date in the current period', () => {
    const rule = { ...base, dayOfMonth: 31 }
    expect(dueDateForToday(rule, new Date(2026, 1, 28))).toEqual(new Date(2026, 1, 28))
  })

  it('returns the exact day when the month is long enough', () => {
    const rule = { ...base, dayOfMonth: 15 }
    expect(dueDateForToday(rule, new Date(2026, 4, 20))).toEqual(new Date(2026, 4, 15))
  })
})
