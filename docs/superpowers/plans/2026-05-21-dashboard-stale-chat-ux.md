# Dashboard Stale Data + Chat UX Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix dashboard stats not updating after edits, and merge the chat send/save buttons into one context-aware button.

**Architecture:** Two independent, minimal changes — `router.refresh()` after mutations in RecentTransactions to re-render the server component, and a conditional button in ConfirmSheet that swaps between Send/Save based on input state.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, `next/navigation` useRouter

---

## File Map

| File | Change |
|------|--------|
| `components/recent-transactions.tsx` | Add `useRouter`, call `router.refresh()` after save and delete |
| `components/confirm-sheet.tsx` | Remove arrow send button, unify bottom button logic |

---

### Task 1: Fix dashboard stale data — add router.refresh() after mutations

**Files:**
- Modify: `components/recent-transactions.tsx`

- [ ] **Step 1: Add `useRouter` import**

In `components/recent-transactions.tsx`, change the import line:

```tsx
// Before
import { useState } from 'react'

// After
import { useState } from 'react'
import { useRouter } from 'next/navigation'
```

- [ ] **Step 2: Initialize router inside the component**

Inside `RecentTransactions`, add after the existing `useState` calls:

```tsx
export function RecentTransactions({ transactions: initial }: { transactions: Transaction[] }) {
  const [txs, setTxs] = useState(initial)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const router = useRouter()   // add this line
```

- [ ] **Step 3: Call router.refresh() in handleSaved**

```tsx
function handleSaved(updated: Transaction) {
  setTxs(prev => prev.map(t => t.id === updated.id ? updated : t))
  setEditing(null)
  router.refresh()
}
```

- [ ] **Step 4: Call router.refresh() in handleDeleted**

```tsx
function handleDeleted(id: string) {
  setTxs(prev => prev.filter(t => t.id !== id))
  setEditing(null)
  router.refresh()
}
```

- [ ] **Step 5: Verify manually**

1. Run dev server: `npm run dev`
2. Open a book's dashboard page
3. Edit a transaction amount (e.g. change ฿100 to ฿500)
4. Save — the net balance, income/expense totals, and category bars should update without a full page reload

- [ ] **Step 6: Commit**

```bash
git add components/recent-transactions.tsx
git commit -m "fix(dashboard): refresh server component after transaction edit/delete"
```

---

### Task 2: Unify chat send and save into one button

**Files:**
- Modify: `components/confirm-sheet.tsx`

- [ ] **Step 1: Remove the arrow send button from the input row**

Find the chat input row (around line 302–326). It currently looks like:

```tsx
{/* Chat input row */}
<div className="flex gap-2 mb-2.5">
  <input
    ref={inputRef}
    value={input}
    onChange={e => setInput(e.target.value)}
    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
    placeholder="e.g. change to ฿200, mark as income…"
    disabled={thinking}
    inputMode="text"
    enterKeyHint="send"
    autoComplete="off"
    autoCorrect="off"
    className="flex-1 h-11 rounded-2xl px-3.5 text-[14px] outline-none disabled:opacity-50"
    style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)', color: 'var(--ink)' }}
  />
  <button
    onClick={sendMessage}
    disabled={!input.trim() || thinking}
    className="w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
    style={{ background: 'var(--accent)' }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7"/>
    </svg>
  </button>
</div>
```

Replace with (input only, no arrow button):

```tsx
{/* Chat input row */}
<div className="flex gap-2 mb-2.5">
  <input
    ref={inputRef}
    value={input}
    onChange={e => setInput(e.target.value)}
    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
    placeholder="e.g. change to ฿200, mark as income…"
    disabled={thinking}
    inputMode="text"
    enterKeyHint="send"
    autoComplete="off"
    autoCorrect="off"
    className="flex-1 h-11 rounded-2xl px-3.5 text-[14px] outline-none disabled:opacity-50"
    style={{ background: 'var(--surface)', border: '1px solid var(--hairline2)', color: 'var(--ink)' }}
  />
</div>
```

- [ ] **Step 2: Replace the save button with a unified send/save button**

Find the save row (around line 329–348). It currently looks like:

```tsx
{/* Save row — edit icon + save button (matches design) */}
<div className="flex gap-2.5">
  <button
    onClick={() => inputRef.current?.focus()}
    className="w-14 h-[52px] rounded-2xl flex items-center justify-center active:opacity-70 transition-opacity flex-shrink-0"
    style={{ background: 'var(--surface)', border: '1px solid var(--hairline)' }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M14 6l4 4"/>
    </svg>
  </button>
  <button
    disabled={!typeAnswered || !amount}
    onClick={() => onSave({ amount, type, category, date, note, merchantName: extraction.merchantName })}
    className="flex-1 h-[52px] rounded-2xl text-white text-base font-semibold flex items-center justify-center gap-2 active:scale-[.97] transition-transform disabled:opacity-40"
    style={{ background: 'var(--accent)', boxShadow: '0 1px 0 rgba(255,255,255,.18) inset, 0 -1px 0 rgba(0,0,0,.15) inset, 0 2px 6px rgba(14,92,58,.25)' }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5l5 5L20 6.5"/>
    </svg>
    {typeAnswered && amount ? `Save · ${amtFormatted}` : 'Pick one to save'}
  </button>
</div>
```

Replace with:

```tsx
{/* Action row — edit icon + unified send/save button */}
<div className="flex gap-2.5">
  <button
    onClick={() => inputRef.current?.focus()}
    className="w-14 h-[52px] rounded-2xl flex items-center justify-center active:opacity-70 transition-opacity flex-shrink-0"
    style={{ background: 'var(--surface)', border: '1px solid var(--hairline)' }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M14 6l4 4"/>
    </svg>
  </button>
  {input.trim() ? (
    <button
      onClick={sendMessage}
      disabled={thinking}
      className="flex-1 h-[52px] rounded-2xl text-white text-base font-semibold flex items-center justify-center gap-2 active:scale-[.97] transition-transform disabled:opacity-40"
      style={{ background: 'var(--accent)', boxShadow: '0 1px 0 rgba(255,255,255,.18) inset, 0 -1px 0 rgba(0,0,0,.15) inset, 0 2px 6px rgba(14,92,58,.25)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7"/>
      </svg>
      Send
    </button>
  ) : (
    <button
      disabled={!typeAnswered || !amount}
      onClick={() => onSave({ amount, type, category, date, note, merchantName: extraction.merchantName })}
      className="flex-1 h-[52px] rounded-2xl text-white text-base font-semibold flex items-center justify-center gap-2 active:scale-[.97] transition-transform disabled:opacity-40"
      style={{ background: 'var(--accent)', boxShadow: '0 1px 0 rgba(255,255,255,.18) inset, 0 -1px 0 rgba(0,0,0,.15) inset, 0 2px 6px rgba(14,92,58,.25)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12.5l5 5L20 6.5"/>
      </svg>
      {typeAnswered && amount ? `Save · ${amtFormatted}` : 'Pick one to save'}
    </button>
  )}
</div>
```

- [ ] **Step 3: Verify manually**

1. Scan a receipt → reach ConfirmSheet
2. Bottom bar should show `[edit icon] [Save · ฿xxx]` with no arrow button above
3. Type something in the input field → bottom button changes to `[edit icon] [▲ Send]`
4. Clear the input → button reverts to `[edit icon] [Save · ฿xxx]`
5. Press Enter while typing → sends message (still works)
6. Click Send → message sends, input clears, button reverts to Save
7. Click Save → transaction saved correctly

- [ ] **Step 4: Commit**

```bash
git add components/confirm-sheet.tsx
git commit -m "fix(chat): unify send/save into single context-aware button"
```
