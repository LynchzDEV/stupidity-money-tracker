# Recurring Transactions — Design

Date: 2026-05-29
Status: Implemented

## Problem

The snap-first model captures variable retail spend well but is blind to fixed
recurring money that has no slip to photograph — rent, salary, subscriptions,
recurring transfers. Today these must be re-entered manually every month, which
is the exact friction recurring rules remove. Recurring also makes budgets
honest: a budget that ignores ฿8,000 rent is lying.

## Decisions

- **Generation:** reminder → confirm. Never silently insert money (matches the
  app's confirm-everything ethos; needs no scheduler infra).
- **Frequency:** monthly only (v1). Covers the 90% case.
- **Surface:** interactive confirm cards on the dashboard; a slim count pill on
  the camera/upload screen that links to the dashboard.
- **Appears once:** a rule shows at most once per calendar month. After confirm
  or skip it disappears until the next period. No backfill of missed months.
- **Creation:** a "Repeat monthly" toggle on the manual entry form. No separate
  create form.

## Data model

`RecurringRule` (one per repeating item):

- `amount` (satang), `type`, `category`, `note?`, `merchantName?`
- `dayOfMonth` (1–31, clamped to month length when due)
- `startPeriod` "YYYY-MM" — first active month
- `endPeriod?` "YYYY-MM" — last active month, null = open-ended
- `lastRunPeriod?` "YYYY-MM" — last period confirmed or skipped (the once-a-month gate)
- `isActive`

`Transaction.recurringRuleId?` links generated transactions back to their rule
(`onDelete: SetNull`, so stopping a rule keeps past entries).

## Due logic (`lib/recurring.ts`, pure + unit-tested)

A rule is **due** when: active, `currentPeriod` within `[startPeriod, endPeriod]`,
`lastRunPeriod !== currentPeriod`, and today's day ≥ `clampDay(dayOfMonth)`.
`clampDay` maps day 31 to the last real day of short months (Feb → 28/29).

## API

- `GET  /api/recurring?bookId=` — due reminders for the book
- `POST /api/recurring` — create rule from a transaction's fields + date
  (sets `startPeriod` and `lastRunPeriod` to the seed month so it first fires next month)
- `POST /api/recurring/[id]/confirm` — create the transaction for the current
  period, link it, set `lastRunPeriod` (idempotent: no-op if already handled)
- `POST /api/recurring/[id]/skip` — set `lastRunPeriod`, create nothing
- `DELETE /api/recurring/[id]` — stop the rule

All endpoints verify the rule's book belongs to the session user.

## UI

- `components/recurring-reminders.tsx` — dashboard confirm cards (Add / Skip / Stop repeating)
- `components/recurring-banner.tsx` — upload-screen count pill → dashboard
- Manual entry: "Repeat monthly" toggle
- Edit sheet: "Repeats monthly · Stop" row for generated transactions

## Known v1 limitations

- Monthly only (no weekly/yearly).
- No backfill: if the app is unopened past a due day, only the current period is
  offered; fully missed months are not retroactively created.
- The seed manual transaction is not itself linked to the rule (only future
  generated transactions are), so the "Repeats monthly" indicator shows on
  generated entries, not the original.
