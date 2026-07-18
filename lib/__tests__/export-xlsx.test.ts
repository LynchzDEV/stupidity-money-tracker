import { describe, it, expect } from 'vitest'
import { buildTaxSummary, transactionsToXlsx, type ExportRow } from '../export-xlsx'

function row(partial: Partial<ExportRow>): ExportRow {
  return {
    date: new Date('2026-01-15'),
    type: 'expense',
    category: 'Food',
    amount: 10000,
    merchantName: null,
    note: null,
    ...partial,
  }
}

describe('buildTaxSummary', () => {
  it('returns zeros for no rows', () => {
    const s = buildTaxSummary([])
    expect(s.totals).toEqual({ income: 0, expense: 0, net: 0 })
    expect(s.byMonth).toEqual([])
    expect(s.byCategory).toEqual([])
  })

  it('sums income and expense in satang and nets them', () => {
    const s = buildTaxSummary([
      row({ type: 'income', amount: 500000 }),
      row({ type: 'expense', amount: 120000 }),
      row({ type: 'expense', amount: 30000 }),
    ])
    expect(s.totals).toEqual({ income: 500000, expense: 150000, net: 350000 })
  })

  it('groups by YYYY-MM ascending', () => {
    const s = buildTaxSummary([
      row({ date: new Date('2026-03-02'), type: 'income', amount: 100 }),
      row({ date: new Date('2026-01-31'), type: 'expense', amount: 200 }),
      row({ date: new Date('2026-01-01'), type: 'income', amount: 300 }),
    ])
    expect(s.byMonth.map(m => m.month)).toEqual(['2026-01', '2026-03'])
    expect(s.byMonth[0]).toEqual({ month: '2026-01', income: 300, expense: 200, net: 100 })
    expect(s.byMonth[1]).toEqual({ month: '2026-03', income: 100, expense: 0, net: 100 })
  })

  it('groups by category ascending with income/expense split', () => {
    const s = buildTaxSummary([
      row({ category: 'Salary', type: 'income', amount: 900000 }),
      row({ category: 'Food', type: 'expense', amount: 25000 }),
      row({ category: 'Food', type: 'expense', amount: 15000 }),
      row({ category: 'Food', type: 'income', amount: 5000 }),
    ])
    expect(s.byCategory.map(c => c.category)).toEqual(['Food', 'Salary'])
    expect(s.byCategory[0]).toEqual({ category: 'Food', income: 5000, expense: 40000, net: -35000 })
    expect(s.byCategory[1]).toEqual({ category: 'Salary', income: 900000, expense: 0, net: 900000 })
  })
})

describe('transactionsToXlsx', () => {
  it('produces a non-empty xlsx buffer with the ZIP magic bytes', async () => {
    const buf = await transactionsToXlsx(
      [row({ type: 'income', amount: 500000, merchantName: 'ACME', note: 'test' })],
      'My Book',
    )
    expect(buf.length).toBeGreaterThan(0)
    // .xlsx is a ZIP container — first two bytes are "PK"
    expect(buf[0]).toBe(0x50)
    expect(buf[1]).toBe(0x4b)
  })
})
