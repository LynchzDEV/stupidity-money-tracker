'use client'
import { useRouter } from 'next/navigation'

export function RecurringBanner({ bookId, count }: { bookId: string; count: number }) {
  const router = useRouter()
  if (count <= 0) return null

  return (
    <button
      onClick={() => router.push(`/${bookId}/dashboard`)}
      className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[13px] font-semibold active:scale-[.97] transition-transform"
      style={{
        background: 'rgba(255,255,255,.16)',
        border: '1px solid rgba(255,255,255,.28)',
        backdropFilter: 'blur(10px)',
        color: '#fff',
      }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v6h6M21 12a9 9 0 1 1-3-6.7L21 8"/>
      </svg>
      {count} recurring due
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6l6 6-6 6"/>
      </svg>
    </button>
  )
}
