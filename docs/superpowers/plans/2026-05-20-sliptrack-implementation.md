# SlipTrack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first web app where uploading a bank slip or paper receipt auto-extracts fields via AI and saves a transaction in 2 taps.

**Architecture:** Next.js 14 App Router for fullstack (API routes + React pages), PostgreSQL + Prisma for persistence, NextAuth v5 (Google OAuth) for auth, Immich API for receipt image storage, OpenRouter (gemini-2.0-flash-001) for vision extraction.

**Tech Stack:** Next.js 14, TypeScript, Prisma, PostgreSQL, NextAuth v5, Tailwind CSS, Aceternity UI, shadcn/ui, Framer Motion, OpenRouter API, Immich API, Vitest, React Testing Library.

---

## File Map

```
app/
  layout.tsx                        # root layout: fonts, providers, metadata
  page.tsx                          # redirect: default book → upload, else → /books
  (auth)/login/page.tsx             # login screen (Google OAuth)
  books/page.tsx                    # book selector screen
  [bookId]/upload/page.tsx          # upload home screen (camera/file picker)
  [bookId]/dashboard/page.tsx       # dashboard: summary + chart + recent
  [bookId]/history/page.tsx         # full transaction history + search
  api/auth/[...nextauth]/route.ts   # NextAuth handler
  api/books/route.ts                # GET /api/books, POST /api/books
  api/books/[id]/route.ts           # PATCH /api/books/:id, DELETE /api/books/:id
  api/extract/route.ts              # POST /api/extract (multipart → Immich + OpenRouter)
  api/transactions/route.ts         # GET /api/transactions, POST /api/transactions
  api/transactions/[id]/route.ts    # PATCH /api/transactions/:id

components/
  book-card.tsx                     # 3D card for book selector (Aceternity)
  book-chip.tsx                     # top-left chip that opens book sheet
  book-sheet.tsx                    # bottom sheet: list books, set default, new book
  upload-zone.tsx                   # drag-drop / camera file input
  thinking-overlay.tsx              # shimmer skeleton while AI reads
  confirm-sheet.tsx                 # chat-style bottom sheet: chips + save
  saved-toast.tsx                   # fullscreen checkmark flash (200ms)
  dashboard-summary.tsx             # income / expense / balance cards
  category-chart.tsx                # horizontal bar chart top-5 categories
  transaction-list.tsx              # list rows with Immich thumbnail
  transaction-row.tsx               # single expandable row

lib/
  prisma.ts                         # prisma client singleton (Next.js safe)
  auth.ts                           # NextAuth config (Google provider + session callbacks)
  immich.ts                         # uploadAsset(buffer, filename) → assetId; thumbnailUrl(assetId)
  openrouter.ts                     # extractFromImage(base64) → ExtractionResult
  utils.ts                          # formatTHB, satangToTHB, thbToSatang, cn

prisma/
  schema.prisma                     # User, Book, Transaction models

middleware.ts                       # protect /books, /[bookId]/* — redirect to /login
styles/globals.css                  # Tailwind directives + CSS custom properties (design tokens)
```

---

## Task 1: Project Scaffold

**Files:**
- Create: all root config files
- Create: `.env.local`

- [ ] **Step 1: Init Next.js project**

```bash
cd /Users/lynchz/Desktop/projects/income-and-expenses-ai-trackker
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint
```

Answer prompts: Yes to all defaults.

- [ ] **Step 2: Install dependencies**

```bash
npm install @prisma/client prisma
npm install next-auth@beta @auth/prisma-adapter
npm install framer-motion
npm install @radix-ui/react-dialog @radix-ui/react-slot
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

Create `vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to package.json**

Open `package.json`, add to `scripts`:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Create .env.local**

```bash
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sliptrack"
NEXTAUTH_SECRET="replace-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
IMMICH_URL="https://your-immich-instance.com"
IMMICH_API_KEY="your-immich-api-key"
IMMICH_ALBUM_ID="uuid-of-sliptrack-album"
OPENROUTER_API_KEY="your-openrouter-api-key"
EOF
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: server starts on http://localhost:3000, no errors.

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js project with dependencies"
```

---

## Task 2: Design Tokens + Global Styles

**Files:**
- Modify: `styles/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Set up global CSS with design tokens**

Replace `styles/globals.css` (or `app/globals.css` if that's where Next put it):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #f5f3ec;
  --paper: #fbfaf5;
  --surface: #ffffff;
  --ink: #15171a;
  --ink2: #3a3d38;
  --muted: #7a7d76;
  --hairline: #e6e3d8;
  --hairline2: #efece2;
  --accent: #0e5c3a;
  --accent-ink: #0a4a2e;
  --accent-soft: #ecf3ee;
  --accent-mid: #cfe1d5;
  --income: #1f8a5b;
  --income-bg: #e8f3ec;
  --expense: #b2492c;
  --expense-bg: #f5ebe4;
}

html, body {
  background-color: var(--bg);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}

@keyframes shimmer {
  0% { background-position: -200% 0 }
  100% { background-position: 200% 0 }
}

@keyframes fadeup {
  from { transform: translateY(8px); opacity: 0 }
  to { transform: translateY(0); opacity: 1 }
}

@keyframes pop {
  from { transform: scale(0.92); opacity: 0 }
  to { transform: scale(1); opacity: 1 }
}

.shimmer {
  background: linear-gradient(90deg,
    rgba(20,22,18,.06) 0%,
    rgba(20,22,18,.16) 50%,
    rgba(20,22,18,.06) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.6s linear infinite;
  border-radius: 4px;
}
```

- [ ] **Step 2: Update root layout with Geist fonts**

Replace `app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif',
})

export const metadata: Metadata = {
  title: 'SlipTrack',
  description: 'Receipt → ledger in 2 taps',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
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

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: design tokens and global styles"
```

---

## Task 3: Prisma Schema + Database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/prisma.ts`

- [ ] **Step 1: Init Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write schema**

Replace `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  createdAt DateTime @default(now())
  books     Book[]
  accounts  Account[]
  sessions  Session[]
}

model Book {
  id           String        @id @default(cuid())
  name         String
  emoji        String        @default("📒")
  isDefault    Boolean       @default(false)
  userId       String
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@index([userId])
}

model Transaction {
  id             String   @id @default(cuid())
  amount         Int      // satang (THB × 100)
  type           String   // "income" | "expense"
  category       String   // "Food" | "Transport" | "Bills" | "Shopping" | "Transfer" | "Salary" | "Other"
  date           DateTime
  note           String?
  immichAssetId  String?
  confidenceJson Json?
  bookId         String
  book           Book     @relation(fields: [bookId], references: [id], onDelete: Cascade)
  createdAt      DateTime @default(now())

  @@index([bookId])
  @@index([bookId, date])
}

// NextAuth required models
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

- [ ] **Step 3: Create Postgres database**

```bash
createdb sliptrack
```

If `createdb` not available: `psql -U postgres -c "CREATE DATABASE sliptrack;"`

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: migration created and applied, prisma client generated.

- [ ] **Step 5: Create Prisma client singleton**

Create `lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error'] : [] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: prisma schema with User, Book, Transaction models"
```

---

## Task 4: Auth (NextAuth v5 + Google OAuth)

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `middleware.ts`
- Create: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Write NextAuth config**

Create `lib/auth.ts`:

```typescript
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
```

- [ ] **Step 2: Extend NextAuth session type**

Create `types/next-auth.d.ts`:

```typescript
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
```

- [ ] **Step 3: Create API route handler**

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 4: Write middleware**

Create `middleware.ts`:

```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith('/login')

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 5: Create login page**

Create `app/(auth)/login/page.tsx`:

```typescript
import { signIn } from '@/lib/auth'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-serif)] text-4xl text-[var(--ink)] mb-2">
            SlipTrack
          </h1>
          <p className="text-[var(--muted)] text-sm">
            Receipt → ledger in 2 taps
          </p>
        </div>

        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: '/' })
          }}
          className="w-full"
        >
          <button
            type="submit"
            className="w-full h-14 rounded-2xl bg-[var(--accent)] text-white font-semibold text-base flex items-center justify-center gap-3 shadow-sm active:scale-[.97] transition-transform"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: NextAuth v5 Google OAuth with middleware protection"
```

---

## Task 5: Utility Functions

**Files:**
- Create: `lib/utils.ts`
- Create: `lib/__tests__/utils.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatTHB, satangToTHB, thbToSatang, cn } from '../utils'

describe('thbToSatang', () => {
  it('converts whole baht to satang', () => {
    expect(thbToSatang(500)).toBe(50000)
  })
  it('converts decimal baht', () => {
    expect(thbToSatang(79.5)).toBe(7950)
  })
  it('rounds to nearest satang', () => {
    expect(thbToSatang(10.001)).toBe(1000)
  })
})

describe('satangToTHB', () => {
  it('converts satang to baht number', () => {
    expect(satangToTHB(50000)).toBe(500)
  })
  it('converts satang with decimal', () => {
    expect(satangToTHB(7950)).toBe(79.5)
  })
})

describe('formatTHB', () => {
  it('formats whole baht from satang', () => {
    expect(formatTHB(50000)).toBe('฿500.00')
  })
  it('formats with thousands separator', () => {
    expect(formatTHB(1000000)).toBe('฿10,000.00')
  })
  it('formats small amount', () => {
    expect(formatTHB(7950)).toBe('฿79.50')
  })
})

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })
  it('handles conditional classes', () => {
    expect(cn('base', false && 'skip', 'keep')).toBe('base keep')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run lib/__tests__/utils.test.ts
```

Expected: FAIL — "Cannot find module '../utils'"

- [ ] **Step 3: Implement utils**

Create `lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function thbToSatang(thb: number): number {
  return Math.round(thb * 100)
}

export function satangToTHB(satang: number): number {
  return satang / 100
}

export function formatTHB(satang: number): string {
  const baht = satang / 100
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
  }).format(baht).replace('THB', '฿').trim()
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run lib/__tests__/utils.test.ts
```

Expected: PASS — 8 tests

- [ ] **Step 5: Commit**

```bash
git add lib/utils.ts lib/__tests__/utils.test.ts
git commit -m "feat: utility functions formatTHB, satangToTHB, thbToSatang"
```

---

## Task 6: Immich Client

**Files:**
- Create: `lib/immich.ts`
- Create: `lib/__tests__/immich.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/immich.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { uploadAsset, getThumbnailUrl } from '../immich'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.IMMICH_URL = 'https://immich.example.com'
  process.env.IMMICH_API_KEY = 'test-key'
  process.env.IMMICH_ALBUM_ID = 'album-123'
})

describe('getThumbnailUrl', () => {
  it('returns correct thumbnail URL', () => {
    const url = getThumbnailUrl('asset-abc')
    expect(url).toBe('https://immich.example.com/api/assets/asset-abc/thumbnail?size=preview')
  })
})

describe('uploadAsset', () => {
  it('uploads file and returns assetId', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-asset-id', status: 'created' }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    const buffer = Buffer.from('fake-image-data')
    const assetId = await uploadAsset(buffer, 'receipt.jpg', 'image/jpeg')
    expect(assetId).toBe('new-asset-id')
  })

  it('throws on upload failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })
    const buffer = Buffer.from('fake')
    await expect(uploadAsset(buffer, 'r.jpg', 'image/jpeg')).rejects.toThrow('Immich upload failed: 401')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run lib/__tests__/immich.test.ts
```

Expected: FAIL — "Cannot find module '../immich'"

- [ ] **Step 3: Implement Immich client**

Create `lib/immich.ts`:

```typescript
export function getThumbnailUrl(assetId: string): string {
  return `${process.env.IMMICH_URL}/api/assets/${assetId}/thumbnail?size=preview`
}

export async function uploadAsset(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const form = new FormData()
  form.append('assetData', new Blob([buffer], { type: mimeType }), filename)
  form.append('deviceAssetId', `sliptrack-${Date.now()}`)
  form.append('deviceId', 'sliptrack-web')
  form.append('fileCreatedAt', new Date().toISOString())
  form.append('fileModifiedAt', new Date().toISOString())

  const res = await fetch(`${process.env.IMMICH_URL}/api/assets`, {
    method: 'POST',
    headers: { 'x-api-key': process.env.IMMICH_API_KEY! },
    body: form,
  })

  if (!res.ok) throw new Error(`Immich upload failed: ${res.status}`)

  const data = await res.json()
  const assetId: string = data.id

  // Add to SlipTrack album
  if (process.env.IMMICH_ALBUM_ID) {
    await fetch(`${process.env.IMMICH_URL}/api/albums/${process.env.IMMICH_ALBUM_ID}/assets`, {
      method: 'PUT',
      headers: {
        'x-api-key': process.env.IMMICH_API_KEY!,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ids: [assetId] }),
    })
  }

  return assetId
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run lib/__tests__/immich.test.ts
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add lib/immich.ts lib/__tests__/immich.test.ts
git commit -m "feat: Immich client for receipt image upload and thumbnail URL"
```

---

## Task 7: OpenRouter Extraction Client

**Files:**
- Create: `lib/openrouter.ts`
- Create: `lib/__tests__/openrouter.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/openrouter.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { extractFromImage, type ExtractionResult } from '../openrouter'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.OPENROUTER_API_KEY = 'test-key'
})

describe('extractFromImage', () => {
  it('parses a fully confident extraction', async () => {
    const mockResult: ExtractionResult = {
      amount: 79.00,
      type: 'expense',
      category: 'Food',
      date: '2026-05-20',
      note: '7-Eleven Sukhumvit 31',
      confidence: { amount: 0.98, type: 0.85, category: 0.90, date: 0.95 },
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockResult) } }],
      }),
    })

    const result = await extractFromImage('base64data')
    expect(result.amount).toBe(79.00)
    expect(result.type).toBe('expense')
    expect(result.category).toBe('Food')
    expect(result.confidence.amount).toBe(0.98)
  })

  it('handles JSON wrapped in markdown code block', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: '```json\n{"amount":500,"type":"income","category":"Transfer","date":"2026-05-20","note":"KBank","confidence":{"amount":0.99,"type":0.6,"category":0.92,"date":0.99}}\n```',
          },
        }],
      }),
    })
    const result = await extractFromImage('base64data')
    expect(result.amount).toBe(500)
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 })
    await expect(extractFromImage('base64data')).rejects.toThrow('OpenRouter error: 429')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run lib/__tests__/openrouter.test.ts
```

Expected: FAIL — "Cannot find module '../openrouter'"

- [ ] **Step 3: Implement OpenRouter client**

Create `lib/openrouter.ts`:

```typescript
export interface ExtractionResult {
  amount?: number         // THB float
  type?: 'income' | 'expense'
  category?: string
  date?: string           // ISO date string YYYY-MM-DD
  note?: string
  confidence: {
    amount: number
    type: number
    category: number
    date: number
  }
}

const SYSTEM_PROMPT = `You are a receipt and bank slip OCR assistant.
Extract transaction data from the provided image and return ONLY a JSON object.
No markdown, no explanation, no prose — only raw JSON.

JSON shape:
{
  "amount": <number in THB, required>,
  "type": <"income" if money flows TO the account owner, "expense" if FROM — omit if unclear>,
  "category": <one of: "Food", "Transport", "Bills", "Shopping", "Transfer", "Salary", "Other">,
  "date": <ISO date string YYYY-MM-DD>,
  "note": <short description, merchant name or transfer counterpart>,
  "confidence": {
    "amount": <0.0-1.0>,
    "type": <0.0-1.0>,
    "category": <0.0-1.0>,
    "date": <0.0-1.0>
  }
}

Rules:
- Handle Thai text (KBank=ธนาคารกสิกรไทย, SCB=ไทยพาณิชย์, KTB=กรุงไทย, BBL=กรุงเทพ)
- For bank transfer slips: sender account number shown first = expense, receiver shown last = income
- If a field is not determinable, omit it (except confidence object which is always required)
- amount is ALWAYS in THB as a plain decimal number (e.g. 500.00 not "500 บาท")
`

export async function extractFromImage(base64Image: string): Promise<ExtractionResult> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract transaction data from this receipt.' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
          ],
        },
      ],
    }),
  })

  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`)

  const data = await res.json()
  const content: string = data.choices[0].message.content

  // Strip markdown code fences if present
  const cleaned = content.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(cleaned) as ExtractionResult
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run lib/__tests__/openrouter.test.ts
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add lib/openrouter.ts lib/__tests__/openrouter.test.ts
git commit -m "feat: OpenRouter vision extraction client with Thai bank slip support"
```

---

## Task 8: Books API Routes

**Files:**
- Create: `app/api/books/route.ts`
- Create: `app/api/books/[id]/route.ts`

- [ ] **Step 1: Create GET + POST /api/books**

Create `app/api/books/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const books = await prisma.book.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { transactions: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(books)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, emoji = '📒' } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const book = await prisma.book.create({
    data: { name: name.trim(), emoji, userId: session.user.id },
  })
  return NextResponse.json(book, { status: 201 })
}
```

- [ ] **Step 2: Create PATCH /api/books/[id] (set default, rename)**

Create `app/api/books/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const book = await prisma.book.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  // Setting a new default: unset all others first
  if (body.isDefault === true) {
    await prisma.book.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    })
  }

  const updated = await prisma.book.update({
    where: { id: params.id },
    data: {
      ...(body.name != null && { name: body.name }),
      ...(body.emoji != null && { emoji: body.emoji }),
      ...(body.isDefault != null && { isDefault: body.isDefault }),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.book.deleteMany({
    where: { id: params.id, userId: session.user.id },
  })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/books/
git commit -m "feat: books API routes GET, POST, PATCH, DELETE"
```

---

## Task 9: Extract API Route

**Files:**
- Create: `app/api/extract/route.ts`

- [ ] **Step 1: Create POST /api/extract**

Create `app/api/extract/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { uploadAsset } from '@/lib/immich'
import { extractFromImage } from '@/lib/openrouter'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'image required' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')

  // Run Immich upload and OpenRouter extraction in parallel
  const [assetId, extraction] = await Promise.all([
    uploadAsset(buffer, file.name || 'receipt.jpg', file.type || 'image/jpeg'),
    extractFromImage(base64),
  ])

  return NextResponse.json({ assetId, extraction })
}

export const config = { api: { bodyParser: false } }
```

- [ ] **Step 2: Commit**

```bash
git add app/api/extract/route.ts
git commit -m "feat: extract API route — parallel Immich upload + OpenRouter vision"
```

---

## Task 10: Transactions API Routes

**Files:**
- Create: `app/api/transactions/route.ts`
- Create: `app/api/transactions/[id]/route.ts`

- [ ] **Step 1: Create GET + POST /api/transactions**

Create `app/api/transactions/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { thbToSatang } from '@/lib/utils'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bookId = searchParams.get('bookId')
  const month = searchParams.get('month') // YYYY-MM
  const category = searchParams.get('category')
  const type = searchParams.get('type')
  const search = searchParams.get('search')

  // Verify book belongs to user
  if (bookId) {
    const book = await prisma.book.findFirst({ where: { id: bookId, userId: session.user.id } })
    if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const where: Record<string, unknown> = {
    book: { userId: session.user.id },
    ...(bookId && { bookId }),
    ...(category && { category }),
    ...(type && { type }),
    ...(month && {
      date: {
        gte: new Date(`${month}-01`),
        lt: new Date(`${month}-01`),  // corrected below
      },
    }),
    ...(search && { note: { contains: search, mode: 'insensitive' } }),
  }

  // Fix month range
  if (month) {
    const [year, mon] = month.split('-').map(Number)
    const start = new Date(year, mon - 1, 1)
    const end = new Date(year, mon, 1)
    ;(where as Record<string, unknown>).date = { gte: start, lt: end }
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: 'desc' },
    take: 100,
  })
  return NextResponse.json(transactions)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { bookId, amount, type, category, date, note, immichAssetId, confidenceJson } = body

  if (!bookId || amount == null || !type || !category || !date) {
    return NextResponse.json({ error: 'bookId, amount, type, category, date required' }, { status: 400 })
  }

  const book = await prisma.book.findFirst({ where: { id: bookId, userId: session.user.id } })
  if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

  const tx = await prisma.transaction.create({
    data: {
      bookId,
      amount: thbToSatang(amount),
      type,
      category,
      date: new Date(date),
      note: note || null,
      immichAssetId: immichAssetId || null,
      confidenceJson: confidenceJson || null,
    },
  })

  // Update book updatedAt
  await prisma.book.update({ where: { id: bookId }, data: { updatedAt: new Date() } })

  return NextResponse.json(tx, { status: 201 })
}
```

- [ ] **Step 2: Create PATCH /api/transactions/[id]**

Create `app/api/transactions/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { thbToSatang } from '@/lib/utils'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tx = await prisma.transaction.findFirst({
    where: { id: params.id, book: { userId: session.user.id } },
  })
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.transaction.update({
    where: { id: params.id },
    data: {
      ...(body.amount != null && { amount: thbToSatang(body.amount) }),
      ...(body.type && { type: body.type }),
      ...(body.category && { category: body.category }),
      ...(body.date && { date: new Date(body.date) }),
      ...(body.note !== undefined && { note: body.note }),
    },
  })
  return NextResponse.json(updated)
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/transactions/
git commit -m "feat: transactions API routes with month/category/type filtering"
```

---

## Task 11: shadcn/ui + Aceternity Setup

**Files:**
- Create: `components/ui/` (auto-generated by shadcn)
- Create: `components/aceternity/card-3d.tsx`
- Create: `components/aceternity/background-beams.tsx`

- [ ] **Step 1: Init shadcn/ui**

```bash
npx shadcn@latest init
```

Answer prompts:
- Style: Default
- Base color: Neutral
- CSS variables: Yes

- [ ] **Step 2: Add needed shadcn components**

```bash
npx shadcn@latest add button input sheet dialog
```

- [ ] **Step 3: Install Aceternity UI**

```bash
npm install @tabler/icons-react
npx aceternity-ui@latest add 3d-card
```

If CLI unavailable, create manually. Create `components/aceternity/card-3d.tsx`:

```typescript
'use client'
import React, { createContext, useContext, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const MouseEnterContext = createContext<[boolean, React.Dispatch<React.SetStateAction<boolean>>]>(
  [false, () => {}]
)

export function CardContainer({ children, className, containerClassName }: {
  children: React.ReactNode
  className?: string
  containerClassName?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMouseEntered, setIsMouseEntered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const { left, top, width, height } = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - left - width / 2) / 25
    const y = (e.clientY - top - height / 2) / 25
    containerRef.current.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`
  }

  const handleMouseEnter = () => {
    setIsMouseEntered(true)
    containerRef.current && (containerRef.current.style.transition = 'none')
  }

  const handleMouseLeave = () => {
    setIsMouseEntered(false)
    if (containerRef.current) {
      containerRef.current.style.transition = 'all 0.5s ease'
      containerRef.current.style.transform = 'rotateY(0deg) rotateX(0deg)'
    }
  }

  return (
    <MouseEnterContext.Provider value={[isMouseEntered, setIsMouseEntered]}>
      <div
        className={cn('flex items-center justify-center', containerClassName)}
        style={{ perspective: '1000px' }}
      >
        <div
          ref={containerRef}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={cn('relative flex items-center justify-center transition-all duration-200 ease-linear', className)}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {children}
        </div>
      </div>
    </MouseEnterContext.Provider>
  )
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('[transform-style:preserve-3d] [&>*]:[transform-style:preserve-3d]', className)}>
      {children}
    </div>
  )
}

export function CardItem({ children, className, translateZ = 0, as: Tag = 'div', ...rest }: {
  children: React.ReactNode
  className?: string
  translateZ?: number
  as?: React.ElementType
  [key: string]: unknown
}) {
  const [isMouseEntered] = useContext(MouseEnterContext)
  return (
    <Tag
      className={cn('transition duration-200 ease-linear', className)}
      style={{ transform: isMouseEntered ? `translateZ(${translateZ}px)` : 'translateZ(0px)' }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
```

- [ ] **Step 4: Create BackgroundBeams component**

Create `components/aceternity/background-beams.tsx`:

```typescript
'use client'
import React from 'react'
import { cn } from '@/lib/utils'

export function BackgroundBeams({ className }: { className?: string }) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="beam1" cx="50%" cy="0%" r="70%">
            <stop offset="0%" stopColor="var(--accent-soft)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--bg)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#beam1)" />
        {[...Array(3)].map((_, i) => (
          <line
            key={i}
            x1={`${20 + i * 30}%`}
            y1="0%"
            x2={`${10 + i * 35}%`}
            y2="100%"
            stroke="var(--accent-mid)"
            strokeWidth="0.5"
            strokeOpacity="0.3"
          />
        ))}
      </svg>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/
git commit -m "feat: shadcn/ui init + Aceternity 3D card and background beams"
```

---

## Task 12: BookChip + BookSheet Components

**Files:**
- Create: `components/book-chip.tsx`
- Create: `components/book-sheet.tsx`

- [ ] **Step 1: Create BookChip**

Create `components/book-chip.tsx`:

```typescript
'use client'
import { ChevronDown } from 'lucide-react'

interface BookChipProps {
  name: string
  emoji: string
  onClick: () => void
}

export function BookChip({ name, emoji, onClick }: BookChipProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[var(--hairline)] shadow-sm text-sm font-medium text-[var(--ink)] active:scale-95 transition-transform"
    >
      <span>{emoji}</span>
      <span>{name}</span>
      <ChevronDown size={14} className="text-[var(--muted)]" />
    </button>
  )
}
```

- [ ] **Step 2: Create BookSheet**

Create `components/book-sheet.tsx`:

```typescript
'use client'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Star, Plus, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Book {
  id: string
  name: string
  emoji: string
  isDefault: boolean
  updatedAt: string
  _count: { transactions: number }
}

interface BookSheetProps {
  open: boolean
  books: Book[]
  currentBookId: string
  onClose: () => void
  onSetDefault: (bookId: string) => void
  onNewBook: () => void
}

export function BookSheet({ open, books, currentBookId, onClose, onSetDefault, onNewBook }: BookSheetProps) {
  const router = useRouter()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/20 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl pb-safe"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[var(--hairline)]" />
            </div>

            <div className="px-4 pb-6">
              <div className="flex items-center justify-between py-3 mb-1">
                <span className="font-semibold text-[var(--ink)]">Books</span>
                <button onClick={onClose} className="p-1 text-[var(--muted)]">
                  <X size={18} />
                </button>
              </div>

              {books.map((book) => (
                <div
                  key={book.id}
                  className="flex items-center gap-3 py-3 border-b border-[var(--hairline2)] last:border-0"
                >
                  <button
                    className="flex items-center gap-3 flex-1 text-left active:opacity-70"
                    onClick={() => {
                      router.push(`/${book.id}/upload`)
                      onClose()
                    }}
                  >
                    <span className="text-2xl">{book.emoji}</span>
                    <div>
                      <div className="font-medium text-[var(--ink)] flex items-center gap-1.5">
                        {book.name}
                        {book.isDefault && (
                          <Star size={12} className="text-[var(--accent)] fill-[var(--accent)]" />
                        )}
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        {book._count.transactions} entries ·{' '}
                        {formatDistanceToNow(new Date(book.updatedAt), { addSuffix: true })}
                      </div>
                    </div>
                  </button>
                  {!book.isDefault && (
                    <button
                      onClick={() => onSetDefault(book.id)}
                      className="text-xs text-[var(--muted)] border border-[var(--hairline)] rounded-full px-2.5 py-1 active:scale-95 transition-transform"
                    >
                      Set default
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={onNewBook}
                className="flex items-center gap-2 mt-3 text-[var(--accent)] font-medium text-sm"
              >
                <Plus size={16} /> New Book
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 3: Install date-fns**

```bash
npm install date-fns
```

- [ ] **Step 4: Commit**

```bash
git add components/book-chip.tsx components/book-sheet.tsx
git commit -m "feat: BookChip and BookSheet (bottom sheet) components"
```

---

## Task 13: Book Selector Screen

**Files:**
- Create: `app/books/page.tsx`
- Create: `app/page.tsx` (root redirect)

- [ ] **Step 1: Create root redirect**

Create `app/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const defaultBook = await prisma.book.findFirst({
    where: { userId: session.user.id, isDefault: true },
  })

  if (defaultBook) redirect(`/${defaultBook.id}/upload`)
  redirect('/books')
}
```

- [ ] **Step 2: Create Book Selector page**

Create `app/books/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { BookSelectorClient } from './client'

export default async function BooksPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const books = await prisma.book.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { transactions: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return <BookSelectorClient books={books} />
}
```

- [ ] **Step 3: Create BookSelectorClient**

Create `app/books/client.tsx`:

```typescript
'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CardContainer, CardBody, CardItem } from '@/components/aceternity/card-3d'
import { Star, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Book {
  id: string
  name: string
  emoji: string
  isDefault: boolean
  updatedAt: Date
  _count: { transactions: number }
}

export function BookSelectorClient({ books: initial }: { books: Book[] }) {
  const router = useRouter()
  const [books, setBooks] = useState(initial)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  async function handleSetDefault(bookId: string) {
    await fetch(`/api/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    })
    setBooks(books.map(b => ({ ...b, isDefault: b.id === bookId })))
  }

  async function handleCreate() {
    if (!newName.trim()) return
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const book = await res.json()
    router.push(`/${book.id}/upload`)
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-5 pt-16 pb-8">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl text-[var(--ink)] mb-1">
        Your Books
      </h1>
      <p className="text-[var(--muted)] text-sm mb-8">
        Tap to open · Hold star to set default
      </p>

      <div className="grid grid-cols-2 gap-4">
        {books.map((book) => (
          <CardContainer key={book.id} className="w-full">
            <CardBody className="w-full">
              <CardItem translateZ={20} className="w-full">
                <div
                  className={`relative bg-white rounded-2xl p-4 border cursor-pointer active:scale-95 transition-transform ${
                    book.isDefault
                      ? 'border-[var(--accent)] shadow-md'
                      : 'border-[var(--hairline)] shadow-sm'
                  }`}
                  onClick={() => router.push(`/${book.id}/upload`)}
                >
                  {book.isDefault && (
                    <Star
                      size={14}
                      className="absolute top-3 right-3 text-[var(--accent)] fill-[var(--accent)]"
                    />
                  )}
                  <div className="text-3xl mb-2">{book.emoji}</div>
                  <div className="font-semibold text-[var(--ink)] text-sm">{book.name}</div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    {book._count.transactions} entries
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {formatDistanceToNow(new Date(book.updatedAt), { addSuffix: true })}
                  </div>
                  {!book.isDefault && (
                    <button
                      className="mt-3 text-xs text-[var(--muted)] border border-[var(--hairline)] rounded-full px-2.5 py-1 w-full"
                      onClick={(e) => { e.stopPropagation(); handleSetDefault(book.id) }}
                    >
                      Set default ☆
                    </button>
                  )}
                </div>
              </CardItem>
            </CardBody>
          </CardContainer>
        ))}

        {/* New Book card */}
        <CardContainer className="w-full">
          <CardBody className="w-full">
            <CardItem translateZ={10} className="w-full">
              {creating ? (
                <div className="bg-white rounded-2xl p-4 border border-dashed border-[var(--accent-mid)] h-full flex flex-col gap-2">
                  <input
                    autoFocus
                    className="text-sm border border-[var(--hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)] bg-[var(--bg)]"
                    placeholder="Book name…"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                  <button
                    onClick={handleCreate}
                    className="bg-[var(--accent)] text-white text-sm rounded-lg py-2 font-medium"
                  >
                    Create
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setCreating(true)}
                  className="bg-white rounded-2xl p-4 border border-dashed border-[var(--hairline)] flex flex-col items-center justify-center min-h-[120px] gap-2 cursor-pointer active:scale-95 transition-transform"
                >
                  <Plus size={24} className="text-[var(--muted)]" />
                  <span className="text-sm text-[var(--muted)]">New Book</span>
                </div>
              )}
            </CardItem>
          </CardBody>
        </CardContainer>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/books/
git commit -m "feat: book selector screen with 3D cards and default book routing"
```

---

## Task 14: Upload Screen + Thinking Overlay

**Files:**
- Create: `components/upload-zone.tsx`
- Create: `components/thinking-overlay.tsx`
- Create: `app/[bookId]/upload/page.tsx`

- [ ] **Step 1: Create UploadZone component**

Create `components/upload-zone.tsx`:

```typescript
'use client'
import { useRef, useState } from 'react'
import { Camera, Image as ImageIcon } from 'lucide-react'

interface UploadZoneProps {
  onFile: (file: File) => void
}

export function UploadZone({ onFile }: UploadZoneProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    onFile(file)
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 px-6">
      {/* Primary: open camera / file picker */}
      <button
        onClick={() => fileRef.current?.click()}
        className={`w-full max-w-xs aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors ${
          dragging
            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
            : 'border-[var(--hairline)] bg-white'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        <Camera size={40} className="text-[var(--accent)]" />
        <div className="text-center">
          <div className="font-medium text-[var(--ink)] text-sm">Snap a receipt</div>
          <div className="text-xs text-[var(--muted)] mt-1">
            KBank, SCB, KTB, paper receipts
          </div>
        </div>
      </button>

      {/* Gallery fallback */}
      <button
        className="flex items-center gap-2 text-sm text-[var(--muted)]"
        onClick={() => {
          if (fileRef.current) {
            fileRef.current.removeAttribute('capture')
            fileRef.current.click()
          }
        }}
      >
        <ImageIcon size={16} /> Choose from gallery
      </button>

      {/* Hidden input — capture=camera on mobile */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create ThinkingOverlay**

Create `components/thinking-overlay.tsx`:

```typescript
'use client'
import { motion } from 'framer-motion'

interface ThinkingOverlayProps {
  previewUrl: string
}

const SHIMMER_ROWS = [
  { w: '60%', label: 'Amount' },
  { w: '40%', label: 'Date' },
  { w: '50%', label: 'Type' },
  { w: '45%', label: 'Category' },
]

export function ThinkingOverlay({ previewUrl }: ThinkingOverlayProps) {
  return (
    <motion.div
      className="absolute inset-0 bg-[var(--bg)] z-20 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Receipt thumbnail */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Receipt"
            className="max-h-64 rounded-xl shadow-lg object-contain"
          />
          <motion.div
            className="absolute inset-0 rounded-xl"
            animate={{ boxShadow: ['0 0 0 0px var(--accent-mid)', '0 0 0 6px var(--accent-soft)', '0 0 0 0px var(--accent-mid)'] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        </div>
      </div>

      {/* Shimmer fields */}
      <div className="bg-white rounded-t-3xl px-6 py-5 shadow-[0_-1px_0_var(--hairline)]">
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            className="w-2 h-2 rounded-full bg-[var(--accent)]"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <span className="text-sm text-[var(--muted)]">Reading receipt…</span>
        </div>

        <div className="flex flex-col gap-3">
          {SHIMMER_ROWS.map((row, i) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className="flex items-center gap-3"
            >
              <span className="text-xs text-[var(--muted)] w-16">{row.label}</span>
              <div className="shimmer h-4 rounded flex-1" style={{ maxWidth: row.w }} />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 3: Create Upload page**

Create `app/[bookId]/upload/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { UploadPageClient } from './client'

export default async function UploadPage({ params }: { params: { bookId: string } }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const book = await prisma.book.findFirst({
    where: { id: params.bookId, userId: session.user.id },
  })
  if (!book) notFound()

  const books = await prisma.book.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { transactions: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return <UploadPageClient book={book} books={books} />
}
```

- [ ] **Step 4: Create UploadPageClient**

Create `app/[bookId]/upload/client.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart2 } from 'lucide-react'
import { BookChip } from '@/components/book-chip'
import { BookSheet } from '@/components/book-sheet'
import { UploadZone } from '@/components/upload-zone'
import { ThinkingOverlay } from '@/components/thinking-overlay'
import { ConfirmSheet } from '@/components/confirm-sheet'
import { SavedToast } from '@/components/saved-toast'
import { BackgroundBeams } from '@/components/aceternity/background-beams'

interface Book {
  id: string; name: string; emoji: string; isDefault: boolean; updatedAt: Date
  _count?: { transactions: number }
}

interface ExtractionResult {
  amount?: number; type?: string; category?: string; date?: string; note?: string
  confidence: { amount: number; type: number; category: number; date: number }
}

type Stage = 'idle' | 'thinking' | 'confirm' | 'saved'

export function UploadPageClient({ book, books }: { book: Book; books: Book[] }) {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('idle')
  const [previewUrl, setPreviewUrl] = useState('')
  const [assetId, setAssetId] = useState('')
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [bookList, setBookList] = useState(books)

  async function handleFile(file: File) {
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setStage('thinking')

    const form = new FormData()
    form.append('image', file)
    const res = await fetch('/api/extract', { method: 'POST', body: form })
    const data = await res.json()
    setAssetId(data.assetId)
    setExtraction(data.extraction)
    setStage('confirm')
  }

  async function handleSave(confirmed: {
    amount: number; type: string; category: string; date: string; note: string
  }) {
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bookId: book.id, immichAssetId: assetId, ...confirmed }),
    })
    setStage('saved')
    setTimeout(() => { setStage('idle'); setExtraction(null) }, 600)
  }

  async function handleSetDefault(bookId: string) {
    await fetch(`/api/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    })
    setBookList(bookList.map(b => ({ ...b, isDefault: b.id === bookId })))
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col relative overflow-hidden">
      <BackgroundBeams />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-14 pb-4">
        <BookChip name={book.name} emoji={book.emoji} onClick={() => setSheetOpen(true)} />
        <button
          onClick={() => router.push(`/${book.id}/dashboard`)}
          className="p-2 rounded-full bg-white/80 border border-[var(--hairline)] text-[var(--muted)]"
        >
          <BarChart2 size={18} />
        </button>
      </div>

      {/* Upload zone */}
      <UploadZone onFile={handleFile} />

      {/* Thinking overlay */}
      {stage === 'thinking' && <ThinkingOverlay previewUrl={previewUrl} />}

      {/* Confirm sheet */}
      {stage === 'confirm' && extraction && (
        <ConfirmSheet
          extraction={extraction}
          previewUrl={previewUrl}
          onSave={handleSave}
          onDiscard={() => setStage('idle')}
        />
      )}

      {/* Saved toast */}
      {stage === 'saved' && <SavedToast />}

      {/* Book sheet */}
      <BookSheet
        open={sheetOpen}
        books={bookList as Parameters<typeof BookSheet>[0]['books']}
        currentBookId={book.id}
        onClose={() => setSheetOpen(false)}
        onSetDefault={handleSetDefault}
        onNewBook={() => router.push('/books')}
      />
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/upload-zone.tsx components/thinking-overlay.tsx app/\[bookId\]/upload/
git commit -m "feat: upload screen with camera zone and AI thinking overlay"
```

---

## Task 15: Confirm Sheet (Chat Style)

**Files:**
- Create: `components/confirm-sheet.tsx`

- [ ] **Step 1: Create ConfirmSheet**

Create `components/confirm-sheet.tsx`:

```typescript
'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatTHB, thbToSatang } from '@/lib/utils'

const CATEGORIES = ['Food', 'Transport', 'Bills', 'Shopping', 'Transfer', 'Salary', 'Other']

interface ExtractionResult {
  amount?: number
  type?: string
  category?: string
  date?: string
  note?: string
  confidence: { amount: number; type: number; category: number; date: number }
}

interface ConfirmSheetProps {
  extraction: ExtractionResult
  previewUrl: string
  onSave: (data: { amount: number; type: string; category: string; date: string; note: string }) => void
  onDiscard: () => void
}

type EditField = 'amount' | 'category' | 'date' | 'note' | null

export function ConfirmSheet({ extraction, previewUrl, onSave, onDiscard }: ConfirmSheetProps) {
  const [amount, setAmount] = useState(extraction.amount ?? 0)
  const [type, setType] = useState(extraction.type ?? '')
  const [category, setCategory] = useState(extraction.category ?? 'Other')
  const [date, setDate] = useState(extraction.date ?? new Date().toISOString().split('T')[0])
  const [note, setNote] = useState(extraction.note ?? '')
  const [editing, setEditing] = useState<EditField>(null)

  // Fields that need user input (confidence < 0.7 or missing)
  const needsType = !type || (extraction.confidence.type ?? 0) < 0.7
  const [typeResolved, setTypeResolved] = useState(!needsType)

  const summaryText = (() => {
    const parts = []
    if (amount) parts.push(formatTHB(thbToSatang(amount)))
    if (note) parts.push(`at ${note}`)
    if (category) parts.push(`· ${category}`)
    if (type) parts.push(`· ${type === 'income' ? 'Income' : 'Expense'}`)
    return parts.length ? `Got it. ${parts.join(' ')}` : 'Got the receipt.'
  })()

  return (
    <motion.div
      className="absolute inset-0 z-30 flex flex-col justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Dimmed receipt behind */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="" className="w-full h-full object-cover opacity-20" />
      </div>

      {/* Sheet */}
      <motion.div
        className="relative bg-white rounded-t-3xl px-5 pb-8 pt-5 shadow-[0_-4px_32px_rgba(0,0,0,0.12)]"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      >
        {/* Drag handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-[var(--hairline)]" />
        </div>

        {/* AI summary bubble */}
        <div className="flex gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-mid)] flex items-center justify-center text-xs flex-shrink-0">
            ✦
          </div>
          <motion.div
            className="bg-[var(--accent-soft)] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm font-medium text-[var(--ink)] flex-1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            {summaryText}
          </motion.div>
        </div>

        {/* Ask type if ambiguous */}
        <AnimatePresence>
          {needsType && !typeResolved && (
            <motion.div
              className="flex gap-2 mb-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="w-7 flex-shrink-0" />
              <div className="flex-1">
                <div className="bg-[var(--accent-soft)] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm font-medium text-[var(--ink)] mb-2">
                  Income or expense?
                </div>
                <div className="flex gap-2">
                  {['income', 'expense'].map((t) => (
                    <button
                      key={t}
                      onClick={() => { setType(t); setTypeResolved(true) }}
                      className="flex-1 py-2 rounded-xl border text-sm font-medium capitalize transition-colors active:scale-95"
                      style={{
                        background: t === 'income' ? 'var(--income-bg)' : 'var(--expense-bg)',
                        borderColor: t === 'income' ? 'var(--income)' : 'var(--expense)',
                        color: t === 'income' ? 'var(--income)' : 'var(--expense)',
                      }}
                    >
                      {t === 'income' ? '↓ Income' : '↑ Expense'}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editable chips */}
        <motion.div
          className="flex flex-wrap gap-2 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          {/* Amount chip */}
          <EditChip
            label={formatTHB(thbToSatang(amount))}
            active={editing === 'amount'}
            onClick={() => setEditing(editing === 'amount' ? null : 'amount')}
          />
          {/* Category chip */}
          <EditChip
            label={category}
            active={editing === 'category'}
            onClick={() => setEditing(editing === 'category' ? null : 'category')}
          />
          {/* Date chip */}
          <EditChip
            label={date}
            active={editing === 'date'}
            onClick={() => setEditing(editing === 'date' ? null : 'date')}
          />
          {/* Note chip */}
          <EditChip
            label={note || 'Add note…'}
            muted={!note}
            active={editing === 'note'}
            onClick={() => setEditing(editing === 'note' ? null : 'note')}
          />
        </motion.div>

        {/* Inline edit panel */}
        <AnimatePresence>
          {editing && (
            <motion.div
              className="mb-4 bg-[var(--bg)] rounded-2xl p-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {editing === 'amount' && (
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-geist-mono)] text-lg">฿</span>
                  <input
                    autoFocus
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="flex-1 bg-transparent text-lg font-[family-name:var(--font-geist-mono)] outline-none"
                    onBlur={() => setEditing(null)}
                  />
                </div>
              )}
              {editing === 'category' && (
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setCategory(c); setEditing(null) }}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        c === category
                          ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                          : 'bg-white border-[var(--hairline)] text-[var(--ink)]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
              {editing === 'date' && (
                <input
                  autoFocus
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  onBlur={() => setEditing(null)}
                />
              )}
              {editing === 'note' && (
                <input
                  autoFocus
                  type="text"
                  value={note}
                  placeholder="e.g. 7-Eleven, KBank transfer"
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  onBlur={() => setEditing(null)}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save button */}
        <button
          disabled={!type || !amount}
          onClick={() => onSave({ amount, type, category, date, note })}
          className="w-full h-14 rounded-2xl bg-[var(--accent)] text-white font-semibold text-base disabled:opacity-40 active:scale-[.97] transition-transform shadow-sm"
        >
          Save
        </button>

        <button
          onClick={onDiscard}
          className="w-full mt-2 h-11 rounded-2xl text-[var(--muted)] text-sm font-medium"
        >
          Discard
        </button>
      </motion.div>
    </motion.div>
  )
}

function EditChip({ label, active, muted, onClick }: {
  label: string; active: boolean; muted?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-95 ${
        active
          ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
          : muted
          ? 'bg-white text-[var(--muted)] border-dashed border-[var(--hairline)]'
          : 'bg-white text-[var(--ink)] border-[var(--hairline)]'
      }`}
    >
      {label}
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/confirm-sheet.tsx
git commit -m "feat: chat-style confirm sheet with editable chips and ambiguity prompts"
```

---

## Task 16: Saved Toast

**Files:**
- Create: `components/saved-toast.tsx`

- [ ] **Step 1: Create SavedToast**

Create `components/saved-toast.tsx`:

```typescript
'use client'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

export function SavedToast() {
  return (
    <motion.div
      className="absolute inset-0 z-40 bg-[var(--accent-soft)] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-20 h-20 rounded-full bg-[var(--accent)] flex items-center justify-center"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 300 }}
      >
        <Check size={36} color="white" strokeWidth={2.5} />
      </motion.div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/saved-toast.tsx
git commit -m "feat: saved toast full-screen checkmark animation"
```

---

## Task 17: Dashboard Screen

**Files:**
- Create: `components/dashboard-summary.tsx`
- Create: `components/category-chart.tsx`
- Create: `components/transaction-list.tsx`
- Create: `app/[bookId]/dashboard/page.tsx`

- [ ] **Step 1: Create DashboardSummary**

Create `components/dashboard-summary.tsx`:

```typescript
import { formatTHB } from '@/lib/utils'

interface SummaryProps {
  incomeSatang: number
  expenseSatang: number
}

export function DashboardSummary({ incomeSatang, expenseSatang }: SummaryProps) {
  const balance = incomeSatang - expenseSatang

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white rounded-2xl p-4 border border-[var(--hairline)] shadow-sm">
        <div className="text-xs text-[var(--muted)] mb-1">Income</div>
        <div className="font-[family-name:var(--font-geist-mono)] font-semibold text-[var(--income)] text-sm leading-tight">
          {formatTHB(incomeSatang)}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 border border-[var(--hairline)] shadow-sm">
        <div className="text-xs text-[var(--muted)] mb-1">Expenses</div>
        <div className="font-[family-name:var(--font-geist-mono)] font-semibold text-[var(--expense)] text-sm leading-tight">
          {formatTHB(expenseSatang)}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 border border-[var(--hairline)] shadow-sm">
        <div className="text-xs text-[var(--muted)] mb-1">Balance</div>
        <div
          className="font-[family-name:var(--font-geist-mono)] font-semibold text-sm leading-tight"
          style={{ color: balance >= 0 ? 'var(--income)' : 'var(--expense)' }}
        >
          {formatTHB(Math.abs(balance))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create CategoryChart**

Create `components/category-chart.tsx`:

```typescript
import { formatTHB } from '@/lib/utils'

interface CategoryData {
  category: string
  total: number
}

interface CategoryChartProps {
  data: CategoryData[]
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#e85d3e', Transport: '#3b82f6', Bills: '#8b5cf6',
  Shopping: '#f59e0b', Transfer: '#6b7280', Salary: '#10b981', Other: '#94a3b8',
}

export function CategoryChart({ data }: CategoryChartProps) {
  const max = Math.max(...data.map(d => d.total), 1)

  return (
    <div className="bg-white rounded-2xl p-4 border border-[var(--hairline)] shadow-sm">
      <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-3">
        Spending by Category
      </div>
      <div className="flex flex-col gap-2.5">
        {data.map((item) => (
          <div key={item.category} className="flex items-center gap-2">
            <div className="text-xs text-[var(--muted)] w-16 truncate">{item.category}</div>
            <div className="flex-1 h-2 bg-[var(--bg)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.total / max) * 100}%`,
                  background: CATEGORY_COLORS[item.category] ?? '#94a3b8',
                }}
              />
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--ink)] w-20 text-right">
              {formatTHB(item.total)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create TransactionList**

Create `components/transaction-list.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { formatTHB, satangToTHB } from '@/lib/utils'
import { getThumbnailUrl } from '@/lib/immich'
import { format } from 'date-fns'
import { ChevronDown } from 'lucide-react'

interface Transaction {
  id: string
  amount: number
  type: string
  category: string
  date: string
  note: string | null
  immichAssetId: string | null
}

interface TransactionListProps {
  transactions: Transaction[]
}

export function TransactionList({ transactions }: TransactionListProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-2">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="bg-white rounded-2xl border border-[var(--hairline)] overflow-hidden"
          onClick={() => setExpanded(expanded === tx.id ? null : tx.id)}
        >
          <div className="flex items-center gap-3 p-3.5">
            {tx.immichAssetId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getThumbnailUrl(tx.immichAssetId)}
                alt="Receipt"
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-[var(--bg)]"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[var(--bg)] flex items-center justify-center text-lg flex-shrink-0">
                🧾
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-[var(--ink)] truncate">
                {tx.note || tx.category}
              </div>
              <div className="text-xs text-[var(--muted)]">
                {format(new Date(tx.date), 'd MMM')} · {tx.category}
              </div>
            </div>
            <div
              className="font-[family-name:var(--font-geist-mono)] font-semibold text-sm flex-shrink-0"
              style={{ color: tx.type === 'income' ? 'var(--income)' : 'var(--expense)' }}
            >
              {tx.type === 'income' ? '+' : '-'}{formatTHB(tx.amount)}
            </div>
            <ChevronDown
              size={14}
              className={`text-[var(--muted)] transition-transform ${expanded === tx.id ? 'rotate-180' : ''}`}
            />
          </div>

          {expanded === tx.id && tx.immichAssetId && (
            <div className="px-3.5 pb-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getThumbnailUrl(tx.immichAssetId)}
                alt="Receipt full"
                className="w-full rounded-xl object-contain max-h-64 bg-[var(--bg)]"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create Dashboard page**

Create `app/[bookId]/dashboard/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { DashboardSummary } from '@/components/dashboard-summary'
import { CategoryChart } from '@/components/category-chart'
import { TransactionList } from '@/components/transaction-list'
import { BookChip } from '@/components/book-chip'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage({ params }: { params: { bookId: string } }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const book = await prisma.book.findFirst({
    where: { id: params.bookId, userId: session.user.id },
  })
  if (!book) notFound()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const transactions = await prisma.transaction.findMany({
    where: { bookId: params.bookId, date: { gte: monthStart, lt: monthEnd } },
    orderBy: { date: 'desc' },
  })

  const incomeSatang = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const expenseSatang = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const categoryMap = new Map<string, number>()
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => categoryMap.set(t.category, (categoryMap.get(t.category) ?? 0) + t.amount))

  const categoryData = [...categoryMap.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const month = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  return (
    <main className="min-h-screen bg-[var(--bg)] px-5 pt-14 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${params.bookId}/upload`} className="p-2 -ml-2 text-[var(--muted)]">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="text-xs text-[var(--muted)] font-medium">{book.emoji} {book.name}</div>
          <h1 className="font-[family-name:var(--font-serif)] text-2xl text-[var(--ink)]">{month}</h1>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <DashboardSummary incomeSatang={incomeSatang} expenseSatang={expenseSatang} />

        {categoryData.length > 0 && <CategoryChart data={categoryData} />}

        <div>
          <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2">
            Recent
          </div>
          <TransactionList transactions={transactions.slice(0, 10).map(t => ({
            ...t,
            date: t.date.toISOString(),
          }))} />
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/dashboard-summary.tsx components/category-chart.tsx components/transaction-list.tsx app/\[bookId\]/dashboard/
git commit -m "feat: dashboard with monthly summary, category chart, recent transactions"
```

---

## Task 18: Transaction History Screen

**Files:**
- Create: `app/[bookId]/history/page.tsx`

- [ ] **Step 1: Create History page**

Create `app/[bookId]/history/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { HistoryClient } from './client'

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: { bookId: string }
  searchParams: { q?: string; category?: string; type?: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const book = await prisma.book.findFirst({
    where: { id: params.bookId, userId: session.user.id },
  })
  if (!book) notFound()

  const where: Record<string, unknown> = { bookId: params.bookId }
  if (searchParams.category) where.category = searchParams.category
  if (searchParams.type) where.type = searchParams.type
  if (searchParams.q) where.note = { contains: searchParams.q, mode: 'insensitive' }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: 'desc' },
    take: 100,
  })

  return (
    <HistoryClient
      book={book}
      transactions={transactions.map(t => ({ ...t, date: t.date.toISOString() }))}
      query={searchParams.q ?? ''}
    />
  )
}
```

- [ ] **Step 2: Create HistoryClient**

Create `app/[bookId]/history/client.tsx`:

```typescript
'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowLeft, Search, X } from 'lucide-react'
import { TransactionList } from '@/components/transaction-list'
import Link from 'next/link'

interface Book { id: string; name: string; emoji: string }
interface Transaction {
  id: string; amount: number; type: string; category: string
  date: string; note: string | null; immichAssetId: string | null
}

const CATEGORIES = ['Food', 'Transport', 'Bills', 'Shopping', 'Transfer', 'Salary', 'Other']

export function HistoryClient({
  book,
  transactions,
  query,
}: {
  book: Book
  transactions: Transaction[]
  query: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState(query)
  const [activeType, setActiveType] = useState<string>('')
  const [activeCategory, setActiveCategory] = useState<string>('')

  function applyFilters(q: string, type: string, category: string) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (type) params.set('type', type)
    if (category) params.set('category', category)
    startTransition(() => router.replace(`${pathname}?${params.toString()}`))
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-5 pt-14 pb-10">
      <div className="flex items-center gap-3 mb-4">
        <Link href={`/${book.id}/upload`} className="p-2 -ml-2 text-[var(--muted)]">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-[family-name:var(--font-serif)] text-2xl text-[var(--ink)] flex-1">
          {book.emoji} {book.name}
        </h1>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            applyFilters(e.target.value, activeType, activeCategory)
          }}
          placeholder="Search transactions…"
          className="w-full h-10 pl-9 pr-4 rounded-xl bg-white border border-[var(--hairline)] text-sm outline-none focus:border-[var(--accent)]"
        />
        {search && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            onClick={() => { setSearch(''); applyFilters('', activeType, activeCategory) }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Type filter */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
        {['', 'income', 'expense'].map((t) => (
          <button
            key={t}
            onClick={() => { setActiveType(t); applyFilters(search, t, activeCategory) }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              activeType === t
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-white text-[var(--muted)] border-[var(--hairline)]'
            }`}
          >
            {t === '' ? 'All' : t === 'income' ? '↓ Income' : '↑ Expense'}
          </button>
        ))}
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => { setActiveCategory(activeCategory === c ? '' : c); applyFilters(search, activeType, activeCategory === c ? '' : c) }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              activeCategory === c
                ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
                : 'bg-white text-[var(--muted)] border-[var(--hairline)]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="text-xs text-[var(--muted)] mb-3">
        {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
      </div>

      <TransactionList transactions={transactions} />
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\[bookId\]/history/
git commit -m "feat: transaction history screen with search and category/type filters"
```

---

## Task 19: Wire Up + Verify End-to-End

**Files:**
- Modify: `app/[bookId]/upload/client.tsx` (add history nav link)
- Verify dev server runs full flow

- [ ] **Step 1: Add History link to Upload page header**

Open `app/[bookId]/upload/client.tsx`. Import `List` from `lucide-react` and add history button next to dashboard button in the header:

```typescript
// In the header div, after the BarChart2 button:
<button
  onClick={() => router.push(`/${book.id}/history`)}
  className="p-2 rounded-full bg-white/80 border border-[var(--hairline)] text-[var(--muted)]"
>
  <List size={18} />
</button>
```

- [ ] **Step 2: Run all tests**

```bash
npm run test:run
```

Expected: all tests pass (utils, immich, openrouter — 14 tests total)

- [ ] **Step 3: Start dev server and verify**

```bash
npm run dev
```

Walk through:
1. Open http://localhost:3000 → redirects to /login
2. Click "Continue with Google" → Google OAuth flow → lands on /books
3. Create a book → lands on /[bookId]/upload
4. Upload a receipt image → thinking overlay → confirm sheet slides up
5. If type ambiguous → "Income or expense?" bubble appears
6. Tap chips to confirm/edit → Save → checkmark flash → back to upload
7. Tap BarChart2 → dashboard shows monthly summary + chart
8. Tap List → history shows transactions with search/filter

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: wire upload screen history nav + verified end-to-end flow"
```

---

## Self-Review: Spec Coverage

| Spec requirement | Task |
|---|---|
| Login with Google OAuth | Task 4 |
| Book Selector with 3D cards + set default | Task 13 |
| Default book → skip to upload | Task 13 (root page.tsx) |
| Upload zone (file picker + camera + drag-drop) | Task 14 |
| AI thinking shimmer overlay | Task 14 |
| Confirm sheet — chat style | Task 15 |
| Ambiguous field → ask follow-up bubble | Task 15 |
| Editable chips per field | Task 15 |
| Save → POST /api/transactions | Task 15 (client) |
| Saved toast flash | Task 16 |
| Book chip → Book Sheet (bottom sheet) | Task 12 |
| Immich upload + album | Task 6, 9 |
| OpenRouter extraction | Task 7, 9 |
| Dashboard: summary + chart + recent | Task 17 |
| Transaction History + search + filters | Task 18 |
| THB formatting (Geist Mono) | Task 5 |
| Design tokens (warm off-white, forest green) | Task 2 |
| Middleware auth protection | Task 4 |
