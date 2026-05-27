'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { getThumbnailUrl } from '@/lib/immich'

interface AlbumItem {
  id: string
  immichAssetId: string
  note: string | null
  category: string
  amount: number
  type: string
  date: string
}

interface Book { id: string; name: string; emoji: string }

function satangToTHB(satang: number) {
  return (satang / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function groupByMonth(items: AlbumItem[]) {
  const map = new Map<string, AlbumItem[]>()
  for (const item of items) {
    const d = new Date(item.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
}

function monthLabel(key: string) {
  const [year, month] = key.split('-')
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

export function AlbumClient({ book, items }: { book: Book; items: AlbumItem[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<AlbumItem | null>(null)
  const grouped = groupByMonth(items)

  return (
    <main className="min-h-[100dvh] flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header — iOS Photos style */}
      <div
        className="flex items-center px-4 pt-14 pb-3"
        style={{
          background: 'var(--bg)',
          borderBottom: '1px solid var(--hairline)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        } as React.CSSProperties}
      >
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-60 transition-opacity mr-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--hairline)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div>
          <div className="text-[20px] font-semibold tracking-tight leading-none" style={{ color: 'var(--ink)' }}>Album</div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>{items.length} receipts</div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto pb-8" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--hairline)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2"/>
                <circle cx="9" cy="10" r="1.5"/>
                <path d="M21 16l-5-5-9 9"/>
              </svg>
            </div>
            <div className="text-[16px] font-medium mb-1" style={{ color: 'var(--ink)' }}>No receipts yet</div>
            <div className="text-[13px]" style={{ color: 'var(--muted)' }}>Photos from scanned receipts appear here</div>
            <Link href={`/${book.id}/upload`}
              className="mt-5 px-5 py-2.5 rounded-full text-[14px] font-semibold"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              Scan a receipt
            </Link>
          </div>
        ) : (
          grouped.map(([monthKey, monthItems]) => (
            <div key={monthKey}>
              {/* Month header */}
              <div className="px-4 pt-5 pb-2">
                <div className="text-[17px] font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>{monthLabel(monthKey)}</div>
                <div className="text-[12px]" style={{ color: 'var(--muted)' }}>{monthItems.length} items</div>
              </div>

              {/* Photo grid — 3 col, 2px gap like iPhone */}
              <div className="grid grid-cols-3 gap-[2px]">
                {monthItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className="relative aspect-square overflow-hidden active:opacity-80 transition-opacity"
                  >
                    <Image
                      src={getThumbnailUrl(item.immichAssetId)}
                      alt={item.note || item.category}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    {/* Bottom gradient + label */}
                    <div
                      className="absolute bottom-0 left-0 right-0 px-1.5 pb-1.5 pt-4"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,.92) 0%, rgba(0,0,0,.55) 45%, transparent 100%)' }}
                    >
                      <div className="text-white text-[11px] font-semibold truncate leading-tight drop-shadow">
                        {item.note || item.category}
                      </div>
                      <div
                        className="text-[10px] font-bold drop-shadow"
                        style={{ color: item.type === 'income' ? '#4cd97b' : '#ff6b6b', fontVariantNumeric: 'tabular-nums' }}
                      >
                        {item.type === 'income' ? '+' : '−'}฿{satangToTHB(item.amount)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: '#000' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="flex items-center px-4 pt-14 pb-3 flex-shrink-0"
            style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(20px)' } as React.CSSProperties}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-60 transition-opacity mr-3"
              style={{ background: 'rgba(255,255,255,.1)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <div>
              <div className="text-white text-[16px] font-semibold leading-none">{selected.note || selected.category}</div>
              <div className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,.5)' }}>
                {new Date(selected.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                {' · '}
                <span style={{ color: selected.type === 'income' ? '#4cd97b' : '#ff6b6b' }}>
                  {selected.type === 'income' ? '+' : '−'}฿{satangToTHB(selected.amount)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <div className="relative w-full" style={{ maxHeight: 'calc(100dvh - 160px)', aspectRatio: '1/1' }}>
              <Image
                src={getThumbnailUrl(selected.immichAssetId)}
                alt={selected.note || selected.category}
                fill
                unoptimized
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
