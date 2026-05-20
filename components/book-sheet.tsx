'use client'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'

interface Book {
  id: string
  name: string
  emoji: string
  isDefault: boolean
  updatedAt: string
  _count: { transactions: number }
}

interface BookSheetProps {
  open: boolean
  books: Book[]
  currentBookId: string
  onClose: () => void
  onSetDefault: (bookId: string) => void
  onNewBook: () => void
}

const BOOK_COLORS = ['var(--accent)', '#b2492c', '#a07212', '#3548c4', '#7a7d76']

export function BookSheet({ open, books, currentBookId, onClose, onSetDefault, onNewBook }: BookSheetProps) {
  const router = useRouter()

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,.45)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl"
            style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-sheet)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-4" style={{ background: 'var(--hairline)' }} />

            <div className="px-4 pb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[19px] font-semibold tracking-tight text-[var(--ink)]">Switch book</div>
                <button
                  onClick={onNewBook}
                  className="text-[13px] font-medium active:opacity-70 transition-opacity"
                  style={{ color: 'var(--accent)' }}>
                  + New
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {books.map((book, i) => {
                  const color = BOOK_COLORS[i % BOOK_COLORS.length]
                  const isActive = book.id === currentBookId
                  return (
                    <div
                      key={book.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => { router.push(`/${book.id}/upload`); onClose() }}
                      onKeyDown={e => e.key === 'Enter' && (router.push(`/${book.id}/upload`), onClose())}
                      className="flex items-center gap-3 p-3.5 rounded-2xl text-left w-full active:opacity-80 transition-opacity cursor-pointer"
                      style={{
                        background: 'var(--surface)',
                        border: `1px solid ${isActive ? 'var(--accent-mid)' : 'var(--hairline2)'}`,
                        boxShadow: isActive ? '0 0 0 3px rgba(14,92,58,.06)' : 'none',
                      }}>
                      <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0"
                        style={{ background: color + '18', color, border: `1px solid ${color}28` }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                          <path d="M6 4h12v17l-6-4-6 4V4Z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-medium text-[var(--ink)]">{book.name}</span>
                          {book.isDefault && (
                            <span className="text-[10px] font-semibold px-1.5 py-px rounded-full tracking-wide uppercase"
                              style={{ color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid var(--accent-mid)' }}>
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] text-[var(--muted)] mt-0.5">
                          {book._count.transactions} entries · {formatDistanceToNow(new Date(book.updatedAt), { addSuffix: true })}
                        </div>
                      </div>
                      {!book.isDefault && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onSetDefault(book.id) }}
                          className="text-[12px] text-[var(--muted)] px-2.5 py-1 rounded-full active:opacity-70 transition-opacity flex-shrink-0"
                          style={{ border: '1px solid var(--hairline)' }}>
                          Set default
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 px-3.5 py-3 rounded-xl text-[12.5px] leading-relaxed text-[var(--muted)]"
                style={{ border: '1px dashed var(--hairline)' }}>
                Setting a default skips this screen. Camera opens straight into your book.
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
