import { prisma } from './prisma'

const MAX_CATEGORIES = 40

export async function listBookCategories(bookId: string): Promise<string[]> {
  const rows = await prisma.transaction.groupBy({
    by: ['category'],
    where: { bookId },
    _count: { category: true },
    orderBy: { _count: { category: 'desc' } },
    take: MAX_CATEGORIES,
  })

  return rows
    .map(row => row.category)
    .filter((category): category is string => typeof category === 'string' && category.length > 0)
}
