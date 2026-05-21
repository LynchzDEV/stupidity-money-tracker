import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0e5c3a',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 120,
            height: 120,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          <svg width="72" height="72" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M152 104 H360 V348 Q347 338 334 348 Q321 358 308 348 Q295 338 282 348 Q269 358 256 348 Q243 338 230 348 Q217 358 204 348 Q191 338 178 348 Q165 358 152 348 Z"
              fill="white"
            />
            <rect x="188" y="178" width="136" height="12" rx="6" fill="#0e5c3a" opacity="0.3"/>
            <rect x="188" y="204" width="112" height="12" rx="6" fill="#0e5c3a" opacity="0.3"/>
            <rect x="188" y="274" width="136" height="16" rx="8" fill="#0e5c3a" opacity="0.5"/>
            <path d="M334 72 L306 124 H326 L294 180 L358 116 H338 L366 72 Z" fill="#fcd34d"/>
          </svg>
        </div>

        {/* Wordmark */}
        <div style={{ fontSize: 72, fontWeight: 700, color: 'white', letterSpacing: -2 }}>
          SlipTrack
        </div>

        {/* Tagline */}
        <div style={{ fontSize: 32, color: 'rgba(255,255,255,0.7)', marginTop: 16 }}>
          Snap a receipt. Done.
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
