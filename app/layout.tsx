import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0e5c3a',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://sliptrack.app'),
  title: {
    default: 'SlipTrack',
    template: '%s · SlipTrack',
  },
  description: 'Snap a receipt. Done. AI-powered expense tracking for individuals.',
  openGraph: {
    type: 'website',
    siteName: 'SlipTrack',
    title: 'SlipTrack',
    description: 'Snap a receipt. Done. AI-powered expense tracking for individuals.',
    images: [{ url: '/api/og', width: 1200, height: 630, alt: 'SlipTrack' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SlipTrack',
    description: 'Snap a receipt. Done. AI-powered expense tracking for individuals.',
    images: ['/api/og'],
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.json',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable}`}>
      <body className="font-[family-name:var(--font-geist)] bg-[var(--bg)] text-[var(--ink)]">
        {children}
      </body>
    </html>
  )
}
