'use client'

import { useState } from 'react'
import Link from 'next/link'

type MonthData = {
  month: string
  label: string
  year: string
  income: number
  expense: number
  net: number
  isCurrent: boolean
}

type TrendsClientProps = {
  bookName: string
  bookId: string
  months: MonthData[]
  catCurrent: Record<string, number>
  catPrev: Record<string, number>
  daysIn: number
  currentLabel: string
  prevLabel: string
}

type TabId = 'cashflow' | 'net' | 'categories'

const CAT_COLORS: Record<string, string> = {
  Food: '#b2492c',
  Transport: '#a07212',
  Shopping: '#3a7d52',
  Bills: '#3548c4',
  Salary: '#1f8a5b',
  Transfer: '#0e5c3a',
  Other: '#7a7d76',
}

function fmtBaht(satang: number): string {
  const b = satang / 100
  if (Math.abs(b) >= 10000) return `฿${(b / 1000).toFixed(Math.abs(b) >= 100000 ? 0 : 1)}k`
  return `฿${b.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function fmtBahtAbs(satang: number): string {
  return (Math.abs(satang) / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function monthShort(label: string): string {
  return label.split(' ')[0]
}

export function TrendsClient({
  bookName, bookId, months, catCurrent, catPrev, daysIn, currentLabel, prevLabel,
}: TrendsClientProps) {
  const [tab, setTab] = useState<TabId>('categories')

  const cur = months[months.length - 1]
  const prev = months[months.length - 2]

  const outDelta = cur.expense - prev.expense
  const outPct = prev.expense > 0 ? Math.round((Math.abs(outDelta) / prev.expense) * 100) : 0

  const curShort = monthShort(currentLabel)
  const prevShort = monthShort(prevLabel)

  const allCats = Array.from(new Set([...Object.keys(catCurrent), ...Object.keys(catPrev)]))
  const catDeltas = allCats
    .map(name => ({ name, delta: (catCurrent[name] ?? 0) - (catPrev[name] ?? 0) }))
    .filter(c => c.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  const heroGood = outDelta <= 0

  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link
            href={`/${bookId}/dashboard`}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-full text-[13.5px] font-medium"
            style={{ background: 'rgba(255,255,255,.85)', border: '1px solid var(--hairline)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
            {bookName}
          </Link>
          <div
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[13px] font-medium"
            style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', color: 'var(--ink)' }}
          >
            12 months
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="text-[11.5px] font-medium tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
            Trends
          </div>
          <div
            className="mt-0.5 leading-[1.1] tracking-[-0.015em]"
            style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 30 }}
          >
            How {curShort} compares
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          marginTop: 14, display: 'inline-flex', gap: 4, padding: 3,
          background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 11,
        }}>
          {([
            { id: 'cashflow' as TabId, label: 'Cash flow' },
            { id: 'net' as TabId, label: 'Net trend' },
            { id: 'categories' as TabId, label: 'Categories' },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '7px 13px', borderRadius: 8, fontSize: 12.5, fontWeight: 500,
                background: tab === t.id ? 'var(--ink)' : 'transparent',
                color: tab === t.id ? '#fff' : 'var(--muted)',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scroll body */}
      <div
        className="overflow-auto"
        style={{
          flex: 1, padding: '18px 20px',
          paddingBottom: 'calc(130px + max(16px, env(safe-area-inset-bottom, 16px)))',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        {/* Hero comparison card */}
        <div style={{
          background: 'var(--surface)', borderRadius: 22, padding: 20,
          border: '1px solid var(--hairline2)', boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, letterSpacing: '.03em' }}>
              {curShort} <span style={{ opacity: .6 }}>vs</span> {prevShort}
            </div>
            <div className="font-[family-name:var(--font-mono)]" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {daysIn} days in
            </div>
          </div>

          {/* Big serif delta */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4,
            color: heroGood ? 'var(--income)' : 'var(--expense)',
          }}>
            <div style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 52, letterSpacing: '-.025em', lineHeight: 1, margin: '10px 0' }}>
              {outDelta <= 0 ? '−' : '+'}฿{fmtBahtAbs(outDelta)}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '4px 8px', borderRadius: 99, marginTop: 8,
              background: heroGood ? 'var(--income-bg)' : 'var(--expense-bg)',
              border: `1px solid ${heroGood ? '#cbe6d4' : '#e9d3c6'}`,
              fontSize: 12, fontWeight: 600, flexShrink: 0,
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                {outDelta <= 0
                  ? <path d="M12 4v15m0 0l-6-6m6 6l6-6" />
                  : <path d="M12 20V5m0 0l-6 6m6-6l6 6" />}
              </svg>
              <span className="font-[family-name:var(--font-mono)]">{outPct}%</span>
            </div>
          </div>

          {/* Explanation */}
          <div style={{ fontSize: 13, color: 'var(--ink2)', marginTop: 10, lineHeight: 1.45 }}>
            {outDelta <= 0 ? (
              <>
                Spent{' '}
                <span style={{ fontWeight: 600, color: 'var(--income)' }}>
                  ฿{fmtBahtAbs(outDelta)} less
                </span>{' '}
                than last month.
                {catDeltas.length > 0 && (
                  <> Mostly {catDeltas[0].name} ({catDeltas[0].delta < 0 ? '−' : '+'}฿{fmtBahtAbs(catDeltas[0].delta)})
                    {catDeltas[1] && <> and {catDeltas[1].name} ({catDeltas[1].delta < 0 ? '−' : '+'}฿{fmtBahtAbs(catDeltas[1].delta)})</>}
                    .
                  </>
                )}
              </>
            ) : (
              <>
                Spent{' '}
                <span style={{ fontWeight: 600, color: 'var(--expense)' }}>
                  ฿{fmtBahtAbs(outDelta)} more
                </span>{' '}
                than last month.
                {catDeltas.length > 0 && (
                  <> Mostly {catDeltas[0].name} ({catDeltas[0].delta > 0 ? '+' : '−'}฿{fmtBahtAbs(catDeltas[0].delta)})
                    {catDeltas[1] && <> and {catDeltas[1].name} ({catDeltas[1].delta > 0 ? '+' : '−'}฿{fmtBahtAbs(catDeltas[1].delta)})</>}
                    .
                  </>
                )}
              </>
            )}
          </div>

          {/* In / Out / Net row */}
          <div style={{
            marginTop: 16, display: 'flex', gap: 8,
            paddingTop: 14, borderTop: '1px dashed var(--hairline)',
          }}>
            {([
              { label: 'In', cur: cur.income, prev: prev.income, good: 'up' as const },
              { label: 'Out', cur: cur.expense, prev: prev.expense, good: 'down' as const },
              { label: 'Net', cur: cur.net, prev: prev.net, good: 'up' as const },
            ]).map(s => {
              const d = s.cur - s.prev
              const isGood = s.good === 'up' ? d >= 0 : d < 0
              const c = isGood ? 'var(--income)' : 'var(--expense)'
              return (
                <div key={s.label} style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-[10.5px] font-medium tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                    {s.label}
                  </div>
                  <div className="font-[family-name:var(--font-mono)]" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 2, letterSpacing: '-.01em' }}>
                    {fmtBaht(s.cur)}
                  </div>
                  <div className="font-[family-name:var(--font-mono)] flex items-center gap-0.5" style={{ fontSize: 11, color: c, marginTop: 1 }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      {d >= 0
                        ? <path d="M12 20V5m0 0l-6 6m6-6l6 6" />
                        : <path d="M12 4v15m0 0l-6-6m6 6l6-6" />}
                    </svg>
                    {d >= 0 ? '+' : '−'}฿{fmtBahtAbs(d)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Chart area */}
        {tab === 'cashflow' && <CashFlowChart months={months} />}
        {tab === 'net' && <NetTrendChart months={months} />}
        {tab === 'categories' && (
          <CategoriesChart
            catCurrent={catCurrent}
            catPrev={catPrev}
            curLabel={curShort}
            prevLabel={prevShort}
          />
        )}

        {/* Insights */}
        <InsightsSection months={months} catCurrent={catCurrent} catPrev={catPrev} />
      </div>
    </div>
  )
}

// ── Cash flow chart (paired bars) ─────────────────────────────────
function CashFlowChart({ months }: { months: MonthData[] }) {
  const max = Math.max(...months.map(m => Math.max(m.income, m.expense)), 1)
  const H = 150

  return (
    <div style={{
      marginTop: 14, background: 'var(--surface)', borderRadius: 22, padding: '18px 16px 14px',
      border: '1px solid var(--hairline2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--income)', display: 'inline-block' }} />
            Income
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--expense)', display: 'inline-block' }} />
            Expense
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>monthly</div>
      </div>

      <div style={{ position: 'relative', height: H, display: 'flex', alignItems: 'flex-end', gap: 4, padding: '0 4px' }}>
        {/* Avg dashed rule */}
        <div style={{
          position: 'absolute', left: 6, right: 6, top: 18, height: 1,
          borderTop: '1px dashed var(--hairline)', pointerEvents: 'none',
        }} />

        {months.map(mo => {
          const inH = (mo.income / max) * H
          const outH = (mo.expense / max) * H
          return (
            <div key={mo.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: H, position: 'relative', width: '100%', justifyContent: 'center' }}>
                {mo.isCurrent && mo.expense > 0 && (
                  <div style={{
                    position: 'absolute', bottom: outH + 8, left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '2px 6px', borderRadius: 6,
                    background: 'var(--ink)', color: '#fff',
                    fontSize: 9.5, fontWeight: 600, whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-mono), monospace', zIndex: 1,
                  }}>
                    ฿{((mo.expense / 100) / 1000).toFixed(1)}k
                  </div>
                )}
                <div style={{
                  width: 8, height: Math.max(inH, 2),
                  background: 'var(--income)', borderRadius: '3px 3px 0 0',
                  opacity: mo.isCurrent ? 1 : 0.65, flexShrink: 0,
                }} />
                <div style={{
                  width: 8, height: Math.max(outH, 2),
                  background: 'var(--expense)', borderRadius: '3px 3px 0 0',
                  opacity: mo.isCurrent ? 1 : 0.65, flexShrink: 0,
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* X axis labels */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 4px 0', borderTop: '1px solid var(--hairline2)', marginTop: 6 }}>
        {months.map(mo => (
          <div key={mo.month + '-lbl'} style={{
            flex: 1, textAlign: 'center',
            fontSize: 9.5, fontWeight: mo.isCurrent ? 600 : 500,
            color: mo.isCurrent ? 'var(--ink)' : 'var(--muted)',
          }}>
            {mo.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Net trend chart (SVG line) ─────────────────────────────────────
function NetTrendChart({ months }: { months: MonthData[] }) {
  const nets = months.map(m => m.net)
  const min = Math.min(...nets)
  const max = Math.max(...nets)
  const range = max - min || 1
  const H = 160
  const W = 320

  const pts: [number, number][] = nets.map((n, i) => [
    (i / (nets.length - 1)) * W,
    H - ((n - min) / range) * (H - 14) - 7,
  ])

  const linePath = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`
  const last = pts[pts.length - 1]
  const lastNet = nets[nets.length - 1]

  return (
    <div style={{
      marginTop: 14, background: 'var(--surface)', borderRadius: 22, padding: '18px 16px 14px',
      border: '1px solid var(--hairline2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px 12px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>Net cash per month</div>
        <div className="font-[family-name:var(--font-mono)]" style={{ fontSize: 11, color: 'var(--muted)' }}>
          peak {fmtBaht(max)} · low {fmtBaht(min)}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="netAreaGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0e5c3a" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0e5c3a" stopOpacity="0" />
            </linearGradient>
          </defs>
          {([0, 0.5, 1] as const).map(t => (
            <line
              key={t} x1="0" x2={W}
              y1={H * t + (t === 0 ? 6 : t === 1 ? 0 : -6)}
              y2={H * t + (t === 0 ? 6 : t === 1 ? 0 : -6)}
              stroke="#e6e3d8" strokeDasharray="2 4" strokeWidth="1"
            />
          ))}
          <path d={areaPath} fill="url(#netAreaGrad)" />
          <path d={linePath} stroke="#0e5c3a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map(([x, y], i) => (
            <circle
              key={i} cx={x} cy={y}
              r={i === pts.length - 1 ? 4 : 2.2}
              fill={i === pts.length - 1 ? '#0e5c3a' : '#ffffff'}
              stroke="#0e5c3a"
              strokeWidth={i === pts.length - 1 ? 0 : 1.5}
            />
          ))}
        </svg>

        {/* Floating callout on last point */}
        <div style={{
          position: 'absolute',
          left: `${(last[0] / W) * 100}%`,
          top: last[1] - 36,
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap',
          background: 'var(--ink)', color: '#fff',
          padding: '4px 8px', borderRadius: 8,
          fontSize: 11, fontWeight: 600,
          fontFamily: 'var(--font-mono), monospace',
          boxShadow: 'var(--shadow-md)',
          pointerEvents: 'none',
        }}>
          {months[months.length - 1].label} · {lastNet >= 0 ? '+' : '−'}{fmtBaht(lastNet)}
          <div style={{
            position: 'absolute', bottom: -4, left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: 8, height: 8, background: 'var(--ink)',
          }} />
        </div>
      </div>

      {/* X axis labels */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 4px 0', borderTop: '1px solid var(--hairline2)', marginTop: 6 }}>
        {months.map(mo => (
          <div key={mo.month + '-n'} style={{
            flex: 1, textAlign: 'center',
            fontSize: 9.5, fontWeight: mo.isCurrent ? 600 : 500,
            color: mo.isCurrent ? 'var(--ink)' : 'var(--muted)',
          }}>
            {mo.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Categories comparison ─────────────────────────────────────────
function CategoriesChart({
  catCurrent, catPrev, curLabel, prevLabel,
}: {
  catCurrent: Record<string, number>
  catPrev: Record<string, number>
  curLabel: string
  prevLabel: string
}) {
  const allCats = Array.from(new Set([...Object.keys(catCurrent), ...Object.keys(catPrev)]))
  const cats = allCats
    .map(name => {
      const cur = catCurrent[name] ?? 0
      const prev = catPrev[name] ?? 0
      const delta = cur - prev
      const pct = prev > 0 ? Math.round((delta / prev) * 100) : cur > 0 ? 100 : 0
      return { name, cur, prev, delta, pct }
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  if (cats.length === 0) {
    return (
      <div style={{
        marginTop: 14, background: 'var(--surface)', borderRadius: 22, padding: 20,
        border: '1px solid var(--hairline2)', textAlign: 'center',
        fontSize: 13, color: 'var(--muted)',
      }}>
        No expense data to compare yet.
      </div>
    )
  }

  const maxAbs = Math.max(...cats.map(c => Math.max(c.cur, c.prev)), 1)

  return (
    <div style={{
      marginTop: 14, background: 'var(--surface)', borderRadius: 22, padding: '14px 16px',
      border: '1px solid var(--hairline2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '2px 4px 14px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>
          By category · {curLabel} vs {prevLabel}
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--muted)', opacity: .45, display: 'inline-block' }} />
            {prevLabel}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ink)', display: 'inline-block' }} />
            {curLabel}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {cats.map(c => {
          const curW = (c.cur / maxAbs) * 100
          const prevW = (c.prev / maxAbs) * 100
          const dir = c.delta === 0 ? 'flat' : c.delta < 0 ? 'down' : 'up'
          const isGood = dir === 'down'
          const dc = dir === 'flat' ? 'var(--muted)' : isGood ? 'var(--income)' : 'var(--expense)'
          const color = CAT_COLORS[c.name] ?? 'var(--muted)'

          return (
            <div key={c.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>{c.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span className="font-[family-name:var(--font-mono)]" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-.01em' }}>
                    ฿{(c.cur / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="font-[family-name:var(--font-mono)] inline-flex items-center gap-0.5" style={{ fontSize: 11.5, fontWeight: 600, color: dc }}>
                    {dir !== 'flat' && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={dc} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        {dir === 'down'
                          ? <path d="M12 4v15m0 0l-6-6m6 6l6-6" />
                          : <path d="M12 20V5m0 0l-6 6m6-6l6 6" />}
                      </svg>
                    )}
                    {dir !== 'flat' ? `${Math.abs(c.pct)}%` : '—'}
                  </span>
                </div>
              </div>
              {/* Paired horizontal bars */}
              <div style={{ position: 'relative', height: 14 }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0,
                  width: `${prevW}%`, height: 6, borderRadius: 99,
                  background: 'var(--muted)', opacity: .25,
                }} />
                <div style={{
                  position: 'absolute', left: 0, top: 8,
                  width: `${curW}%`, height: 6, borderRadius: 99,
                  background: color,
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Insights ──────────────────────────────────────────────────────
function InsightsSection({
  months, catCurrent, catPrev,
}: {
  months: MonthData[]
  catCurrent: Record<string, number>
  catPrev: Record<string, number>
}) {
  const cur = months[months.length - 1]
  const pastMonths = months.slice(0, -1).filter(m => m.income > 0 || m.expense > 0)
  const avgNet = pastMonths.length > 0 ? pastMonths.reduce((s, m) => s + m.net, 0) / pastMonths.length : 0
  const maxNet = Math.max(...pastMonths.map(m => m.net), 0)

  const allCats = Array.from(new Set([...Object.keys(catCurrent), ...Object.keys(catPrev)]))
  const catChanges = allCats.map(name => ({
    name,
    cur: catCurrent[name] ?? 0,
    prev: catPrev[name] ?? 0,
    delta: (catCurrent[name] ?? 0) - (catPrev[name] ?? 0),
    pct: (catPrev[name] ?? 0) > 0
      ? Math.round(((catCurrent[name] ?? 0) - (catPrev[name] ?? 0)) / (catPrev[name] ?? 1) * 100)
      : 0,
  }))

  const biggestDrop = catChanges.filter(c => c.delta < 0 && c.prev > 0).sort((a, b) => a.delta - b.delta)[0]
  const biggestRise = catChanges.filter(c => c.delta > 0 && c.prev > 0 && c.pct > 10).sort((a, b) => b.pct - a.pct)[0]

  const insights: Array<{ tone: 'income' | 'warn' | 'neutral'; title: string; body: string }> = []

  if (pastMonths.length > 0 && cur.net > 0) {
    if (cur.net > maxNet) {
      insights.push({
        tone: 'income',
        title: 'On track for your best net in this period',
        body: `Net is ${fmtBaht(cur.net)} — already above the previous high of ${fmtBaht(maxNet)}.`,
      })
    } else if (cur.net > avgNet && avgNet > 0) {
      insights.push({
        tone: 'income',
        title: 'Above your average net',
        body: `${fmtBaht(cur.net)} this month vs avg ${fmtBaht(Math.round(avgNet))} over the last ${pastMonths.length} months.`,
      })
    }
  }

  if (biggestDrop) {
    insights.push({
      tone: 'income',
      title: `${biggestDrop.name} spending dropped`,
      body: `−฿${(Math.abs(biggestDrop.delta) / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })} vs last month${Math.abs(biggestDrop.pct) > 0 ? ` (${Math.abs(biggestDrop.pct)}% less)` : ''}.`,
    })
  }

  if (biggestRise) {
    insights.push({
      tone: 'warn',
      title: `${biggestRise.name} is up this month`,
      body: `+฿${(biggestRise.delta / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })} vs last month (+${biggestRise.pct}%). Worth a look.`,
    })
  }

  if (insights.length === 0) return null

  return (
    <div style={{ marginTop: 22 }}>
      <div
        className="text-[11.5px] font-semibold tracking-widest uppercase flex items-center gap-1.5"
        style={{ color: 'var(--muted)', marginBottom: 10 }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
        </svg>
        Insights
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {insights.map((ins, i) => {
          const ink = ins.tone === 'income' ? 'var(--income)' : ins.tone === 'warn' ? '#a07212' : 'var(--ink)'
          const bg = ins.tone === 'income' ? 'var(--income-bg)' : ins.tone === 'warn' ? '#f7efd9' : 'var(--surface)'
          const br = ins.tone === 'income' ? '#cbe6d4' : ins.tone === 'warn' ? '#e8d8a6' : 'var(--hairline2)'
          return (
            <div key={i} style={{
              background: bg, border: `1px solid ${br}`, borderRadius: 16,
              padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 10, background: '#fff',
                border: `1px solid ${br}`, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-.005em' }}>{ins.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink2)', marginTop: 2, lineHeight: 1.45 }}>{ins.body}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
