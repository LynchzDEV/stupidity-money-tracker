import { prisma } from './prisma'

export async function buildMerchantSummary(bookId: string): Promise<string> {
  const rows = await prisma.transaction.groupBy({
    by: ['note', 'category'],
    where: { bookId, note: { not: null } },
    _count: { note: true },
    orderBy: { _count: { note: 'desc' } },
    take: 200,
  })

  if (rows.length === 0) return ''

  const map = new Map<string, Map<string, number>>()
  for (const row of rows) {
    if (!row.note) continue
    if (!map.has(row.note)) map.set(row.note, new Map())
    map.get(row.note)!.set(row.category, row._count.note)
  }

  const lines = [...map.entries()]
    .map(([merchant, cats]) => ({
      merchant,
      total: [...cats.values()].reduce((a, b) => a + b, 0),
      cats,
    }))
    .sort((a, b) => b.total - a.total)
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
