'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CardContainer, CardBody, CardItem } from '@/components/aceternity/card-3d'
import { Star, Plus, Users, Settings2, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { BookManageSheet } from '@/components/book-manage-sheet'

interface Book {
  id: string
  name: string
  emoji: string
  isDefault: boolean
  role: string
  updatedAt: Date
  _count: { transactions: number }
}

interface Invite {
  id: string
  email: string
  book: { id: string; name: string; emoji: string }
}

interface BookSelectorClientProps {
  books: Book[]
  invites: Invite[]
  currentUserId: string
}

export function BookSelectorClient({ books: initial, invites: initialInvites, currentUserId }: BookSelectorClientProps) {
  const router = useRouter()
  const [books, setBooks] = useState(initial)
  const [invites, setInvites] = useState(initialInvites)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [manageBook, setManageBook] = useState<Book | null>(null)
  const [busyInvite, setBusyInvite] = useState<string | null>(null)

  async function handleToggleDefault(bookId: string, next: boolean) {
    await fetch(`/api/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isDefault: next }),
    })
    setBooks(books.map(b => ({
      ...b,
      isDefault: next ? b.id === bookId : b.id === bookId ? false : b.isDefault,
    })))
  }

  async function handleCreate() {
    if (!newName.trim()) return
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const book = await res.json()
    router.push(`/${book.id}/upload`)
  }

  async function acceptInvite(inviteId: string, bookId: string) {
    setBusyInvite(inviteId)
    const res = await fetch(`/api/invites/${inviteId}`, { method: 'POST' })
    setBusyInvite(null)
    if (res.ok) {
      setInvites(invites.filter(i => i.id !== inviteId))
      router.push(`/${bookId}/upload`)
    }
  }

  async function declineInvite(inviteId: string) {
    setBusyInvite(inviteId)
    const res = await fetch(`/api/invites/${inviteId}`, { method: 'DELETE' })
    setBusyInvite(null)
    if (res.ok) setInvites(invites.filter(i => i.id !== inviteId))
  }

  function removeBook(bookId: string) {
    setBooks(books.filter(b => b.id !== bookId))
    setManageBook(null)
  }

  return (
    <main className="min-h-[100dvh] bg-[var(--bg)] px-5 pt-16 pb-8">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl text-[var(--ink)] mb-1">
        Your Books
      </h1>
      <p className="text-[var(--muted)] text-sm mb-6">
        Tap to open · Tap star to set default
      </p>

      {invites.length > 0 && (
        <div className="mb-6 flex flex-col gap-2.5">
          {invites.map(inv => (
            <div
              key={inv.id}
              className="rounded-2xl p-3.5 flex items-center gap-3"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-mid)' }}
            >
              <div className="text-2xl">{inv.book.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-[var(--ink)] truncate">
                  Invitation to “{inv.book.name}”
                </div>
                <div className="text-[12px] text-[var(--muted)]">You were invited to this shared book</div>
              </div>
              <button
                onClick={() => declineInvite(inv.id)}
                disabled={busyInvite === inv.id}
                className="text-[13px] font-medium text-[var(--muted)] px-2.5 py-1.5 rounded-lg active:opacity-60 disabled:opacity-40"
              >
                Decline
              </button>
              <button
                onClick={() => acceptInvite(inv.id, inv.book.id)}
                disabled={busyInvite === inv.id}
                className="text-[13px] font-semibold text-white px-3 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 disabled:opacity-40"
                style={{ background: 'var(--accent)' }}
              >
                <Check size={14} />
                Accept
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {books.map((book) => (
          <CardContainer key={book.id} className="w-full">
            <CardBody className="w-full">
              <CardItem translateZ={20} className="w-full">
                <div
                  className={`relative bg-white rounded-2xl p-4 border cursor-pointer active:scale-95 transition-transform ${
                    book.isDefault
                      ? 'border-[var(--accent)] shadow-md'
                      : 'border-[var(--hairline)] shadow-sm'
                  }`}
                  onClick={() => router.push(`/${book.id}/upload`)}
                >
                  {book.isDefault && (
                    <Star
                      size={14}
                      className="absolute top-3 right-3 text-[var(--accent)] fill-[var(--accent)]"
                    />
                  )}
                  <div className="text-3xl mb-2">{book.emoji}</div>
                  <div className="font-semibold text-[var(--ink)] text-sm flex items-center gap-1.5">
                    {book.name}
                    {book.role !== 'owner' && <Users size={12} className="text-[var(--muted)]" />}
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    {book._count.transactions} entries
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {formatDistanceToNow(new Date(book.updatedAt), { addSuffix: true })}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      className={`flex-1 text-xs rounded-full px-2.5 py-1 border ${
                        book.isDefault
                          ? 'text-[var(--accent)] border-[var(--accent-mid)]'
                          : 'text-[var(--muted)] border-[var(--hairline)]'
                      }`}
                      onClick={(e) => { e.stopPropagation(); handleToggleDefault(book.id, !book.isDefault) }}
                    >
                      {book.isDefault ? 'Default ★' : 'Set default ☆'}
                    </button>
                    <button
                      aria-label="Manage book"
                      className="text-xs text-[var(--muted)] border border-[var(--hairline)] rounded-full px-2.5 py-1 flex items-center justify-center"
                      onClick={(e) => { e.stopPropagation(); setManageBook(book) }}
                    >
                      <Settings2 size={13} />
                    </button>
                  </div>
                </div>
              </CardItem>
            </CardBody>
          </CardContainer>
        ))}

        {/* New Book card */}
        <CardContainer className="w-full">
          <CardBody className="w-full">
            <CardItem translateZ={10} className="w-full">
              {creating ? (
                <div className="bg-white rounded-2xl p-4 border border-dashed border-[var(--accent-mid)] h-full flex flex-col gap-2">
                  <input
                    autoFocus
                    className="text-sm border border-[var(--hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)] bg-[var(--bg)]"
                    placeholder="Book name…"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                  <button
                    onClick={handleCreate}
                    className="bg-[var(--accent)] text-white text-sm rounded-lg py-2 font-medium"
                  >
                    Create
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setCreating(true)}
                  className="bg-white rounded-2xl p-4 border border-dashed border-[var(--hairline)] flex flex-col items-center justify-center min-h-[120px] gap-2 cursor-pointer active:scale-95 transition-transform"
                >
                  <Plus size={24} className="text-[var(--muted)]" />
                  <span className="text-sm text-[var(--muted)]">New Book</span>
                </div>
              )}
            </CardItem>
          </CardBody>
        </CardContainer>
      </div>

      {manageBook && (
        <BookManageSheet
          book={manageBook}
          currentUserId={currentUserId}
          onClose={() => setManageBook(null)}
          onLeft={removeBook}
          onDeleted={removeBook}
        />
      )}
    </main>
  )
}
