export interface ExportRow {
  date: Date
  type: string
  category: string
  amount: number // satang
  merchantName: string | null
  note: string | null
}

const HEADER = ['Date', 'Type', 'Category', 'Amount (THB)', 'Merchant', 'Note']

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

// Build a Google Sheets / Excel friendly CSV: BOM prefix so Thai text survives,
// CRLF line endings, RFC-4180 quoting. Amounts as plain numbers (satang ÷ 100).
export function transactionsToCsv(rows: ExportRow[]): string {
  const lines = [HEADER, ...rows.map(r => [
    r.date.toISOString().split('T')[0],
    r.type,
    r.category,
    (r.amount / 100).toFixed(2),
    r.merchantName ?? '',
    r.note ?? '',
  ])]
  return '﻿' + lines.map(cols => cols.map(c => csvCell(String(c))).join(',')).join('\r\n')
}
