import { describe, it, expect } from 'vitest'
import { formatTHB, satangToTHB, thbToSatang, cn } from '../utils'

describe('thbToSatang', () => {
  it('converts whole baht to satang', () => {
    expect(thbToSatang(500)).toBe(50000)
  })
  it('converts decimal baht', () => {
    expect(thbToSatang(79.5)).toBe(7950)
  })
  it('rounds to nearest satang', () => {
    expect(thbToSatang(10.001)).toBe(1000)
  })
})

describe('satangToTHB', () => {
  it('converts satang to baht number', () => {
    expect(satangToTHB(50000)).toBe(500)
  })
  it('converts satang with decimal', () => {
    expect(satangToTHB(7950)).toBe(79.5)
  })
})

describe('formatTHB', () => {
  it('formats whole baht from satang', () => {
    expect(formatTHB(50000)).toBe('฿500.00')
  })
  it('formats with thousands separator', () => {
    expect(formatTHB(1000000)).toBe('฿10,000.00')
  })
  it('formats small amount', () => {
    expect(formatTHB(7950)).toBe('฿79.50')
  })
})

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })
  it('handles conditional classes', () => {
    expect(cn('base', false && 'skip', 'keep')).toBe('base keep')
  })
})
