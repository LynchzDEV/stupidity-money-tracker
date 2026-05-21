import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: [
    '192.168.1.114',
    'dc1c-2405-9800-b651-7917-d4b1-de8d-5905-7bef.ngrok-free.app',
  ],
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/(icon.*|apple-touch-icon.*|favicon.*|manifest.json)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
