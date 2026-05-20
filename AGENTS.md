<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Git

- **Always commit after completing any change.** Do not ask for permission — just commit.
- Never add `Co-Authored-By` trailers to commits.
- Use rebase, not merge.
- Split large changes into logical commits.

# Mobile / UI

- All screens are mobile-first. Use `100dvh` not `100vh`.
- Always use `env(safe-area-inset-top/bottom)` for header and bottom bar padding.
- Add `-webkit-overflow-scrolling: touch` (or `WebkitOverflowScrolling`) on scroll containers.
- Layout root must have `viewport-fit=cover` in the viewport meta.
- Design tokens live in `globals.css` — never hardcode colors that have a CSS variable.

# Code style

- No comments unless the WHY is non-obvious.
- No trailing summaries in responses — user can read the diff.
- No `Co-Authored-By` in commits.
