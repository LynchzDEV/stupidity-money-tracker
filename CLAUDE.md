@AGENTS.md

# Next.js Version Reality

This project uses Next.js **16.2.6** (package says "14" but is actually v16).

- All dynamic `params` and `searchParams` are `Promise<{...}>` — always `await` them
- Middleware file is `proxy.ts` NOT `middleware.ts` — never create `middleware.ts`
- Never have both `proxy.ts` and `middleware.ts` simultaneously

# Prisma v7 Rules

- No `engineType = "library"` — use `@prisma/adapter-pg` + `PrismaPg` adapter
- After ANY schema change: run `npx prisma migrate dev` THEN `npx prisma generate`
- `@auth/prisma-adapter` requires `emailVerified DateTime?` on User model

# Auth Split (Edge vs Non-Edge)

- `proxy.ts` imports from `lib/auth-edge.ts` ONLY (no Prisma — edge runtime)
- API routes import from `lib/auth.ts` (has PrismaAdapter — non-edge only)
- Never import `lib/auth.ts` into `proxy.ts`

# Environment Variables / Client Safety

- `IMMICH_URL`, `IMMICH_API_KEY`, `OPENROUTER_API_KEY` are server-only — no `NEXT_PUBLIC_` prefix
- Thumbnail URLs must go through `/api/immich/[assetId]/thumbnail` proxy — never expose Immich URL to client
- AI model configurable via `OPENROUTER_MODEL` env var (default: `google/gemini-2.5-flash`)

# Database

- PostgreSQL runs on port **5433** (5432 taken by Rancher Desktop)
- `DATABASE_URL`: `postgresql://sliptrack:sliptrack@localhost:5433/sliptrack`

# Fetch Error Handling

- Always check `res.ok` before calling `res.json()` — empty error bodies crash with SyntaxError

# Camera / Upload

- Use `getUserMedia` for real camera feed — never use placeholder/fake camera
- Capture frame: `canvas.drawImage(video)` → `canvas.toBlob()` → `File`
- Gallery input: `<input type="file" accept="image/*">` without `capture` attribute
- Camera input: `<input type="file" accept="image/*" capture="environment">`

# Design System

- All design tokens are CSS variables in `globals.css` — never hardcode colors
- Fonts: Geist (UI), Geist Mono (amounts/numbers via `font-mono` class), Instrument Serif (display)
- Amounts stored as satang (THB × 100) integer in DB — convert for display with `÷ 100`
- Mobile: use `100dvh`, `env(safe-area-inset-*)`, `-webkit-overflow-scrolling: touch`

