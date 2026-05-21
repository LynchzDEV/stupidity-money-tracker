import type { Metadata } from 'next'
import { signIn } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Track Receipts with AI',
  description: 'Upload a photo of any receipt. Our AI instantly extracts details & organizes expenses. Start for free.',
  robots: { index: true, follow: false },
  openGraph: {
    title: 'Track Receipts with AI · SlipTrack',
    description: 'Upload a photo of any receipt. Our AI instantly extracts details & organizes expenses. Start for free.',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SlipTrack',
  description: 'AI-powered receipt and expense tracking application',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Android, iOS, Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'THB' },
  url: 'https://sliptrack.app',
  image: 'https://sliptrack.app/api/og',
}

export default function LoginPage() {
  return (
    <main className="min-h-[100dvh] bg-[var(--bg)] relative overflow-hidden flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Aurora blobs */}
      <div className="absolute top-[-80px] right-[-80px] w-[280px] h-[280px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(14,92,58,.18), transparent 70%)', filter: 'blur(20px)' }} />
      <div className="absolute bottom-[-100px] left-[-100px] w-[320px] h-[320px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(178,73,44,.10), transparent 70%)', filter: 'blur(30px)' }} />

      {/* Brand */}
      <div className="absolute top-24 left-0 right-0 text-center">
        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
          style={{ background: 'var(--accent)', boxShadow: '0 8px 24px rgba(14,92,58,.3)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h10l3 3v15H5V4a1 1 0 0 1 1-1Z"/>
            <path d="M9 10h6M9 14h6M9 18h4"/>
          </svg>
        </div>
        <h1 className="mt-5 text-[38px] leading-none tracking-tight text-[var(--ink)]"
          style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontWeight: 400 }}>
          SlipTrack
        </h1>
        <p className="text-[15px] text-[var(--muted)] mt-1 px-10">
          Snap a receipt. We do the rest.
        </p>
      </div>

      {/* Receipt card previews */}
      <div className="absolute top-[280px] left-0 right-0 flex justify-center gap-3 px-6">
        {[
          { tilt: -6, label: '฿79', sub: '7-Eleven', income: false },
          { tilt: 0,  label: '฿45,000', sub: 'Salary', income: true },
          { tilt: 6,  label: '฿48', sub: 'BTS', income: false },
        ].map((c, i) => (
          <div key={i} className="animate-fadeup w-[100px] p-3 rounded-2xl bg-white border"
            style={{
              borderColor: 'var(--hairline2)',
              boxShadow: 'var(--shadow-sm)',
              transform: `rotate(${c.tilt}deg) translateY(${Math.abs(c.tilt) * 1.5}px)`,
              animationDelay: `${i * 0.1}s`,
            }}>
            <div className="font-[family-name:var(--font-mono)] text-base font-bold tracking-tight leading-none"
              style={{ color: c.income ? 'var(--income)' : 'var(--ink)' }}>
              {c.income ? '+' : ''}{c.label}
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-1">{c.sub}</div>
            <div className="h-5 mt-2"
              style={{ background: 'repeating-linear-gradient(90deg, #c8c4b3 0 1px, transparent 1px 4px)' }} />
          </div>
        ))}
      </div>

      {/* Sign-in button */}
      <div className="absolute bottom-16 left-6 right-6">
        <form action={async () => {
          'use server'
          await signIn('google', { redirectTo: '/' })
        }}>
          <button type="submit"
            className="w-full h-14 rounded-2xl text-white text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[.97] transition-transform"
            style={{ background: 'var(--accent)', boxShadow: '0 2px 6px rgba(14,92,58,.25)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#fff" d="M21.35 11.1H12v2.96h5.35a4.8 4.8 0 0 1-2.08 3.15v2.62h3.36c1.97-1.82 3.1-4.5 3.1-7.7 0-.66-.06-1.3-.18-2.03Z"/>
              <path fill="#fff" opacity=".85" d="M12 21c2.7 0 4.96-.9 6.61-2.43l-3.36-2.62c-.93.62-2.13 1-3.25 1-2.5 0-4.63-1.7-5.4-3.96H3.13v2.49A9 9 0 0 0 12 21Z"/>
              <path fill="#fff" opacity=".7" d="M6.6 13c-.2-.6-.32-1.25-.32-1.9 0-.65.12-1.3.32-1.9V6.7H3.13a9 9 0 0 0 0 8.79L6.6 13Z"/>
              <path fill="#fff" opacity=".85" d="M12 5.92a4.86 4.86 0 0 1 3.44 1.36l2.58-2.58A9 9 0 0 0 3.13 6.71L6.6 9.2c.77-2.26 2.9-3.27 5.4-3.27Z"/>
            </svg>
            Continue with Google
          </button>
        </form>
        {process.env.DEV_USER_EMAIL && (
          <form action={async () => {
            'use server'
            await signIn('credentials', { bypass: '1', redirectTo: '/' })
          }}>
            <button type="submit"
              className="w-full h-11 rounded-2xl text-[13px] font-medium flex items-center justify-center gap-2 mt-3 active:opacity-70 transition-opacity"
              style={{ background: 'rgba(0,0,0,.06)', border: '1px dashed var(--hairline)', color: 'var(--muted)' }}>
              Dev login · {process.env.DEV_USER_EMAIL}
            </button>
          </form>
        )}
        <div className="text-center mt-4 text-xs text-[var(--muted)]">By continuing you agree to our terms.</div>
      </div>
    </main>
  )
}
