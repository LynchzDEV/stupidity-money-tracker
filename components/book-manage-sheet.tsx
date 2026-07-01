'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, UserPlus, Crown, LogOut, Trash2 } from 'lucide-react'

interface Member {
  id: string
  role: string
  user: { id: string; name: string | null; email: string; image: string | null }
}

interface PendingInvite {
  id: string
  email: string
}

interface BookLite {
  id: string
  name: string
  emoji: string
  role: string
}

interface BookManageSheetProps {
  book: BookLite
  currentUserId: string
  onClose: () => void
  onLeft: (bookId: string) => void
  onDeleted: (bookId: string) => void
}

export function BookManageSheet({ book, currentUserId, onClose, onLeft, onDeleted }: BookManageSheetProps) {
  const isOwner = book.role === 'owner'
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function load() {
    try {
      const memRes = await fetch(`/api/books/${book.id}/members`)
      if (memRes.ok) setMembers(await memRes.json())
      if (isOwner) {
        const invRes = await fetch(`/api/books/${book.id}/invites`)
        if (invRes.ok) setInvites(await invRes.json())
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id])

  async function handleInvite() {
    const value = email.trim()
    if (!value || busy) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/books/${book.id}/invites`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(data.error ?? 'Could not invite')
      } else {
        setEmail('')
        setMsg(
          data.status === 'added'
            ? 'Added — they already had an account'
            : data.status === 'already-member'
              ? 'Already a member'
              : 'Invited — they will see it when they sign in',
        )
        await load()
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(userId: string) {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/books/${book.id}/members/${userId}`, { method: 'DELETE' })
      if (res.ok) setMembers(members.filter(m => m.user.id !== userId))
      else {
        const data = await res.json().catch(() => ({}))
        setMsg(data.error ?? 'Could not remove')
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleLeave() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/books/${book.id}/members/${currentUserId}`, { method: 'DELETE' })
      if (res.ok) onLeft(book.id)
      else {
        const data = await res.json().catch(() => ({}))
        setMsg(data.error ?? 'Could not leave')
        setBusy(false)
      }
    } catch {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (busy) return
    if (!window.confirm(`Delete "${book.name}"? This removes all its entries for everyone.`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/books/${book.id}`, { method: 'DELETE' })
      if (res.ok) onDeleted(book.id)
      else {
        const data = await res.json().catch(() => ({}))
        setMsg(data.error ?? 'Could not delete')
        setBusy(false)
      }
    } catch {
      setBusy(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-40 flex flex-col"
      style={{ background: 'var(--bg)', height: '100dvh' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <div
        className="flex items-center justify-between px-4 pb-3 flex-shrink-0"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 44px)' }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-70"
          style={{ background: 'var(--surface)', border: '1px solid var(--hairline)' }}
        >
          <X size={16} className="text-[var(--ink)]" />
        </button>
        <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--ink)]">
          <span>{book.emoji}</span>
          {book.name}
        </div>
        <div className="w-9" />
      </div>

      <div
        className="flex-1 overflow-auto scrollbar-none px-5"
        style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' } as React.CSSProperties}
      >
        {isOwner && (
          <div className="mb-6">
            <div className="text-[12px] font-semibold tracking-widest uppercase text-[var(--muted)] mb-2">
              Invite by Gmail
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                placeholder="name@gmail.com"
                className="flex-1 h-11 rounded-xl px-3.5 text-[14px] outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)', color: 'var(--ink)' }}
              />
              <button
                onClick={handleInvite}
                disabled={busy || !email.trim()}
                className="h-11 px-4 rounded-xl text-white text-sm font-semibold flex items-center gap-1.5 active:scale-95 disabled:opacity-40"
                style={{ background: 'var(--accent)' }}
              >
                <UserPlus size={15} />
                Invite
              </button>
            </div>
            <p className="text-[12px] text-[var(--muted)] mt-2">
              No email is sent. They join from their Books page after signing in with this Gmail.
            </p>
          </div>
        )}

        {msg && (
          <div
            className="mb-4 text-[13px] rounded-xl px-3 py-2"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)', border: '1px solid var(--accent-mid)' }}
          >
            {msg}
          </div>
        )}

        <div className="text-[12px] font-semibold tracking-widest uppercase text-[var(--muted)] mb-2">
          Members
        </div>
        {loading ? (
          <div className="text-[13px] text-[var(--muted)] py-4">Loading…</div>
        ) : (
          <div className="flex flex-col gap-2">
            {members.map(m => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: 'var(--surface)', border: '1px solid var(--hairline)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}
                >
                  {(m.user.name ?? m.user.email)[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-[var(--ink)] truncate flex items-center gap-1">
                    {m.user.name ?? m.user.email}
                    {m.role === 'owner' && <Crown size={12} className="text-[var(--accent)]" />}
                    {m.user.id === currentUserId && <span className="text-[11px] text-[var(--muted)]">(you)</span>}
                  </div>
                  <div className="text-[12px] text-[var(--muted)] truncate">{m.user.email}</div>
                </div>
                {isOwner && m.user.id !== currentUserId && (
                  <button
                    onClick={() => handleRemove(m.user.id)}
                    disabled={busy}
                    className="text-[12px] text-[var(--expense)] px-2 py-1 rounded-lg active:opacity-60 disabled:opacity-40"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {isOwner && invites.length > 0 && (
          <div className="mt-5">
            <div className="text-[12px] font-semibold tracking-widest uppercase text-[var(--muted)] mb-2">
              Pending invites
            </div>
            <div className="flex flex-col gap-2">
              {invites.map(i => (
                <div
                  key={i.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-[var(--muted)]"
                  style={{ background: 'var(--surface)', border: '1px dashed var(--hairline)' }}
                >
                  <span className="truncate">{i.email}</span>
                  <span className="ml-auto text-[11px]">waiting for sign-in</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-2.5">
          {!isOwner && (
            <button
              onClick={handleLeave}
              disabled={busy}
              className="h-12 rounded-xl flex items-center justify-center gap-2 text-[14px] font-semibold active:scale-[.98] disabled:opacity-40"
              style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', color: 'var(--expense)' }}
            >
              <LogOut size={16} />
              Leave this book
            </button>
          )}
          {isOwner && (
            <button
              onClick={handleDelete}
              disabled={busy}
              className="h-12 rounded-xl flex items-center justify-center gap-2 text-[14px] font-semibold text-white active:scale-[.98] disabled:opacity-40"
              style={{ background: 'var(--expense)' }}
            >
              <Trash2 size={16} />
              Delete book
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
