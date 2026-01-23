# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

```
    ╭──────────────────────────────────────╮
    │  📬 innbox                           │
    │                                      │
    │  The inbox that gets out of the way  │
    ╰──────────────────────────────────────╯
```

## Project Overview

innbox is a minimalist email receiving service. Users can create inboxes instantly (`your-name@innbox.dev`) and receive/send emails with real-time updates.

## Development Commands

```bash
bun run dev          # dev server at localhost:5173 (also generates +types/*)
bun run build        # production build
bun run start        # run production server
bun run typecheck    # TypeScript validation

# Database
bun run db:generate  # create migration files from schema changes
bun run db:migrate   # apply migrations to Turso
bun run db:studio    # GUI for database inspection
```

## Architecture

### Tech Stack
- **React Router v7** — framework mode with SSR
- **Bun** — runtime and package manager
- **Turso** — SQLite at the edge (via Drizzle ORM)
- **Brevo** — outbound email sending
- **Tailwind CSS** — utility-first styles

### Key Files

| Path | Purpose |
|------|---------|
| `app/routes.ts` | Central route configuration |
| `db/schema.ts` | Database schema (14 tables) |
| `app/lib/auth.server.ts` | Session management, password hashing, access control |
| `app/lib/threading.server.ts` | Gmail-compatible email threading |
| `app/lib/eventBus.server.ts` | In-memory pub/sub for SSE |
| `app/lib/invitations.server.ts` | Magic link invitation system |
| `app/hooks/useInboxSSE.ts` | Real-time updates with reconnection logic |
| `app/routes/_app.tsx` | Authenticated layout with sidebars |
| `workers/email-worker.ts` | Cloudflare Worker for inbound email |

### Data Flow: Inbound Email
```
Cloudflare Worker → api.webhook.email (HMAC verified)
    → Find inbox → threading.server (find/create thread)
    → Store in DB → eventBus.notifyInbox()
    → useInboxSSE (client) → revalidate() → UI updates
```

### Access Control
The app supports multi-user inboxes via `inboxMembers` table:
- `canAccessInbox(userId, inboxId)` — checks membership (or legacy `inboxes.userId`)
- `isInboxOwner()` — checks 'owner' role
- `getUserAccessibleInboxes()` — returns all inboxes a user can see

User types: `admin` (can create inboxes) vs `member` (invited access only)

### Threading Logic
Gmail-compatible threading in `threading.server.ts`:
1. Match by Message-ID in References/In-Reply-To headers
2. Fall back to normalized subject matching within 7-day window
3. `normalizeSubject()` strips Re:/Fwd:/localized prefixes recursively

## Coding Conventions

### React Router v7
- Routes configured in `app/routes.ts` using `index`, `route`, `layout`, `prefix`
- Use `+types/*` imports for auto-generated route types (created by `bun run dev`)
- Prefer `useLoaderData<typeof loader>()` for inferred types
- Server-only code uses `.server.ts` suffix

### Styling
- Tailwind first, inline styles only when obtuse
- Use `cn()` helper from `app/utils.ts` for conditional classes
- Custom animations in `app/app.css` (`.animate-slide-up`, `.animate-slide-up-compose`)

### Comments
- Keep comments story-driven and engaging
- Use ASCII art and emoji to make code exploration fun (🧵 for threading, 🎟️ for invitations, etc.)
- Preserve existing notes for future developers

### Components
- Create reusable primitives (Button, Input) when patterns emerge
- Fight for consistency—if a component should be used somewhere, use it
- Types/Props go at the bottom of files

### Git
- No Claude watermarks or Co-Authored-By lines in commits
- Keep commit messages concise and meaningful

---

*The adventure continues...*
