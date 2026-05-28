# Budget / Spending Limits — Design Spec

**Date:** 2026-05-28
**Status:** Approved

---

## Overview

Add per-category monthly spending budgets to SlipTrack. Users set a THB limit per expense category per book. A dedicated Budget tab shows progress bars (green → yellow → red) as spending approaches or exceeds the limit. Budgets reset every calendar month automatically — no rollover.

---

## Scope

- Per-category budgets (Food, Transport, Bills, etc.)
- Per-book (Personal and Business books have independent budgets)
- Monthly calendar period — evaluated against current month at query time
- Visual alerts only (no push notifications)
- New "Budget" tab in bottom nav

Out of scope: rollover, overall monthly cap, daily/weekly periods.

---

## Data Model

Add a `Budget` model to Prisma schema:

```prisma
model Budget {
  id          String   @id @default(cuid())
  bookId      String
  book        Book     @relation(fields: [bookId], references: [id], onDelete: Cascade)
  category    String   // matches Transaction.category values
  limitSatang Int      // monthly limit in satang (THB × 100)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([bookId, category])
  @@index([bookId])
}
```

`Book` model gains `budgets Budget[]`.

One row per category per book. No date field — "current month" is computed at query time using the server's current date.

---

## API

### `GET /api/books/[id]/budgets`

Returns all budgets for the book, enriched with current-month spend.

**Response:**
```json
[
  {
    "category": "Food",
    "limitSatang": 500000,
    "spentSatang": 320000,
    "pct": 64
  }
]
```

`spentSatang` = SUM of `amount` for expense transactions in the current calendar month for that category. Computed server-side using the `[bookId, date]` index — no additional index needed.

`pct` = `spentSatang / limitSatang * 100`, capped display-side at any value (can exceed 100).

### `PUT /api/books/[id]/budgets/[category]`

Upsert budget for a category.

**Body:** `{ "limitSatang": 500000 }`

**Response:** the upserted Budget row.

### `DELETE /api/books/[id]/budgets/[category]`

Remove budget for a category. Returns 204.

All endpoints require auth (same session guard as existing book endpoints). Validate that the book belongs to the current user.

---

## UI

### New route: `app/[bookId]/budget/`

Files: `page.tsx` (server, fetches budgets) + `client.tsx` (interactive).

**Layout:**

1. **Header row** — "Budget · May 2026" on left, total spent / total limits on right (sum of all active budgets).
2. **Active budgets list** — cards for each category that has a limit set:
   - Category emoji + name
   - Progress bar: green below 75%, yellow 75–99%, red 100%+
   - `฿X,XXX / ฿X,XXX` label (spent / limit)
   - Tap → edit bottom sheet (change limit or delete budget)
3. **"No budget set" section** — remaining categories listed greyed-out with a "+ Set budget" affordance per row.
4. **Empty state** — if no budgets set yet, full-screen empty state with "Set your first budget" CTA.

**Edit / create bottom sheet:**
- Category name (read-only when editing, picker when creating from FAB)
- Amount input (numeric, in THB — stored as satang × 100)
- "Save" and "Remove budget" (remove hidden when creating)

### Bottom nav

Add `Budget` tab (wallet or piggy bank icon) between History and Trends. Update `tab-bar.tsx`.

### Dashboard integration (lightweight)

In `category-chart.tsx` or the category breakdown section: if a category has a budget and `pct >= 100`, show a small red indicator (dot or badge). No new API call — pass budget data as a prop from the dashboard server component (one additional fetch on dashboard load).

---

## Error Handling

- Invalid `limitSatang` (≤ 0, non-integer): 400 with message
- Category not in allowed list: 400
- Book not owned by user: 403
- DELETE on non-existent budget: 404

---

## Testing

- Unit: `spentSatang` calculation logic (edge cases: no transactions, transactions in other months, other categories)
- Integration: all three API endpoints (create, update, delete, list)
- Component: progress bar color thresholds (< 75 green, 75–99 yellow, ≥ 100 red)
- E2E: set a budget → add expense → verify progress bar updates
