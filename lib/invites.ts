import { prisma } from './prisma'

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function listMyInvites(email: string) {
  return prisma.bookInvite.findMany({
    where: { email: normalizeEmail(email) },
    include: { book: { select: { id: true, name: true, emoji: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

// Invite a gmail to a book. If that user already signed in once, add them as a
// member directly; otherwise store a pending invite resolved on their next login.
// No email is ever sent — the invite surfaces in-app on the books page.
export async function inviteToBook(
  bookId: string,
  rawEmail: string,
  invitedByEmail: string | null,
): Promise<{ status: 'added' | 'invited' | 'already-member' }> {
  const email = normalizeEmail(rawEmail)
  const user = await prisma.user.findUnique({ where: { email } })

  if (user) {
    const existing = await prisma.bookMember.findUnique({
      where: { bookId_userId: { bookId, userId: user.id } },
    })
    if (existing) return { status: 'already-member' }
    await prisma.bookMember.create({ data: { bookId, userId: user.id, role: 'member' } })
    return { status: 'added' }
  }

  await prisma.bookInvite.upsert({
    where: { bookId_email: { bookId, email } },
    create: { bookId, email, invitedByEmail },
    update: { invitedByEmail },
  })
  return { status: 'invited' }
}

export async function acceptInvite(inviteId: string, userId: string, userEmail: string) {
  const invite = await prisma.bookInvite.findUnique({ where: { id: inviteId } })
  if (!invite || invite.email !== normalizeEmail(userEmail)) return null

  await prisma.$transaction([
    prisma.bookMember.upsert({
      where: { bookId_userId: { bookId: invite.bookId, userId } },
      create: { bookId: invite.bookId, userId, role: invite.role },
      update: {},
    }),
    prisma.bookInvite.delete({ where: { id: inviteId } }),
  ])
  return invite.bookId
}

export async function declineInvite(inviteId: string, userEmail: string) {
  const invite = await prisma.bookInvite.findUnique({ where: { id: inviteId } })
  if (!invite || invite.email !== normalizeEmail(userEmail)) return false
  await prisma.bookInvite.delete({ where: { id: inviteId } })
  return true
}
