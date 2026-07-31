import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { UploadPageClient } from './client'
import { listDueReminders } from '@/lib/recurring-reminders'
import { findAccessibleBook, listAccessibleBooks } from '@/lib/book-access'
import { prisma } from '@/lib/prisma'
import { pickResumeMarker } from '@/lib/slip-source'

export default async function UploadPage({ params }: { params: Promise<{ bookId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { bookId } = await params
  const book = await findAccessibleBook(bookId, session.user.id)
  if (!book) notFound()

  const books = await listAccessibleBooks(session.user.id)

  const dueCount = (await listDueReminders(bookId)).length

  const recentSlips = await prisma.transaction.findMany({
    where: {
      immichAssetId: { not: null },
      book: { members: { some: { userId: session.user.id } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      bookId: true,
      merchantName: true,
      amount: true,
      immichAssetId: true,
      uploadSource: true,
      sourceFileName: true,
      sourceTakenAt: true,
      createdAt: true,
    },
  })
  const marker = pickResumeMarker(recentSlips)
  const resumeMarker = marker && {
    id: marker.id,
    bookId: marker.bookId,
    merchantName: marker.merchantName,
    amount: marker.amount,
    immichAssetId: marker.immichAssetId!,
    uploadSource: marker.uploadSource,
    sourceFileName: marker.sourceFileName,
    takenAt: (marker.sourceTakenAt ?? marker.createdAt).toISOString(),
  }

  return <UploadPageClient book={book} books={books} dueRecurringCount={dueCount} resumeMarker={resumeMarker} />
}
