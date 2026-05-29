# SlipTrack

Mobile-first AI income & expense tracker. Point your camera at a receipt or bank slip — it extracts the amount, category, date, and note automatically. Add transactions manually too.

<!-- screenshot: upload screen with camera active -->
<!-- screenshot: dashboard with monthly summary -->
<!-- screenshot: history list -->

## Features

- **AI scan** — photograph receipts or bank slips; Gemini extracts structured data
- **Manual entry** — fallback form with category picker and date/note fields
- **Recurring** — flag a transaction "repeat monthly"; on the due day a confirm card appears on the dashboard (and a pill on the camera screen) to add it in one tap, skip the month, or stop repeating — never auto-inserted
- **Multiple books** — separate ledgers (e.g. Personal, Business)
- **Dashboard** — monthly income/expense summary with category breakdown chart
- **History** — searchable, filterable transaction list grouped by day
- **Trends** — spending trends with delta analysis and AI-generated insights
- **AI chat** — ask questions about your transactions in natural language
- **Custom categories** — add your own; autocomplete on reuse
- **Photo album** — browse receipt images backed up to Immich
- **Auth** — Google OAuth or dev bypass

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL 16 via Prisma 7 |
| Auth | NextAuth v5 (Google + Credentials) |
| AI | OpenRouter → Gemini 2.5 Flash (vision + chat) |
| Animations | Framer Motion |
| Photo storage | Immich (optional) |
| Styling | Tailwind CSS + CSS variables |
| Runtime | Bun |

## Prerequisites

- [Bun](https://bun.sh)
- Docker (for Postgres)
- OpenRouter API key
- Google OAuth credentials (optional — dev bypass available)

## Setup

**1. Clone & install**

```bash
git clone <repo>
cd income-and-expenses-ai-trackker
bun install
```

**2. Start database**

```bash
docker compose up -d
```

**3. Environment variables**

```bash
cp .env.example .env.local
```

```env
DATABASE_URL=postgresql://sliptrack:sliptrack@localhost:5433/sliptrack

AUTH_SECRET=your-secret-here
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...

OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=google/gemini-2.5-flash   # optional, this is the default

# Optional — Immich photo backup
IMMICH_URL=https://your-immich-instance
IMMICH_API_KEY=...
```

**4. Migrate & generate**

```bash
npx prisma migrate dev
npx prisma generate
```

**5. Run**

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

1. **Upload page** — live camera feed (or gallery picker). Tap the shutter.
2. AI classifies the image. Non-receipt/slip images are rejected with an explanation.
3. Extracted fields shown in a confirm sheet — edit before saving.
4. Transaction saved to Postgres; photo optionally backed up to Immich.

## Project structure

```
app/
  (auth)/login/        — login page
  [bookId]/
    dashboard/         — monthly summary + category chart
    upload/            — camera + AI extraction
    manual/            — manual entry form
    history/           — searchable transaction list
    trends/            — spending trend analysis + AI insights
    album/             — receipt photo gallery (Immich)
  books/               — book switcher
  api/
    extract/           — AI receipt extraction endpoint
    transactions/      — CRUD
    books/             — book management
    chat/              — AI chat endpoint
    search/            — transaction search
    immich/            — Immich proxy
    og/                — Open Graph image generation
components/            — UI components
lib/                   — auth, prisma, openrouter, immich
prisma/                — schema + migrations
```

## Development

```bash
bun test          # unit tests (Vitest)
bun run lint      # ESLint
bun run build     # production build
```

## License

MIT
