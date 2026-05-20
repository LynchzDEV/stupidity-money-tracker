'use client'

interface BookChipProps {
  name: string
  emoji?: string
  dark?: boolean
  onClick?: () => void
}

export function BookChip({ name, dark = false, onClick }: BookChipProps) {
  const fg = dark ? '#fff' : 'var(--ink)'
  const bg = dark ? 'rgba(20,22,18,.55)' : 'rgba(255,255,255,.85)'
  const br = dark ? 'rgba(255,255,255,.12)' : 'var(--hairline)'

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 h-9 px-3 rounded-full text-[13.5px] font-medium tracking-tight active:scale-95 transition-transform"
      style={{
        color: fg,
        background: bg,
        border: `1px solid ${br}`,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      } as React.CSSProperties}
    >
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
      {name}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </button>
  )
}
