# AI-Powered Search Design

**Date:** 2026-05-21  
**Feature:** Natural language search in History page

---

## Overview

Extend the history search bar to understand natural language queries like "around 50-100 baht at food court" while keeping simple searches (merchant name, price) fast and AI-free.

---

## Detection: NL vs Simple

Client-side heuristic — no extra API call to decide.

**Simple (no AI):**
- Pure number: `500`, `50.5`
- ฿-prefixed: `฿500`
- Single word: `7-eleven`, `grab`
- Short (≤2 words) with no relational terms

**Natural language (use AI):**
- 3+ words containing relational/descriptive terms
- Trigger words: `around`, `about`, `between`, `near`, `at`, `from`, `last`, `this`, `yesterday`, `week`, `month`, `more than`, `less than`, `under`, `over`, Thai equivalents

Regex pattern: `/(around|about|between|near|more than|less than|under|over|last|this week|this month|yesterday|\d+\s*-\s*\d+)/i`

If matched → NL mode. Otherwise → simple mode (existing behavior).

---

## Architecture

```
User types query
     │
     ▼
Client heuristic
     │
     ├── Simple → applyFilters(q) as URL param → server Prisma note.contains
     │
     └── NL → 500ms debounce → POST /api/search/ai
                    │
                    ▼
              OpenRouter (Gemini Flash)
              Returns: { amountMin?, amountMax?, category?, type?, keyword?, dateFrom?, dateTo? }
                    │
                    ▼
              Encode as URL params → router.replace → page.tsx Prisma query
```

---

## New API Route: `/api/search/ai`

**Method:** POST  
**Body:** `{ query: string, bookId: string }`  
**Response:** `{ amountMin?: number, amountMax?: number, category?: string, type?: 'income'|'expense', keyword?: string, dateFrom?: string, dateTo?: string }`

Amounts in THB (floats). Dates as `YYYY-MM-DD`. All fields optional.

**System prompt** (lean, focused):
> You parse a Thai/English natural language search query for a personal finance app into structured filters. Today is {today}. Amounts are in THB. Categories: Food, Transport, Shopping, Bills, Salary, Transfer, Other. Return ONLY a JSON object with these optional fields: amountMin, amountMax, category, type ("income"/"expense"), keyword, dateFrom, dateTo (YYYY-MM-DD). No explanation.

Model: `OPENROUTER_MODEL` env var (default Gemini Flash — fast, cheap).

---

## URL Params Extension

New params added alongside existing `q`, `type`, `category`:

| Param | Type | Usage |
|---|---|---|
| `aiMin` | number (satang) | amount >= — client converts API's THB float × 100 before encoding |
| `aiMax` | number (satang) | amount <= — client converts API's THB float × 100 before encoding |
| `aiFrom` | string (date) | date >= |
| `aiTo` | string (date) | date <= |
| `aiKey` | string | note contains (AI-extracted keyword) |
| `aiMode` | `1` | flag — tells page.tsx to use AI filters not `q` |

`page.tsx` reads these params and builds Prisma `where` accordingly.

---

## UI Changes (`client.tsx`)

1. **AI badge** — small `✦ AI` label inside search bar (right side) when NL mode active, replaces clear `×` button position logic
2. **Loading state** — search icon pulses (opacity animation) during AI call
3. **Error fallback** — if AI call fails, fall back to simple `note.contains` search silently

No separate AI search button. Detection is automatic and seamless.

---

## `page.tsx` Prisma Query Extension

```ts
if (sp.aiMode) {
  if (sp.aiMin) where.amount = { ...(where.amount as object), gte: Number(sp.aiMin) }
  if (sp.aiMax) where.amount = { ...(where.amount as object), lte: Number(sp.aiMax) }
  if (sp.aiFrom || sp.aiTo) where.date = { gte: sp.aiFrom ? new Date(sp.aiFrom) : undefined, lte: sp.aiTo ? new Date(sp.aiTo) : undefined }
  if (sp.aiKey) where.note = { contains: sp.aiKey, mode: 'insensitive' }
  if (sp.aiCat) where.category = sp.aiCat
  if (sp.aiType) where.type = sp.aiType
} else if (sp.q) {
  where.note = { contains: sp.q, mode: 'insensitive' }
}
```

---

## Files Touched

| File | Change |
|---|---|
| `app/[bookId]/history/client.tsx` | NL detection, AI call, badge UI, debounce |
| `app/[bookId]/history/page.tsx` | Read new URL params, extend Prisma where |
| `app/api/search/ai/route.ts` | New endpoint — parse NL → structured filters |

---

## Error Handling

- AI call timeout: 5s max, then fall back to simple search
- AI returns unparseable JSON: fall back to simple search
- Network error: fall back silently

---

## Performance

- Debounce 500ms before firing AI call
- Simple queries: zero extra latency (no change from current)
- NL queries: ~300-500ms (Gemini Flash)
- No streaming needed — response is tiny JSON
