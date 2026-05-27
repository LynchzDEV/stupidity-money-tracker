'use client'
import Link from 'next/link'

type Tab = 'stats' | 'camera' | 'history'

export function TabBar({ bookId, active }: { bookId: string; active: Tab }) {
  return (
    <div
      className="fixed left-3 right-3 flex items-center justify-around"
      style={{
        bottom: 26, height: 60, padding: '4px 8px', borderRadius: 22, zIndex: 30,
        background: 'rgba(255,255,255,.92)',
        border: '1px solid var(--hairline)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: '0 4px 18px rgba(20,22,18,.08), 0 1px 0 rgba(255,255,255,.6) inset',
      } as React.CSSProperties}
    >
      {/* Stats */}
      <Link href={`/${bookId}/dashboard`}
        className="flex-1 flex flex-col items-center gap-0.5 py-2 px-1.5 rounded-xl transition-opacity active:opacity-70"
        style={{ color: active === 'stats' ? 'var(--accent)' : 'var(--muted)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>
        </svg>
        <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '-.005em' }}>Stats</span>
      </Link>

      {/* Snap (camera) */}
      <Link href={`/${bookId}/upload`}
        className="flex items-center justify-center active:scale-95 transition-transform"
        style={{
          width: 52, height: 52, borderRadius: 99,
          background: active === 'camera' ? 'var(--accent)' : 'var(--ink)',
          color: '#fff',
          boxShadow: active === 'camera' ? '0 4px 14px rgba(14,92,58,.4)' : '0 4px 12px rgba(0,0,0,.18)',
          transform: 'translateY(-8px)',
        }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h3l1.5-2h6l1.5 2h3A1.5 1.5 0 0 1 21 7.5v10A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-10Z"/>
          <circle cx="12" cy="13" r="3.5"/>
        </svg>
      </Link>

      {/* History */}
      <Link href={`/${bookId}/history`}
        className="flex-1 flex flex-col items-center gap-0.5 py-2 px-1.5 rounded-xl transition-opacity active:opacity-70"
        style={{ color: active === 'history' ? 'var(--accent)' : 'var(--muted)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
        <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '-.005em' }}>History</span>
      </Link>
    </div>
  )
}
