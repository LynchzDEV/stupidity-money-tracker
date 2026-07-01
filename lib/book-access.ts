import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'

// A user can access a book if they are a member of it (owner or member).
export function memberFilter(userId: string): Prisma.BookWhereInput {
  return { members: { some: { userId } } }
}

export function findAccessibleBook(bookId: string, userId: string) {
  return prisma.book.findFirst({ where: { id: bookId, members: { some: { userId } } } })
}

export function listAccessibleBooks(userId: string) {
  return prisma.book.findMany({
    where: { members: { some: { userId } } },
    include: { _count: { select: { transactions: true } } },
    orderBy: { createdAt: 'asc' },
  })
}

// Create a book and register the creator as its owner in one transaction.
export function createBookWithOwner(
  userId: string,
  data: Omit<Prisma.BookCreateInput, 'user' | 'members'>,
) {
  return prisma.book.create({
    data: {
      ...data,
      user: { connect: { id: userId } },
      members: { create: { userId, role: 'owner' } },
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
