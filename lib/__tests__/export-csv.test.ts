import { describe, it, expect } from 'vitest'
import { transactionsToCsv } from '../export-csv'

const row = (over: Partial<Parameters<typeof transactionsToCsv>[0][number]> = {}) => ({
  date: new Date('2026-07-01T08:30:00Z'),
  type: 'expense',
  category: 'Food',
  amount: 12950,
  merchantName: '7-Eleven',
  note: null,
  ...over,
})

describe('transactionsToCsv', () => {
  it('starts with a UTF-8 BOM and a header row', () => {
    const csv = transactionsToCsv([])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.slice(1)).toBe('Date,Type,Category,Amount (THB),Merchant,Note')
  })

  it('formats a row: ISO date, satang to THB with 2 decimals', () => {
    const csv = transactionsToCsv([row()])
    expect(csv.split('\r\n')[1]).toBe('2026-07-01,expense,Food,129.50,7-Eleven,')
  })

  it('quotes and escapes cells containing commas, quotes, or newlines', () => {
    const csv = transactionsToCsv([row({ note: 'lunch, "big", two\nlines', merchantName: 'A,B' })])
    const line = csv.split('\r\n')[1]
    expect(line).toContain('"A,B"')
    expect(line).toContain('"lunch, ""big"", two\nlines"')
  })

  it('renders null merchant and note as empty cells', () => {
    const csv = transactionsToCsv([row({ merchantName: null, note: null })])
    expect(csv.split('\r\n')[1]).toBe('2026-07-01,expense,Food,129.50,,')
  })
})
