import ExcelJS from 'exceljs'

export interface ExportRow {
  date: Date
  type: string
  category: string
  amount: number // satang
  merchantName: string | null
  note: string | null
}

interface MonthTotal {
  month: string // YYYY-MM
  income: number
  expense: number
  net: number
}

interface CategoryTotal {
  category: string
  income: number
  expense: number
  net: number
}

export interface TaxSummary {
  totals: { income: number; expense: number; net: number }
  byMonth: MonthTotal[]
  byCategory: CategoryTotal[]
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function buildTaxSummary(rows: ExportRow[]): TaxSummary {
  const totals = { income: 0, expense: 0 }
  const months = new Map<string, { income: number; expense: number }>()
  const categories = new Map<string, { income: number; expense: number }>()

  for (const r of rows) {
    const bucket = r.type === 'income' ? 'income' : 'expense'
    totals[bucket] += r.amount

    const mKey = monthKey(r.date)
    const m = months.get(mKey) ?? { income: 0, expense: 0 }
    m[bucket] += r.amount
    months.set(mKey, m)

    const c = categories.get(r.category) ?? { income: 0, expense: 0 }
    c[bucket] += r.amount
    categories.set(r.category, c)
  }

  return {
    totals: { income: totals.income, expense: totals.expense, net: totals.income - totals.expense },
    byMonth: [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, income: v.income, expense: v.expense, net: v.income - v.expense })),
    byCategory: [...categories.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, v]) => ({ category, income: v.income, expense: v.expense, net: v.income - v.expense })),
  }
}

const THB = '"฿"#,##0.00'
const ACCENT = 'FF0E5C3A'
const INCOME = 'FF0E7A3A'
const EXPENSE = 'FFB4442A'
const HEADER_TEXT = 'FFFFFFFF'
const ZEBRA = 'FFF3F1EC'

function toThb(satang: number): number {
  return satang / 100
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: HEADER_TEXT }, size: 11 }
  row.height = 20
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT } }
    cell.alignment = { vertical: 'middle' }
  })
}

function netFont(net: number) {
  return { bold: true, color: { argb: net < 0 ? EXPENSE : INCOME } }
}

export async function transactionsToXlsx(rows: ExportRow[], bookName: string): Promise<Buffer> {
  const summary = buildTaxSummary(rows)
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SlipTrack'
  wb.created = rows[0]?.date ?? new Date(0)

  // ---- Summary sheet ----
  const sum = wb.addWorksheet('Summary', {
    properties: { defaultColWidth: 16 },
    views: [{ showGridLines: false }],
  })
  sum.columns = [{ width: 22 }, { width: 16 }, { width: 16 }, { width: 16 }]

  const title = sum.addRow([`Tax Summary — ${bookName}`])
  title.font = { bold: true, size: 16, color: { argb: ACCENT } }
  sum.mergeCells(title.number, 1, title.number, 4)
  sum.addRow([])

  const totalsHeader = sum.addRow(['Totals', 'Income', 'Expense', 'Net'])
  styleHeader(totalsHeader)
  const totalsRow = sum.addRow([
    'All time',
    toThb(summary.totals.income),
    toThb(summary.totals.expense),
    toThb(summary.totals.net),
  ])
  ;[2, 3, 4].forEach(c => (totalsRow.getCell(c).numFmt = THB))
  totalsRow.getCell(2).font = { bold: true, color: { argb: INCOME } }
  totalsRow.getCell(3).font = { bold: true, color: { argb: EXPENSE } }
  totalsRow.getCell(4).font = netFont(summary.totals.net)
  sum.addRow([])

  // Monthly breakdown
  const monthHeader = sum.addRow(['Month', 'Income', 'Expense', 'Net'])
  styleHeader(monthHeader)
  summary.byMonth.forEach((m, i) => {
    const r = sum.addRow([m.month, toThb(m.income), toThb(m.expense), toThb(m.net)])
    ;[2, 3, 4].forEach(c => (r.getCell(c).numFmt = THB))
    r.getCell(4).font = netFont(m.net)
    if (i % 2 === 1) r.eachCell(cell => (cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }))
  })
  sum.addRow([])

  // Category summary
  const catHeader = sum.addRow(['Category', 'Income', 'Expense', 'Net'])
  styleHeader(catHeader)
  summary.byCategory.forEach((c, i) => {
    const r = sum.addRow([c.category, toThb(c.income), toThb(c.expense), toThb(c.net)])
    ;[2, 3, 4].forEach(col => (r.getCell(col).numFmt = THB))
    r.getCell(4).font = netFont(c.net)
    if (i % 2 === 1) r.eachCell(cell => (cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }))
  })

  // ---- Transactions sheet ----
  const ws = wb.addWorksheet('Transactions', { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Type', key: 'type', width: 10 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Amount (THB)', key: 'amount', width: 15 },
    { header: 'Merchant', key: 'merchant', width: 22 },
    { header: 'Note', key: 'note', width: 34 },
  ]
  styleHeader(ws.getRow(1))
  ws.autoFilter = { from: 'A1', to: 'F1' }

  rows.forEach((r, i) => {
    const row = ws.addRow({
      date: r.date.toISOString().split('T')[0],
      type: r.type,
      category: r.category,
      amount: toThb(r.amount),
      merchant: r.merchantName ?? '',
      note: r.note ?? '',
    })
    row.getCell('amount').numFmt = THB
    row.getCell('type').font = { color: { argb: r.type === 'income' ? INCOME : EXPENSE }, bold: true }
    if (i % 2 === 1) row.eachCell(cell => (cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }))
  })

  return Buffer.from(await wb.xlsx.writeBuffer())
}
