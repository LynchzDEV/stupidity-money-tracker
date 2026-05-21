# Merchant Category Learning

## Problem

First time AI sees "LINE MAN" → defaults to "Other". Second time onwards → should use past history to pick the right category. LINE MAN can be Food or Transport; AI decides based on frequency (Food×15 beats Transport×4).

Sending all raw transactions to AI wastes tokens. DB aggregates first, sends compact summary.

## Scope

Per-book. Each book's merchant history is independent.

## Approach

Query-time injection (no new DB table, no migration).

Before calling AI, query the book's transactions grouped by `note` + `category`. Build a compact merchant history string. Inject into the AI system prompt. AI uses it to pick category when it recognises a merchant.

## Data Flow

```
POST /api/extract  { image, mode, bookId }
  │
  ├─► Prisma GROUP BY note, category WHERE bookId = ?
  │   LIMIT 200 rows
  │
  ├─► buildMerchantSummary(rows)
  │   → "LINE MAN: Food×15, Transport×4\nGrab: Food×8\n..."
  │   → capped at top 50 unique merchants, ~500 chars
  │
  └─► extractFromImage(base64, mode, today, merchantContext)
        └─► system prompt injected section:
            "Merchant history from this book:
             LINE MAN: Food×15, Transport×4
             Use this to pick category when merchant matches."
```

First-time book: `buildMerchantSummary` returns empty string → no injection → AI behaves as today.

## Code Changes

### `lib/merchant-summary.ts` (new, ~30 lines)
- `buildMerchantSummary(bookId: string): Promise<string>`
- Prisma raw GROUP BY query on `transactions`
- Keeps top 50 merchants by total count
- Returns compact multiline string or `""` if no history

### `lib/openrouter.ts`
- `extractFromImage` gains optional `merchantContext?: string` param
- If non-empty, append to system prompt before rules section

### `app/api/extract/route.ts`
- Read `bookId` from FormData
- Call `buildMerchantSummary(bookId)` concurrently with the Immich upload (both happen before AI call)
- Pass result to `extractFromImage`

### `app/[bookId]/upload/client.tsx`
- Append `bookId` to FormData before POST to `/api/extract`

## Constraints

- Summary capped at 50 merchants (~500 chars) — keeps prompt small
- Only merchants with a `note` value are learned (null notes skipped)
- No merchant normalisation — "LINE MAN" and "Line Man" are treated as different entries (AI handles case-insensitive matching in reasoning)
- No migration required
