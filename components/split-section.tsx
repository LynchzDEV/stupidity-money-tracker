'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Check, Users, Upload, Loader2 } from 'lucide-react'
import { formatTHB, thbToSatang } from '@/lib/utils'
import { getThumbnailUrl } from '@/lib/immich'

export interface SplitMember {
  id: string
  name: string | null
  email: string
}

interface Share {
  id: string
  userId: string
  amountOwed: number
  slipAssetId: string | null
  paidAt: string | null
  user: { id: string; name: string | null; email: string; image: string | null }
}

interface SplitSectionProps {
  txId: string
  amount: number // satang
  type: string
  members: SplitMember[]
  currentUserId: string
  isOwner: boolean
}

function memberLabel(name: string | null, email: string) {
  return name ?? email.split('@')[0]
}

export function SplitSection({ txId, amount, type, members, currentUserId, isOwner }: SplitSectionProps) {
  const [loading, setLoading] = useState(true)
  const [shares, setShares] = useState<Share[]>([])
  const [busy, setBusy] = useState(false)
  const [manual, setManual] = useState(false)
  const [manualThb, setManualThb] = useState<Record<string, string>>({})

  async function load() {
    try {
      const res = await fetch(`/api/transactions/${txId}/shares`)
      if (res.ok) {
        const data = await res.json()
        setShares(data.shares ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txId])

  if (type !== 'expense' || members.length < 2) return null

  async function splitEqually() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/transactions/${txId}/shares`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'equal' }),
      })
      if (res.ok) setShares((await res.json()).shares ?? [])
    } finally {
      setBusy(false)
    }
  }

  async function saveManual() {
    if (busy) return
    const shareInput = members.map(m => ({
      userId: m.id,
      amount: thbToSatang(parseFloat(manualThb[m.id] || '0') || 0),
    }))
    setBusy(true)
    try {
      const res = await fetch(`/api/transactions/${txId}/shares`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'manual', shares: shareInput }),
      })
      if (res.ok) {
        setShares((await res.json()).shares ?? [])
        setManual(false)
      }
    } finally {
      setBusy(false)
    }
  }

  async function clearSplit() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/transactions/${txId}/shares`, { method: 'DELETE' })
      if (res.ok) setShares([])
    } finally {
      setBusy(false)
    }
  }

  async function patchShare(shareId: string, patch: { paid?: boolean; slipAssetId?: string }) {
    const res = await fetch(`/api/shares/${shareId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const updated = await res.json()
      setShares(prev => prev.map(s => (s.id === shareId ? { ...s, ...updated } : s)))
    }
  }

  async function togglePaid(share: Share) {
    if (busy) return
    setBusy(true)
    try {
      await patchShare(share.id, { paid: !share.paidAt })
    } finally {
      setBusy(false)
    }
  }

  async function uploadSlip(shareId: string, file: File) {
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const { assetId } = await res.json()
        await patchShare(shareId, { slipAssetId: assetId, paid: true })
      }
    } finally {
      setBusy(false)
    }
  }

  const manualSatang = members.reduce((sum, m) => sum + thbToSatang(parseFloat(manualThb[m.id] || '0') || 0), 0)
  const manualMatches = manualSatang === amount

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-semibold text-[var(--ink)] flex items-center gap-1.5">
          <Users size={14} className="text-[var(--muted)]" />
          Split
        </div>
        {shares.length > 0 && isOwner && (
          <button onClick={clearSplit} disabled={busy} className="text-[12px] text-[var(--muted)] active:opacity-60 disabled:opacity-40">
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-[13px] text-[var(--muted)] py-2 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : shares.length === 0 ? (
        manual ? (
          <div className="flex flex-col gap-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-2">
                <span className="flex-1 text-[13.5px] text-[var(--ink)] truncate">{memberLabel(m.name, m.email)}</span>
                <span className="text-[13px] text-[var(--muted)]">฿</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={manualThb[m.id] ?? ''}
                  onChange={e => setManualThb(prev => ({ ...prev, [m.id]: e.target.value }))}
                  placeholder="0.00"
                  className="w-24 px-2.5 py-1.5 rounded-lg text-[14px] font-[family-name:var(--font-mono)] outline-none text-right text-[var(--ink)]"
                  style={{ background: 'var(--bg)', border: '1px solid var(--hairline)' }}
                />
              </div>
            ))}
            <div className="flex items-center justify-between mt-1 text-[12px]"
              style={{ color: manualMatches ? 'var(--income)' : 'var(--expense)' }}>
              <span>{manualMatches ? 'Adds up' : 'Must total'}</span>
              <span className="font-[family-name:var(--font-mono)]">
                {formatTHB(manualSatang)} / {formatTHB(amount)}
              </span>
            </div>
            <div className="flex gap-2 mt-1">
              <button onClick={() => setManual(false)} className="flex-1 h-10 rounded-xl text-[13px] font-medium"
                style={{ background: 'var(--bg)', border: '1px solid var(--hairline)', color: 'var(--ink2)' }}>
                Back
              </button>
              <button onClick={saveManual} disabled={busy || !manualMatches}
                className="flex-1 h-10 rounded-xl text-[13px] font-semibold text-white disabled:opacity-40"
                style={{ background: 'var(--accent)' }}>
                Save split
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[12.5px] text-[var(--muted)]">Split {formatTHB(amount)} between {members.length} members.</p>
            <div className="flex gap-2">
              <button onClick={splitEqually} disabled={busy}
                className="flex-1 h-10 rounded-xl text-[13px] font-semibold text-white disabled:opacity-40"
                style={{ background: 'var(--accent)' }}>
                Split equally
              </button>
              <button onClick={() => setManual(true)} disabled={busy}
                className="flex-1 h-10 rounded-xl text-[13px] font-medium"
                style={{ background: 'var(--bg)', border: '1px solid var(--hairline)', color: 'var(--ink2)' }}>
                Custom
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-2">
          {shares.map(s => {
            const canAct = s.userId === currentUserId || isOwner
            const paid = !!s.paidAt
            return (
              <div key={s.id} className="flex items-center gap-2.5 py-1.5">
                <button
                  onClick={() => canAct && togglePaid(s)}
                  disabled={!canAct || busy}
                  aria-label={paid ? 'Mark unpaid' : 'Mark paid'}
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-100"
                  style={{
                    background: paid ? 'var(--income)' : 'transparent',
                    border: `1.5px solid ${paid ? 'var(--income)' : 'var(--hairline)'}`,
                  }}>
                  {paid && <Check size={13} color="#fff" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] text-[var(--ink)] truncate">
                    {memberLabel(s.user.name, s.user.email)}
                    {s.userId === currentUserId && <span className="text-[11px] text-[var(--muted)]"> (you)</span>}
                  </div>
                </div>
                {s.slipAssetId && (
                  <Image
                    src={getThumbnailUrl(s.slipAssetId)}
                    alt="Slip"
                    width={28}
                    height={28}
                    unoptimized
                    className="rounded-md object-cover flex-shrink-0"
                    style={{ border: '1px solid var(--hairline)' }}
                  />
                )}
                {canAct && !s.slipAssetId && (
                  <label className="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer flex-shrink-0 active:opacity-60"
                    style={{ background: 'var(--bg)', border: '1px solid var(--hairline)' }}>
                    <Upload size={14} className="text-[var(--muted)]" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadSlip(s.id, f) }}
                    />
                  </label>
                )}
                <span className="text-[13.5px] font-[family-name:var(--font-mono)] font-semibold flex-shrink-0"
                  style={{ color: 'var(--ink)' }}>
                  {formatTHB(s.amountOwed)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
