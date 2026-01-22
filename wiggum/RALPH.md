# Ralph Loop — innbox

```
    ┌─────────────────────────────────────────────┐
    │  🚔 RALPH LOOP ACTIVE                       │
    │                                             │
    │  "I'm helping!"                             │
    └─────────────────────────────────────────────╯
```

You are building **innbox**, a single-domain email receiving service.

## Current Goal

**Get emails flowing as fast as possible.**

## Context Files

Before each task, read these files to understand the current state:

1. `wiggum/PROMPT.md` — Project overview
2. `plan-files/13-implementation/PHASES.md` — Implementation phases
3. `plan-files/03-database/schema.ts` — Database schema

## Environment

- **APP_DOMAIN**: `innbox.dev` (configured in `.env`)
- **Database**: Turso (credentials in `.env`)
- **Framework**: React Router v7

## Implementation Order

Work through these phases sequentially. Complete each before moving on.

### Phase 1: Project Setup ✓
- [x] React Router v7 project exists
- [ ] Install: `bun add drizzle-orm @libsql/client clsx tailwind-merge`
- [ ] Install dev: `bun add -d drizzle-kit`
- [ ] Create `app/lib/utils.ts` with `cn()` helper

### Phase 2: Database
- [ ] Create `db/schema.ts` (copy from `plan-files/03-database/schema.ts`)
- [ ] Create `app/lib/db.server.ts`
- [ ] Create `drizzle.config.ts`
- [ ] Add db scripts to package.json
- [ ] Run `bun run db:generate && bun run db:migrate`
- [ ] Verify with `bun run db:studio`

### Phase 3: Auth
- [ ] Create `app/lib/auth.server.ts`
- [ ] Create `app/routes/login.tsx`
- [ ] Create `app/routes/register.tsx`
- [ ] Test: can register and login

### Phase 4: Core Routes
- [ ] Create `app/routes/_app.tsx` (authenticated layout)
- [ ] Create `app/routes/_app.inbox._index.tsx`
- [ ] Create `app/routes/_app.inbox.new.tsx`
- [ ] Create `app/routes/_app.inbox.$inboxId.tsx`
- [ ] Create `app/routes/_app.inbox.$inboxId.$emailId.tsx`

### Phase 5: Webhook (Critical Path)
- [ ] Create `workers/email-worker.ts`
- [ ] Create `workers/wrangler.toml`
- [ ] Create `app/routes/api.webhook.email.ts`
- [ ] Deploy worker to Cloudflare
- [ ] Configure Email Routing
- [ ] Test: send email, see in database

### Phase 6: Email Display
- [ ] Style email list
- [ ] Style email detail
- [ ] Mark as read functionality

### Phase 7: Email Sending
- [ ] Create `app/lib/brevo.server.ts`
- [ ] Create `app/routes/api.email.send.ts`
- [ ] Add compose/reply UI

## Working Style

1. **One phase at a time** — Complete fully before moving on
2. **Test after each step** — Verify before proceeding
3. **Keep it simple** — No over-engineering
4. **Use existing patterns** — Follow React Router v7 conventions

## Key Files Reference

| Need | Location |
|------|----------|
| Database schema | `plan-files/03-database/schema.ts` |
| Worker code | `plan-files/05-cloudflare-worker/email-worker.ts` |
| Webhook spec | `plan-files/06-webhook/WEBHOOK.md` |
| Brevo setup | `plan-files/07-outbound-email/BREVO.md` |
| UI components | `plan-files/10-ui-components/` |

## Commands

```bash
bun run dev          # Start dev server
bun run db:generate  # Generate migrations
bun run db:migrate   # Apply migrations
bun run db:studio    # Open Drizzle Studio
```

## Current Phase

**Start with Phase 1** — Install dependencies and create utils.

When you complete a phase, update the checkboxes in this file and announce:

```
✅ Phase X complete. Moving to Phase Y.
```

---

*Let's get those emails flowing.*
