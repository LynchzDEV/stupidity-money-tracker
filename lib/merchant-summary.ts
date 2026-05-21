import { prisma } from './prisma'

export async function buildMerchantSummary(bookId: string): Promise<string> {
  const [namedRows, legacyRows] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['merchantName', 'category'],
      where: { bookId, merchantName: { not: null } },
      _count: { merchantName: true },
      orderBy: { _count: { merchantName: 'desc' } },
      take: 200,
    }),
    prisma.transaction.groupBy({
      by: ['note', 'category'],
      where: { bookId, merchantName: null, note: { not: null } },
      _count: { note: true },
      orderBy: { _count: { note: 'desc' } },
      take: 200,
    }),
  ])

  const map = new Map<string, Map<string, number>>()

  for (const row of namedRows) {
    if (!row.merchantName) continue
    if (!map.has(row.merchantName)) map.set(row.merchantName, new Map())
    map.get(row.merchantName)!.set(row.category, row._count.merchantName)
  }

  for (const row of legacyRows) {
    if (!row.note) continue
    if (!map.has(row.note)) map.set(row.note, new Map())
    map.get(row.note)!.set(row.category, row._count.note)
  }

  if (map.size === 0) return ''

  const lines = [...map.entries()]
    .map(([merchant, cats]) => ({
      merchant,
      total: [...cats.values()].reduce((a, b) => a + b, 0),
      cats,
    }))
    .sort((a, b) => b.total - a.total || a.merchant.localeCompare(b.merchant))
    .slice(0, 50)
    .map(({ merchant, cats }) => {
      const catStr = [...cats.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([cat, n]) => `${cat}×${n}`)
        .join(', ')
      return `${merchant}: ${catStr}`
    })

  return lines.join('\n')
}
