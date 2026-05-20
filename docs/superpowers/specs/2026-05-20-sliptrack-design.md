# SlipTrack — Design Spec
_2026-05-20_

## What it is

Mobile-first web app. Upload a bank slip or paper receipt → AI extracts fields → confirm in a chat-style sheet → saved. 2 taps to log a transaction.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router (fullstack) |
| Database | PostgreSQL (local) + Prisma ORM |
| Auth | NextAuth.js v5 + Google OAuth |
| Styling | Tailwind CSS + Aceternity UI + shadcn/ui + Framer Motion |
| AI | OpenRouter vision model (receipt OCR + extraction) |
| File storage | Immich API (self-hosted) |
| Currency | THB only |

---

## Core Concepts

**Book** — a named ledger (e.g. "Personal", "Team Costs"). One user can have many Books.

**Default Book** — when set, app skips the book selector entirely on launch and opens straight to the Upload screen. User holds a book card to change the default.

**Transaction** — one income or expense entry. Fields: `amount`, `type` (income|expense), `category`, `date`, `note`, `receipt_image_path`, `book_id`.

---

## Data Model

```
User
  id, email, name, image (from Google OAuth)
  └── Books[]
        id, name, emoji, is_default, user_id
        └── Transactions[]
              id, amount (integer, satang), type, category, date,
              note, immich_asset_id, confidence_json, book_id
```

`amount` stored as integer (satang = THB × 100) to avoid float issues.

`confidence_json` stores per-field AI confidence scores for display in confirm UI.

---

## App Flow

```
Open app
  ├── No default book → Book Selector screen
  │     └── Tap book → Upload screen
  └── Default book set → Upload screen (straight in)

Upload screen
  └── Pick image (file picker or camera on mobile)
        └── POST /api/extract → OpenRouter vision model
              ├── AI thinking state (shimmer on fields)
              └── Confirm sheet slides up (chat style)
                    ├── All fields confident → "Got it. ฿500 from KBank, income. Save?"
                    ├── Ambiguous field → chat bubble asks "Income or expense?"
                    │     └── User taps chip answer
                    └── Tap "Save" → transaction saved → sheet closes → ready for next
```

---

## Screens

### 1. Login
- Google OAuth one-tap
- Light, minimal — warm off-white `#f5f3ec` background
- No password, no email form

### 2. Book Selector
- Grid of book cards (3D card hover effect — Aceternity)
- Each card: emoji, name, entry count, last used date
- "Set default" button per card — when set, shows star badge
- "+ New Book" card at end
- Default book behavior: if default set on next open, this screen is skipped

### 3. Upload (home screen inside a book)
- Book chip top-left (name + chevron) — tap opens Book Sheet
- Large upload zone center: tap to open file picker, or drag-drop on desktop
- On mobile: opens camera directly
- Flash/gallery icons top-right (camera controls)
- No bottom nav bar — this IS the home

### 4. AI Thinking State
- Receipt thumbnail shown
- Field rows animate in with shimmer skeleton
- Pulsing "Reading receipt…" indicator
- Cannot dismiss — auto-transitions when extraction done

### 5. Confirm Sheet (Chat style — slides up over upload screen)
- AI "message" at top: `"Got it. ฿79 at 7-Eleven · Food · Expense"` (streaming in word by word)
- Each extracted value is an **inline editable chip** — tap to edit
- Ambiguous fields: AI asks as a follow-up bubble, e.g. `"Income or expense?"` with tap chips for answer
- If only price detected (e-slip with minimal info): AI shows what it has, asks for missing fields one at a time
- "Save" button at bottom (primary, full-width)
- "Discard" ghost button below Save
- Swipe down to dismiss

### 6. Saved Toast
- Full-screen checkmark flash (200ms) → back to Upload, ready for next

### 7. Book Sheet (bottom sheet, not a screen)
- Slides up from bottom over any screen
- List of books with last-used date
- "Set as default" per row
- "+ New Book" at bottom
- Drag handle at top, tap outside to dismiss

### 8. Dashboard
- Reachable via book chip → "Dashboard" link, or swipe left from Upload
- Three sections:
  1. **Monthly summary** — income total, expense total, net balance (large numerals, Geist Mono)
  2. **Spending by category** — horizontal bar chart, top 5 categories
  3. **Recent transactions** — last 10, with receipt thumbnail, tap to expand

### 9. Transaction History
- Full searchable list
- Filter by: category, type (income/expense), date range
- Each row: receipt thumbnail, store name / description, amount, date
- Tap row → expand to show full receipt image + all fields

---

## Upload / Extraction Flow (technical)

1. User selects image → client sends to `POST /api/extract` as `multipart/form-data`
2. Server uploads image to Immich (`POST /api/assets`), adds to SlipTrack album, gets back `assetId`
3. Server sends image to OpenRouter vision model in parallel
4. Prompt instructs model to return JSON: `{ amount, type, category, date, note, confidence: { amount, type, category, date } }`
5. Server returns extracted JSON + `assetId` to client
6. Client enters Confirm Sheet state
7. On save: `POST /api/transactions` with confirmed fields + `immich_asset_id`

Receipt images displayed via `{IMMICH_URL}/api/assets/{assetId}/thumbnail?size=preview`.

OpenRouter model: `google/gemini-2.0-flash-001` (fast, cheap, strong vision).

---

## Extraction Prompt Strategy

System prompt instructs the model:
- Output strict JSON only, no prose
- `type`: "income" if money flows TO user, "expense" if FROM user — if unclear, omit
- `category`: one of `["Food","Transport","Bills","Shopping","Transfer","Salary","Other"]`
- `confidence`: 0.0–1.0 per field (used to decide which fields to ask about)
- Handle Thai text (KBank, SCB, KTB slips are in Thai)
- Handle paper receipts with partial info

Fields with confidence < 0.7 trigger a follow-up chat bubble in the confirm sheet.

---

## Design Tokens

From Claude Design prototype:

| Token | Value |
|---|---|
| bg | `#f5f3ec` (warm off-white) |
| paper | `#fbfaf5` |
| surface | `#ffffff` |
| ink | `#15171a` |
| muted | `#7a7d76` |
| accent | `#0e5c3a` (forest green) |
| accentSoft | `#ecf3ee` |
| income | `#1f8a5b` |
| expense | `#b2492c` |
| font | Geist (UI) + Geist Mono (amounts) + Instrument Serif (display) |

---

## Environment Variables

```
IMMICH_URL=https://your-immich-instance.com
IMMICH_API_KEY=your-api-key
IMMICH_ALBUM_ID=uuid-of-sliptrack-album   # created once on first run
OPENROUTER_API_KEY=your-openrouter-key
NEXTAUTH_SECRET=random-secret
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
DATABASE_URL=postgresql://...
```

---

## Aceternity UI Components

| Screen | Component |
|---|---|
| Book Selector | 3D Card Effect, Wobble Card |
| Upload | Background Beams |
| Dashboard | Card Spotlight, Tracing Beam |
| Confirm sheet | (custom animated chat bubbles w/ Framer Motion) |
| History | Timeline |

---

## Key UX Constraints

- **Minimum taps to log**: 2 (shutter + save) when default book set and AI is confident
- Book switcher never opens a new page — always a bottom sheet
- AI never blocks with a full form — asks only for missing/ambiguous fields
- Amounts always display as `฿X,XXX.XX` with Geist Mono
- No dark mode (light + minimal is the aesthetic)

---

## Out of Scope (v1)

- Multi-user / sharing books
- Budget goals / alerts
- Export (CSV, PDF)
- Multi-currency
- Recurring transactions
- Push notifications
