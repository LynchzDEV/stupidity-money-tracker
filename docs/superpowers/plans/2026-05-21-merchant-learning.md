# Merchant Category Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inject per-book merchant category history into the AI extraction prompt so repeat merchants are categorised correctly on the second scan.

**Architecture:** Before calling the AI, query `transactions` grouped by `note + category` for the current book, build a compact summary string (top 50 merchants), and pass it as optional context to `extractFromImage`. The AI sees the history and uses frequency to pick the best category.

**Tech Stack:** TypeScript, Prisma `groupBy`, Vitest, Next.js Route Handler (App Router)

---

## File Map

| File | Change |
|------|--------|
| `lib/merchant-summary.ts` | **Create** — `buildMerchantSummary(bookId)` |
| `lib/__tests__/merchant-summary.test.ts` | **Create** — unit tests for summary builder |
| `lib/openrouter.ts` | **Modify** — add `merchantContext?` param to `extractFromImage` |
| `lib/__tests__/openrouter.test.ts` | **Modify** — add test for context injection |
| `app/api/extract/route.ts` | **Modify** — read `bookId`, call summary, pass to extraction |
| `app/[bookId]/upload/client.tsx` | **Modify** — append `bookId` to FormData |

---

## Task 1: Build `lib/merchant-summary.ts` with failing tests first

**Files:**
- Create: `lib/merchant-summary.ts`
- Create: `lib/__tests__/merchant-summary.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/merchant-summary.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../prisma', () => ({
  prisma: {
    transaction: {
      groupBy: vi.fn(),
    },
  },
}))

import { prisma } from '../prisma'
import { buildMerchantSummary } from '../merchant-summary'

const mockGroupBy = prisma.transaction.groupBy as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('buildMerchantSummary', () => {
  it('returns empty string when no transactions exist', async () => {
    mockGroupBy.mockResolvedValueOnce([])
    const result = await buildMerchantSummary('book-1')
    expect(result).toBe('')
  })

  it('formats a single merchant with one category', async () => {
    mockGroupBy.mockResolvedValueOnce([
      { note: 'LINE MAN', category: 'Food', _count: { note: 15 } },
    ])
    const result = await buildMerchantSummary('book-1')
    expect(result).toBe('LINE MAN: Food×15')
  })

  it('formats a merchant with multiple categories, sorted by count desc', async () => {
    mockGroupBy.mockResolvedValueOnce([
      { note: 'LINE MAN', category: 'Food', _count: { note: 15 } },
      { note: 'LINE MAN', category: 'Transport', _count: { note: 4 } },
    ])
    const result = await buildMerchantSummary('book-1')
    expect(result).toBe('LINE MAN: Food×15, Transport×4')
  })

  it('lists multiple merchants sorted by total usage desc', async () => {
    mockGroupBy.mockResolvedValueOnce([
      { note: 'LINE MAN', category: 'Food', _count: { note: 15 } },
      { note: 'Grab', category: 'Food', _count: { note: 8 } },
      { note: 'LINE MAN', category: 'Transport', _count: { note: 4 } },
    ])
    const result = await buildMerchantSummary('book-1')
    const lines = result.split('\n')
    expect(lines[0]).toBe('LINE MAN: Food×15, Transport×4')
    expect(lines[1]).toBe('Grab: Food×8')
  })

  it('skips rows with null note', async () => {
    mockGroupBy.mockResolvedValueOnce([
      { note: null, category: 'Food', _count: { note: 5 } },
      { note: 'LINE MAN', category: 'Food', _count: { note: 3 } },
    ])
    const result = await buildMerchantSummary('book-1')
    expect(result).toBe('LINE MAN: Food×3')
  })

  it('queries with correct bookId and null filter', async () => {
    mockGroupBy.mockResolvedValueOnce([])
    await buildMerchantSummary('book-abc')
    expect(mockGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bookId: 'book-abc', note: { not: null } },
      }),
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/lynchz/Desktop/projects/income-and-expenses-ai-trackker
npx vitest run lib/__tests__/merchant-summary.test.ts
```

Expected: FAIL with `Cannot find module '../merchant-summary'`

- [ ] **Step 3: Implement `lib/merchant-summary.ts`**

Create `lib/merchant-summary.ts`:

```typescript
import { prisma } from './prisma'

export async function buildMerchantSummary(bookId: string): Promise<string> {
  const rows = await prisma.transaction.groupBy({
    by: ['note', 'category'],
    where: { bookId, note: { not: null } },
    _count: { note: true },
    orderBy: { _count: { note: 'desc' } },
    take: 200,
  })

  if (rows.length === 0) return ''

  const map = new Map<string, Map<string, number>>()
  for (const row of rows) {
    if (!row.note) continue
    if (!map.has(row.note)) map.set(row.note, new Map())
    map.get(row.note)!.set(row.category, row._count.note)
  }

  const lines = [...map.entries()]
    .map(([merchant, cats]) => ({
      merchant,
      total: [...cats.values()].reduce((a, b) => a + b, 0),
      cats,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 50)
    .map(({ merchant, cats }) => {
      const catStr = [...cats.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([cat, n]) => `${cat}×${n}`)
        .join(', ')
      return `${merchant}: ${catStr}`
    })

  return lines.join('\n')
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/__tests__/merchant-summary.test.ts
```

Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/merchant-summary.ts lib/__tests__/merchant-summary.test.ts
git commit -m "feat(merchant-summary): build per-book merchant category history string"
```

---

## Task 2: Add `merchantContext` param to `extractFromImage`

**Files:**
- Modify: `lib/openrouter.ts`
- Modify: `lib/__tests__/openrouter.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `lib/__tests__/openrouter.test.ts` inside the existing `describe('extractFromImage')` block:

```typescript
  it('injects merchant context into system prompt when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          amount: 150, type: 'expense', category: 'Food',
          date: '2026-05-21', note: 'LINE MAN',
          confidence: { amount: 0.95, type: 0.9, category: 0.92, date: 0.9 },
        }) } }],
      }),
    })

    await extractFromImage('base64data', 'receipt', '2026-05-21', 'LINE MAN: Food×15, Transport×4')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const systemContent: string = body.messages[0].content
    expect(systemContent).toContain('LINE MAN: Food×15, Transport×4')
    expect(systemContent).toContain('Merchant history from this book')
  })

  it('does not inject merchant section when context is empty string', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          amount: 50, type: 'expense', category: 'Other',
          date: '2026-05-21', note: 'Unknown',
          confidence: { amount: 0.9, type: 0.8, category: 0.5, date: 0.9 },
        }) } }],
      }),
    })

    await extractFromImage('base64data', 'receipt', '2026-05-21', '')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const systemContent: string = body.messages[0].content
    expect(systemContent).not.toContain('Merchant history from this book')
  })
```

- [ ] **Step 2: Run tests to verify new ones fail**

```bash
npx vitest run lib/__tests__/openrouter.test.ts
```

Expected: 2 new tests FAIL, existing 3 PASS

- [ ] **Step 3: Update `extractFromImage` signature and prompt injection**

In `lib/openrouter.ts`, update the function signature and system prompt construction:

```typescript
export async function extractFromImage(
  base64Image: string,
  mode: 'receipt' | 'bank_slip' = 'receipt',
  today = new Date().toISOString().split('T')[0],
  merchantContext?: string,
): Promise<ExtractionResult> {
  let systemPrompt = SYSTEM_PROMPT_BASE + `\nToday's date (CE): ${today}\n`
  if (merchantContext) {
    systemPrompt += `\nMerchant history from this book (use to pick the most frequent category when the merchant name matches):\n${merchantContext}\n`
  }
  const userText = mode === 'bank_slip'
    ? 'Extract transaction data from this bank transfer slip (KBank/SCB/KTB/BBL e-slip). Focus on amount and date; type/category may be ambiguous.'
    : 'Extract transaction data from this receipt.'
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
          ],
        },
      ],
    }),
  })

  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`)

  const data = await res.json()
  const content: string = data.choices[0].message.content
  const cleaned = content.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(cleaned) as ExtractionResult
}
```

- [ ] **Step 4: Run all openrouter tests**

```bash
npx vitest run lib/__tests__/openrouter.test.ts
```

Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/openrouter.ts lib/__tests__/openrouter.test.ts
git commit -m "feat(openrouter): inject merchant history context into extraction prompt"
```

---

## Task 3: Wire up `buildMerchantSummary` in the extract route

**Files:**
- Modify: `app/api/extract/route.ts`

Current route runs `uploadAsset` and `extractFromImage` in a single `Promise.all`. New flow:
1. Run `uploadAsset` and `buildMerchantSummary` in parallel
2. Then call `extractFromImage` with the merchant context

- [ ] **Step 1: Update `app/api/extract/route.ts`**

Replace the entire file content:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { uploadAsset } from '@/lib/immich'
import { extractFromImage } from '@/lib/openrouter'
import { buildMerchantSummary } from '@/lib/merchant-summary'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'image required' }, { status: 400 })
  const mode = (formData.get('mode') as string | null) === 'bank_slip' ? 'bank_slip' : 'receipt'
  const bookId = formData.get('bookId') as string | null

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')

  // Run Immich upload and merchant summary in parallel, then call AI
  const [assetId, merchantContext] = await Promise.all([
    uploadAsset(buffer, file.name || 'receipt.jpg', file.type || 'image/jpeg'),
    bookId ? buildMerchantSummary(bookId) : Promise.resolve(''),
  ])

  const extraction = await extractFromImage(base64, mode, undefined, merchantContext || undefined)

  return NextResponse.json({ assetId, extraction })
}
```

- [ ] **Step 2: Run full test suite to verify nothing broke**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add app/api/extract/route.ts
git commit -m "feat(extract): pass merchant history to AI extraction"
```

---

## Task 4: Send `bookId` from upload client

**Files:**
- Modify: `app/[bookId]/upload/client.tsx`

The `handleFile` function builds a `FormData` at line ~190. Add `bookId` to it.

- [ ] **Step 1: Add `bookId` to FormData in `handleFile`**

In `app/[bookId]/upload/client.tsx`, find the block:

```typescript
    const form = new FormData();
    form.append('image', file);
    form.append('mode', captureMode === 'Bank slip' ? 'bank_slip' : 'receipt');
```

Change to:

```typescript
    const form = new FormData();
    form.append('image', file);
    form.append('mode', captureMode === 'Bank slip' ? 'bank_slip' : 'receipt');
    form.append('bookId', book.id);
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add "app/[bookId]/upload/client.tsx"
git commit -m "feat(upload): include bookId in extract FormData for merchant learning"
```

---

## Task 5: Smoke test end-to-end

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Upload a receipt for a merchant you've used before**

Go to a book, upload a receipt from a merchant that already has transactions (e.g., "LINE MAN" with Food history). Verify the AI suggests "Food" not "Other".

- [ ] **Step 3: Upload a receipt for a brand-new merchant**

Verify AI still works normally (no merchant history = no context injected = same as before).

- [ ] **Step 4: Check server logs for no errors**

Confirm no Prisma errors or TypeScript runtime errors in the terminal.
