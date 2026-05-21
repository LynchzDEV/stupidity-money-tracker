# Design: Dashboard Stale Data + Chat Button UX

Date: 2026-05-21

## Problem 1 — Dashboard data stale after edits

`app/[bookId]/dashboard/page.tsx` is a Server Component. It renders balance totals, category breakdown, and recent transactions at request time. `RecentTransactions` is a client component that manages its own local state — edits/deletes update local React state only. The server-rendered sections (net balance, income/expense totals, "Where it went" categories) never update until the user hard-refreshes the page.

### Fix

In `components/recent-transactions.tsx`:
- Import `useRouter` from `next/navigation`
- After `handleSaved` (optimistic local update) → call `router.refresh()`
- After `handleDeleted` (optimistic local remove) → call `router.refresh()`

`router.refresh()` triggers Next.js to re-fetch the Server Component tree, updating all server-rendered stats. Local optimistic state means the list itself feels instant; the stats catch up on refresh.

No other files need changes.

## Problem 2 — Separate send/save buttons in ConfirmSheet

`components/confirm-sheet.tsx` bottom bar has two rows:

```
Row 1: [input field          ] [▲ send arrow]
Row 2: [✏ edit icon]          [Save · ฿xxx ]
```

Two separate action buttons is confusing UX. The send arrow is redundant (Enter key already works). The save button sitting below feels disconnected.

### Fix

Merge into one unified action button:

```
Row 1: [input field                          ]
Row 2: [✏ edit icon] [Send | Save · ฿xxx    ]
```

Rules for unified button:
- `input.trim()` non-empty → label "Send", action `sendMessage()`, disabled if `thinking`
- `input.trim()` empty → label "Save · ฿xxx" (or "Pick one to save"), action `onSave(...)`, disabled if `!typeAnswered || !amount`

Remove: the small `▲` arrow button from Row 1. The input row becomes just the text field.

Keep: Enter key sends (already wired). Edit icon button (focuses input). All disabled states.

## Scope

Two files changed:
1. `components/recent-transactions.tsx` — add `router.refresh()` after mutations
2. `components/confirm-sheet.tsx` — remove arrow button, unify save/send button logic
