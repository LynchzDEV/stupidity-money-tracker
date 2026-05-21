'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CardContainer, CardBody, CardItem } from '@/components/aceternity/card-3d'
import { Star, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Book {
  id: string
  name: string
  emoji: string
  isDefault: boolean
  updatedAt: Date
  _count: { transactions: number }
}

export function BookSelectorClient({ books: initial }: { books: Book[] }) {
  const router = useRouter()
  const [books, setBooks] = useState(initial)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  async function handleSetDefault(bookId: string) {
    await fetch(`/api/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    })
    setBooks(books.map(b => ({ ...b, isDefault: b.id === bookId })))
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

  return (
    <main className="min-h-[100dvh] bg-[var(--bg)] px-5 pt-16 pb-8">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl text-[var(--ink)] mb-1">
        Your Books
      </h1>
      <p className="text-[var(--muted)] text-sm mb-8">
        Tap to open · Tap star to set default
      </p>

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
                  <div className="font-semibold text-[var(--ink)] text-sm">{book.name}</div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    {book._count.transactions} entries
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {formatDistanceToNow(new Date(book.updatedAt), { addSuffix: true })}
                  </div>
                  {!book.isDefault && (
                    <button
                      className="mt-3 text-xs text-[var(--muted)] border border-[var(--hairline)] rounded-full px-2.5 py-1 w-full"
                      onClick={(e) => { e.stopPropagation(); handleSetDefault(book.id) }}
                    >
                      Set default ☆
                    </button>
                  )}
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
    </main>
  )
}
