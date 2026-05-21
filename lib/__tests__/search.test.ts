import { describe, it, expect } from 'vitest'
import { isNaturalLanguage, filtersToParams, paramsToFilters } from '../search'

describe('isNaturalLanguage', () => {
  it('returns false for pure number', () => {
    expect(isNaturalLanguage('500')).toBe(false)
  })
  it('returns false for baht-prefixed number', () => {
    expect(isNaturalLanguage('฿500')).toBe(false)
  })
  it('returns false for single word', () => {
    expect(isNaturalLanguage('7-eleven')).toBe(false)
  })
  it('returns false for two words no relational terms', () => {
    expect(isNaturalLanguage('grab food')).toBe(false)
  })
  it('returns true for range expression', () => {
    expect(isNaturalLanguage('around 50-100 baht')).toBe(true)
  })
  it('returns true for place description', () => {
    expect(isNaturalLanguage('food court last week')).toBe(true)
  })
  it('returns true for "more than X"', () => {
    expect(isNaturalLanguage('more than 500 baht')).toBe(true)
  })
  it('returns true for "under X baht"', () => {
    expect(isNaturalLanguage('under 200 baht at market')).toBe(true)
  })
  it('returns false for empty string', () => {
    expect(isNaturalLanguage('')).toBe(false)
  })
})

describe('filtersToParams', () => {
  it('encodes amount range as satang', () => {
    const p = filtersToParams({ amountMin: 50, amountMax: 100 })
    expect(p.get('aiMin')).toBe('5000')
    expect(p.get('aiMax')).toBe('10000')
    expect(p.get('aiMode')).toBe('1')
  })
  it('encodes category and type', () => {
    const p = filtersToParams({ category: 'Food', type: 'expense' })
    expect(p.get('aiCat')).toBe('Food')
    expect(p.get('aiType')).toBe('expense')
  })
  it('encodes keyword', () => {
    const p = filtersToParams({ keyword: 'market' })
    expect(p.get('aiKey')).toBe('market')
  })
  it('encodes date range', () => {
    const p = filtersToParams({ dateFrom: '2026-05-01', dateTo: '2026-05-07' })
    expect(p.get('aiFrom')).toBe('2026-05-01')
    expect(p.get('aiTo')).toBe('2026-05-07')
  })
})

describe('paramsToFilters', () => {
  it('decodes satang params back to filters', () => {
    const sp = new URLSearchParams('aiMin=5000&aiMax=10000&aiMode=1')
    const f = paramsToFilters(sp)
    expect(f.amountMin).toBe(5000)
    expect(f.amountMax).toBe(10000)
  })
  it('returns null when aiMode not set', () => {
    expect(paramsToFilters(new URLSearchParams('q=food'))).toBeNull()
  })
})
