# SEO, Performance, Icons & Docker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full SEO metadata, Lighthouse CI, branded icon set, and multi-arch Docker deployment to SlipTrack.

**Architecture:** Static SEO metadata in Next.js App Router layout/page files; SVG logo → PNG icon set generated once via script; multi-stage standalone Dockerfile for `lynchz/income-expense`; Lighthouse CI on GitHub Actions testing the `/login` page.

**Tech Stack:** Next.js 16.2.6 (App Router), `next/og` (ImageResponse), `sharp` (icon generation, already installed), `@lhci/cli` (Lighthouse), GitHub Actions, Docker buildx, Prisma 7 with `@prisma/adapter-pg`.

---

## File Map

| Action | File |
|--------|------|
| Modify | `next.config.ts` |
| Create | `public/icon.svg` |
| Create | `scripts/generate-icons.mjs` |
| Create | `public/manifest.json` |
| Create | `public/favicon.png` |
| Create | `public/apple-touch-icon.png` |
| Create | `public/icon-192.png` |
| Create | `public/icon-512.png` |
| Modify | `app/layout.tsx` |
| Modify | `app/(auth)/login/page.tsx` |
| Create | `app/[bookId]/layout.tsx` |
| Create | `public/robots.txt` |
| Create | `app/sitemap.ts` |
| Create | `app/api/og/route.tsx` |
| Modify | `app/[bookId]/history/client.tsx` |
| Modify | `components/transaction-list.tsx` |
| Modify | `components/recent-transactions.tsx` |
| Create | `Dockerfile` |
| Create | `docker-compose.prod.yml` |
| Create | `.env.prod.example` |
| Create | `.github/workflows/lighthouse.yml` |
| Create | `lighthouserc.json` |
| Delete | `public/next.svg`, `public/vercel.svg`, `public/globe.svg`, `public/window.svg`, `public/file.svg` |

---

## Task 1: Update `next.config.ts` — standalone output + headers

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Replace `next.config.ts` with full config**

```ts
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
```

- [ ] **Step 2: Verify build still works**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully` and a `.next/standalone/` directory now exists.

```bash
ls .next/standalone/
```

Expected: `node_modules/  package.json  server.js`

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat: standalone output, cache headers, security headers"
```

---

## Task 2: Create `public/icon.svg` — SlipTrack logo

**Files:**
- Create: `public/icon.svg`

- [ ] **Step 1: Write the SVG**

Design: forest-green rounded square, white receipt paper with torn/scalloped bottom edge, amber lightning bolt at top-right indicating AI.

```bash
cat > public/icon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Green background -->
  <rect width="512" height="512" rx="96" fill="#0e5c3a"/>

  <!-- Receipt white body (flat top, scalloped bottom) -->
  <path d="M152 104 H360 V348
    Q347 338 334 348
    Q321 358 308 348
    Q295 338 282 348
    Q269 358 256 348
    Q243 338 230 348
    Q217 358 204 348
    Q191 338 178 348
    Q165 358 152 348 Z"
    fill="white"/>

  <!-- Receipt content lines -->
  <rect x="188" y="152" width="96" height="12" rx="6" fill="#0e5c3a" opacity="0.2"/>
  <rect x="188" y="178" width="136" height="12" rx="6" fill="#0e5c3a" opacity="0.2"/>
  <rect x="188" y="204" width="112" height="12" rx="6" fill="#0e5c3a" opacity="0.2"/>
  <rect x="188" y="230" width="136" height="12" rx="6" fill="#0e5c3a" opacity="0.2"/>

  <!-- Divider -->
  <rect x="188" y="258" width="136" height="2" rx="1" fill="#0e5c3a" opacity="0.15"/>

  <!-- Amount (bolder) -->
  <rect x="188" y="274" width="136" height="16" rx="8" fill="#0e5c3a" opacity="0.45"/>

  <!-- Lightning bolt (AI spark) — top-right of receipt -->
  <path d="M334 72 L306 124 H326 L294 180 L358 116 H338 L366 72 Z" fill="#fcd34d"/>
</svg>
EOF
```

- [ ] **Step 2: Verify SVG renders in browser**

```bash
open public/icon.svg
```

Check: green background, white receipt, yellow lightning bolt visible.

- [ ] **Step 3: Commit**

```bash
git add public/icon.svg
git commit -m "feat: add SlipTrack logo SVG"
```

---

## Task 3: Generate PNG icon set from SVG

**Files:**
- Create: `scripts/generate-icons.mjs`
- Create (generated): `public/favicon.png`, `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png`

`sharp` is already in `node_modules` (production dep).

- [ ] **Step 1: Write generation script**

```bash
cat > scripts/generate-icons.mjs << 'EOF'
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svg = readFileSync(join(root, 'public/icon.svg'))

const sizes = [
  { name: 'favicon.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
]

for (const { name, size } of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(join(root, 'public', name))
  console.log(`✓ ${name} (${size}x${size})`)
}
EOF
```

- [ ] **Step 2: Run the script**

```bash
node scripts/generate-icons.mjs
```

Expected output:
```
✓ favicon.png (32x32)
✓ apple-touch-icon.png (180x180)
✓ icon-192.png (192x192)
✓ icon-512.png (512x512)
```

- [ ] **Step 3: Verify files exist**

```bash
ls -lh public/*.png public/icon.svg
```

Expected: 4 PNG files and icon.svg present with non-zero sizes.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-icons.mjs public/favicon.png public/apple-touch-icon.png public/icon-192.png public/icon-512.png
git commit -m "feat: icon generation script and PNG assets"
```

---

## Task 4: Create `public/manifest.json` — PWA manifest

**Files:**
- Create: `public/manifest.json`

- [ ] **Step 1: Write manifest**

```bash
cat > public/manifest.json << 'EOF'
{
  "name": "SlipTrack",
  "short_name": "SlipTrack",
  "description": "Snap a receipt. Done. AI-powered expense tracking.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f5f3ec",
  "theme_color": "#0e5c3a",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any"
    }
  ]
}
EOF
```

- [ ] **Step 2: Commit**

```bash
git add public/manifest.json
git commit -m "feat: PWA manifest"
```

---

## Task 5: Update `app/layout.tsx` — full SEO metadata + icons + manifest

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace metadata and add manifest/icon links**

Current file starts at line 1. Replace the entire `metadata` export and `viewport` export. The fonts and layout structure stay the same.

```ts
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
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
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
```

Note: root metadata sets `robots: { index: false }` as a safe default — individual public pages override this.

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: full SEO metadata, OG tags, icon links, PWA manifest"
```

---

## Task 6: Add per-page robots metadata

**Files:**
- Modify: `app/(auth)/login/page.tsx`
- Create: `app/[bookId]/layout.tsx`

- [ ] **Step 1: Add indexable metadata to login page**

Add at the top of `app/(auth)/login/page.tsx`, before the `export default function LoginPage()`:

```ts
import type { Metadata } from 'next'
import { signIn } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to SlipTrack to track your receipts and expenses.',
  robots: { index: true, follow: false },
  openGraph: {
    title: 'Sign in to SlipTrack',
    description: 'Snap a receipt. Done.',
  },
}
```

- [ ] **Step 2: Create `app/[bookId]/layout.tsx` to noindex authenticated pages**

```ts
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(auth)/login/page.tsx app/[bookId]/layout.tsx
git commit -m "feat: noindex auth routes, index login page"
```

---

## Task 7: Create `public/robots.txt` + `app/sitemap.ts`

**Files:**
- Create: `public/robots.txt`
- Create: `app/sitemap.ts`

- [ ] **Step 1: Write robots.txt**

```bash
cat > public/robots.txt << 'EOF'
User-agent: *
Allow: /
Allow: /login
Disallow: /api/
Disallow: /books/
Sitemap: https://sliptrack.app/sitemap.xml
EOF
```

- [ ] **Step 2: Write sitemap.ts**

```ts
import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://sliptrack.app/login',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
```

Save to `app/sitemap.ts`.

- [ ] **Step 3: Verify routes work**

```bash
npm run dev &
sleep 5
curl -s http://localhost:3000/robots.txt
curl -s http://localhost:3000/sitemap.xml | head -5
kill %1
```

Expected: robots.txt content returned, sitemap.xml has `<urlset>` tag.

- [ ] **Step 4: Commit**

```bash
git add public/robots.txt app/sitemap.ts
git commit -m "feat: robots.txt and sitemap"
```

---

## Task 8: Create OG image route `app/api/og/route.tsx`

**Files:**
- Create: `app/api/og/route.tsx`

- [ ] **Step 1: Write ImageResponse route**

```tsx
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
```

- [ ] **Step 2: Verify route returns an image**

```bash
npm run dev &
sleep 5
curl -s -o /dev/null -w "%{http_code} %{content_type}" http://localhost:3000/api/og
kill %1
```

Expected: `200 image/png`

- [ ] **Step 3: Commit**

```bash
git add app/api/og/route.tsx
git commit -m "feat: OG image route (1200x630)"
```

---

## Task 9: Migrate thumbnail `<img>` → `next/image`

**Files:**
- Modify: `app/[bookId]/history/client.tsx`
- Modify: `components/transaction-list.tsx`
- Modify: `components/recent-transactions.tsx`

All 3 use `getThumbnailUrl()` which returns `/api/immich/${assetId}/thumbnail` — a relative URL that `next/image` handles without extra config. Blob URL usages in `upload/client.tsx`, `confirm-sheet.tsx`, and `thinking-overlay.tsx` stay as `<img>` (next/image does not support blob URLs).

- [ ] **Step 1: Update `app/[bookId]/history/client.tsx`**

Find:
```tsx
// eslint-disable-next-line @next/next/no-img-element
<img src={getThumbnailUrl(tx.immichAssetId)} alt=""
  className="w-10 h-12 rounded-[6px] object-cover flex-shrink-0"
  style={{ border: '1px solid var(--hairline)' }} />
```

Replace with:
```tsx
<Image
  src={getThumbnailUrl(tx.immichAssetId)}
  alt=""
  width={40}
  height={48}
  className="rounded-[6px] object-cover flex-shrink-0"
  style={{ border: '1px solid var(--hairline)' }}
/>
```

Also add `import Image from 'next/image'` at the top of the file.

- [ ] **Step 2: Update `components/transaction-list.tsx`** — two img tags

First img (small thumbnail, `w-10 h-10`):

Find:
```tsx
// eslint-disable-next-line @next/next/no-img-element
<img
  src={getThumbnailUrl(tx.immichAssetId)}
  alt="Receipt"
  className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-[var(--bg)]"
/>
```

Replace with:
```tsx
<Image
  src={getThumbnailUrl(tx.immichAssetId)}
  alt="Receipt"
  width={40}
  height={40}
  className="rounded-lg object-cover flex-shrink-0 bg-[var(--bg)]"
/>
```

Second img (expanded full-width, `w-full max-h-64`):

Find:
```tsx
// eslint-disable-next-line @next/next/no-img-element
<img
  src={getThumbnailUrl(tx.immichAssetId)}
  alt="Receipt full"
  className="w-full rounded-xl object-contain max-h-64 bg-[var(--bg)]"
/>
```

Replace with:
```tsx
<Image
  src={getThumbnailUrl(tx.immichAssetId)}
  alt="Receipt full"
  width={0}
  height={0}
  sizes="100vw"
  className="rounded-xl object-contain bg-[var(--bg)]"
  style={{ width: '100%', height: 'auto', maxHeight: 256 }}
/>
```

Also add `import Image from 'next/image'` at the top of the file.

- [ ] **Step 3: Update `components/recent-transactions.tsx`**

Find:
```tsx
// eslint-disable-next-line @next/next/no-img-element
<img src={getThumbnailUrl(tx.immichAssetId)} alt="" className="w-10 h-12 rounded-[6px] object-cover flex-shrink-0"
  style={{ border: '1px solid var(--hairline)' }} />
```

Replace with:
```tsx
<Image
  src={getThumbnailUrl(tx.immichAssetId)}
  alt=""
  width={40}
  height={48}
  className="rounded-[6px] object-cover flex-shrink-0"
  style={{ border: '1px solid var(--hairline)' }}
/>
```

Also add `import Image from 'next/image'` at the top of the file.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/[bookId]/history/client.tsx components/transaction-list.tsx components/recent-transactions.tsx
git commit -m "perf: migrate thumbnail img tags to next/image"
```

---

## Task 10: Create `Dockerfile`

**Files:**
- Create: `Dockerfile`

The project uses `@prisma/adapter-pg` (no native Prisma engine binary needed — pure JS client). `prisma` CLI is in `dependencies` so it's available after `npm ci`.

- [ ] **Step 1: Write Dockerfile**

```dockerfile
# Stage 1: install all dependencies (dev + prod, needed for build)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: build Next.js standalone output
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# Stage 3: minimal production runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma schema + migrations for `prisma migrate deploy` at startup
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Prisma CLI (no engine binary needed with adapter-pg)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
```

- [ ] **Step 2: Create `.dockerignore`**

```bash
cat > .dockerignore << 'EOF'
.next
node_modules
.git
.env*
!.env.prod.example
*.log
docs/
.github/
EOF
```

- [ ] **Step 3: Verify local Docker build**

```bash
docker build -t sliptrack-test .
```

Expected: build completes, all 3 stages succeed, final image created.

```bash
docker image inspect sliptrack-test --format='{{.Size}}' | numfmt --to=iec
```

Expected: under 500MB.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "feat: multi-stage Dockerfile with Prisma migrate on startup"
```

---

## Task 11: Create `docker-compose.prod.yml` + `.env.prod.example`

**Files:**
- Create: `docker-compose.prod.yml`
- Create: `.env.prod.example`

- [ ] **Step 1: Write production compose file**

```yaml
services:
  app:
    image: lynchz/income-expense:latest
    restart: unless-stopped
    env_file: .env.prod
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-sliptrack}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-sliptrack}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-sliptrack}"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  postgres_data:
```

Save to `docker-compose.prod.yml`.

Note: `DATABASE_URL` in `.env.prod` must use `postgres` as the host (the compose service name) and port `5432` (internal network port, not the remapped 5433).

- [ ] **Step 2: Write `.env.prod.example`**

```bash
cat > .env.prod.example << 'EOF'
# Copy this to .env.prod and fill in values — .env.prod is gitignored

# Database — host is the compose service name "postgres", port 5432
DATABASE_URL=postgresql://sliptrack:CHANGE_ME@postgres:5432/sliptrack
POSTGRES_USER=sliptrack
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DB=sliptrack

# NextAuth
NEXTAUTH_SECRET=CHANGE_ME_generate_with_openssl_rand_-base64_32
NEXTAUTH_URL=https://yourdomain.com

# AI
OPENROUTER_API_KEY=CHANGE_ME
OPENROUTER_MODEL=google/gemini-2.5-flash

# Immich photo storage
IMMICH_URL=https://your-immich-instance.com
IMMICH_API_KEY=CHANGE_ME
EOF
```

- [ ] **Step 3: Ensure `.env.prod` is gitignored**

```bash
grep -q '\.env\.prod$' .gitignore || echo '.env.prod' >> .gitignore
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.prod.yml .env.prod.example .gitignore
git commit -m "feat: production docker-compose with postgres healthcheck"
```

---

## Task 12: Multi-arch build + push to Docker Hub

This task documents the build command — it's not automated (requires Docker Hub credentials and buildx setup).

- [ ] **Step 1: Ensure buildx builder exists**

```bash
docker buildx inspect multiarch 2>/dev/null || docker buildx create --name multiarch --use
```

- [ ] **Step 2: Build and push multi-arch image**

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t lynchz/income-expense:latest \
  -t lynchz/income-expense:$(git rev-parse --short HEAD) \
  --push \
  .
```

Expected: pushes both architectures to `lynchz/income-expense`.

- [ ] **Step 3: Verify on Docker Hub**

```bash
docker buildx imagetools inspect lynchz/income-expense:latest | grep Platform
```

Expected: shows both `linux/amd64` and `linux/arm64`.

---

## Task 13: Lighthouse CI pipeline

**Files:**
- Create: `lighthouserc.json`
- Create: `.github/workflows/lighthouse.yml`

- [ ] **Step 1: Write `lighthouserc.json`**

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000/login"],
      "numberOfRuns": 3,
      "settings": {
        "chromeFlags": "--no-sandbox --disable-dev-shm-usage"
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.90 }],
        "categories:accessibility": ["error", { "minScore": 0.90 }],
        "categories:best-practices": ["error", { "minScore": 0.90 }],
        "categories:seo": ["error", { "minScore": 0.90 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

- [ ] **Step 2: Write `.github/workflows/lighthouse.yml`**

```bash
mkdir -p .github/workflows
cat > .github/workflows/lighthouse.yml << 'EOF'
name: Lighthouse CI

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NEXT_TELEMETRY_DISABLED: 1
          # Fake DB URL — login page renders without a real DB connection
          DATABASE_URL: postgresql://sliptrack:sliptrack@localhost:5432/sliptrack
          NEXTAUTH_SECRET: ci-secret-not-real
          NEXTAUTH_URL: http://localhost:3000

      - name: Start server
        run: node .next/standalone/server.js &
        env:
          DATABASE_URL: postgresql://sliptrack:sliptrack@localhost:5432/sliptrack
          NEXTAUTH_SECRET: ci-secret-not-real
          NEXTAUTH_URL: http://localhost:3000

      - name: Wait for server
        run: npx wait-on http://localhost:3000/login --timeout 30000

      - name: Run Lighthouse CI
        run: npx @lhci/cli@0.14 autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.GITHUB_TOKEN }}
EOF
```

- [ ] **Step 3: Commit**

```bash
git add lighthouserc.json .github/workflows/lighthouse.yml
git commit -m "feat: Lighthouse CI on PR (all categories ≥90)"
```

---

## Task 14: Delete unused public SVGs

**Files:**
- Delete: `public/next.svg`, `public/vercel.svg`, `public/globe.svg`, `public/window.svg`, `public/file.svg`

- [ ] **Step 1: Confirm none are imported anywhere**

```bash
grep -r 'next\.svg\|vercel\.svg\|globe\.svg\|window\.svg\|file\.svg' app/ components/ lib/ --include='*.tsx' --include='*.ts'
```

Expected: no output (they're unused boilerplate).

- [ ] **Step 2: Delete them**

```bash
rm public/next.svg public/vercel.svg public/globe.svg public/window.svg public/file.svg
```

- [ ] **Step 3: Run build to confirm no broken imports**

```bash
npm run build 2>&1 | grep -E 'error|Error' | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A public/
git commit -m "chore: remove unused Next.js boilerplate SVGs"
```

---

## Self-Review Checklist

- [x] `output: 'standalone'` — Task 1 ✓
- [x] Cache + security headers — Task 1 ✓
- [x] Logo SVG — Task 2 ✓
- [x] PNG icon set (favicon 32, apple-touch 180, 192, 512) — Task 3 ✓
- [x] `manifest.json` — Task 4 ✓
- [x] Root metadata + OG + Twitter — Task 5 ✓
- [x] Login page indexable, authenticated pages noindexed — Task 6 ✓
- [x] `robots.txt` + `sitemap.ts` — Task 7 ✓
- [x] OG image route 1200×630 — Task 8 ✓
- [x] `next/image` for thumbnail components — Task 9 ✓
- [x] Multi-stage Dockerfile with Prisma migrate — Task 10 ✓
- [x] Production docker-compose + env example — Task 11 ✓
- [x] Multi-arch build command — Task 12 ✓
- [x] Lighthouse CI ≥90 all categories — Task 13 ✓
- [x] Unused SVGs deleted — Task 14 ✓
