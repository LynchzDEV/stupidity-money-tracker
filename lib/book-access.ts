import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'

// A user can access a book if they are a member of it (owner or member).
export function memberFilter(userId: string): Prisma.BookWhereInput {
  return { members: { some: { userId } } }
}

export async function findAccessibleBook(bookId: string, userId: string) {
  const book = await prisma.book.findFirst({
    where: { id: bookId, members: { some: { userId } } },
    include: { members: { where: { userId }, select: { isDefault: true } } },
  })
  if (!book) return null
  const { members, ...rest } = book
  return { ...rest, isDefault: members[0]?.isDefault ?? false }
}

export async function listAccessibleBooks(userId: string) {
  const books = await prisma.book.findMany({
    where: { members: { some: { userId } } },
    include: {
      _count: { select: { transactions: true } },
      members: { where: { userId }, select: { isDefault: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return books.map(({ members, ...b }) => ({ ...b, isDefault: members[0]?.isDefault ?? false }))
}

// Create a book and register the creator as its owner in one transaction.
export function createBookWithOwner(
  userId: string,
  data: Omit<Prisma.BookCreateInput, 'user' | 'members'>,
  opts?: { isDefault?: boolean },
) {
  return prisma.book.create({
    data: {
      ...data,
      user: { connect: { id: userId } },
      members: { create: { userId, role: 'owner', isDefault: opts?.isDefault ?? false } },
    },
  })
}

export async function getBookRole(bookId: string, userId: string): Promise<string | null> {
  const member = await prisma.bookMember.findUnique({
    where: { bookId_userId: { bookId, userId } },
    select: { role: true },
  })
  return member?.role ?? null
}
