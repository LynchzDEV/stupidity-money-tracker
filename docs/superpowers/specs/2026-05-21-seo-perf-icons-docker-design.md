# SlipTrack — SEO, Performance, Icons, Docker Design

**Date:** 2026-05-21  
**App:** SlipTrack — AI receipt scanner → expense ledger (Next.js 16, mobile-first PWA)

---

## 1. SEO

### Scope
Single public page: `/login`. All other routes are authenticated — they get `robots: { index: false }`.

### Changes

**`app/layout.tsx` — root metadata**
```ts
export const metadata: Metadata = {
  metadataBase: new URL('https://sliptrack.app'),
  title: { default: 'SlipTrack', template: '%s · SlipTrack' },
  description: 'Snap a receipt. Done. AI-powered expense tracking for individuals.',
  openGraph: {
    type: 'website',
    siteName: 'SlipTrack',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/favicon.ico' }],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
}
```

**`app/(auth)/login/page.tsx`** — add page-level metadata:
```ts
export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: true, follow: false },
}
```

**`app/[bookId]/...` layouts** — noindex all book/authenticated routes via root metadata override:
- Add `robots: { index: false }` to `app/[bookId]/layout.tsx` (create if missing)

**`public/robots.txt`**
```
User-agent: *
Allow: /
Allow: /login
Disallow: /api/
Disallow: /books/
Disallow: /settings/
Sitemap: https://sliptrack.app/sitemap.xml
```

**`app/sitemap.ts`** — single entry for login page:
```ts
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: 'https://sliptrack.app/login', lastModified: new Date(), changeFrequency: 'monthly', priority: 1 }]
}
```

**`app/api/og/route.tsx`** — `ImageResponse` 1200×630:
- Forest green background (`#0e5c3a`)
- White SlipTrack wordmark + receipt+spark logo
- Tagline: "Snap a receipt. Done."

---

## 2. Performance

### Quick Wins

**`next.config.ts`**
- `output: 'standalone'` (required for Docker)
- `headers()`: `Cache-Control: public, max-age=31536000, immutable` for `/_next/static/(.*)`, `Cache-Control: public, max-age=86400` for `/icon*`, `/apple-touch-icon*`, `/manifest.json`
- Security headers: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`

**`public/`** — delete unused placeholder SVGs:
- `next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg`

**`app/layout.tsx`** — add `<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="">` (already using `next/font` so fonts preloaded automatically — verify no extra `@import`)

**Image audit** — scan for bare `<img>` tags → replace with `next/image`

**`public/manifest.json`** — PWA manifest:
```json
{
  "name": "SlipTrack",
  "short_name": "SlipTrack",
  "description": "AI-powered expense tracking",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f5f3ec",
  "theme_color": "#0e5c3a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable any" }
  ]
}
```

### Lighthouse CI Pipeline

**`.github/workflows/lighthouse.yml`**
- Trigger: `pull_request` to `main`
- Steps: checkout → install → build → start server → run `@lhci/cli` → upload results
- Uses `lhci autorun` with assertions

**`lighthouserc.json`**
```json
{
  "ci": {
    "collect": { "url": ["http://localhost:3000/login"], "numberOfRuns": 3 },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.85 }],
        "categories:accessibility": ["error", { "minScore": 0.90 }],
        "categories:best-practices": ["warn", { "minScore": 0.90 }],
        "categories:seo": ["error", { "minScore": 0.90 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

Performance: warn at 85 (don't fail CI hard — auth redirects make full scores unreliable). Accessibility + SEO: error at 90 (these are deterministic).

---

## 3. Logo & Icons

### Design Concept
Receipt paper curl (rounded rectangle with torn bottom edge) + small lightning bolt in top-right corner indicating AI/instant capture.

**Colors:**
- Primary: `#0e5c3a` (forest green — `--accent`)
- Background/paper: `#f5f3ec` (warm off-white)
- Lightning: `#ffffff` (white, on green)

### Files to produce

| File | Size | Use |
|------|------|-----|
| `public/icon.svg` | vector | Browser tab, `<link rel="icon">` |
| `public/favicon.ico` | 32×32 embedded | Legacy browsers |
| `public/apple-touch-icon.png` | 180×180 | iOS home screen |
| `public/icon-192.png` | 192×192 | PWA Android |
| `public/icon-512.png` | 512×512 | PWA splash |
| OG via `/api/og` | 1200×630 | Social sharing |

**SVG strategy:** Design `icon.svg` as the master. PNG exports via `sharp` in a one-off build script (`scripts/generate-icons.ts`) — runs once, outputs committed PNGs. No runtime dependency.

---

## 4. Docker

### Dockerfile (multi-stage)

```dockerfile
# Stage 1: deps
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: builder
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# Stage 3: runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
USER nextjs
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

**`next.config.ts`** must have `output: 'standalone'`.

### Build & Push (multi-arch)

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t lynchz/income-expense:latest \
  --push .
```

Add `BUILD_TAG` support: `-t lynchz/income-expense:$(git rev-parse --short HEAD)` alongside `latest`.

### `docker-compose.prod.yml`

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
    env_file: .env.prod
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sliptrack"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  postgres_data:
```

**`.env.prod.example`** (committed, no secrets):
```
DATABASE_URL=postgresql://sliptrack:CHANGE_ME@postgres:5432/sliptrack
NEXTAUTH_SECRET=CHANGE_ME
NEXTAUTH_URL=https://yourdomain.com
OPENROUTER_API_KEY=CHANGE_ME
OPENROUTER_MODEL=google/gemini-2.5-flash
IMMICH_URL=CHANGE_ME
IMMICH_API_KEY=CHANGE_ME
```

Note: In compose, DB host is `postgres` (service name), port `5432` (internal). The `5433` port is only for local dev where host port is remapped.

---

## Implementation Order

1. `next.config.ts` — add `output: 'standalone'` + headers (blocks Docker)
2. Logo SVG + icon generation script → commit PNG assets
3. SEO metadata + `robots.txt` + `sitemap.ts` + OG route
4. `manifest.json` + PWA links
5. `Dockerfile` + `docker-compose.prod.yml` + `.env.prod.example`
6. Lighthouse CI workflow + `lighthouserc.json`
7. Delete unused public SVGs + `<img>` → `next/image` audit
