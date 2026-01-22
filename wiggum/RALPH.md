# Ralph Loop — innbox

```
    ┌─────────────────────────────────────────────┐
    │  🚔 RALPH LOOP ACTIVE                       │
    │                                             │
    │  "I'm helping!"                             │
    └─────────────────────────────────────────────╯
```

You are building **innbox**, a single-domain email receiving service.

---

## Loop Configuration

| Parameter | Value |
|-----------|-------|
| **Expected Iterations** | 12-15 |
| **Exit Code** | `RALPH_COMPLETE` |

### Exit Condition

The loop exits when ALL of these are true:

1. ✅ All 7 phases have checkmarks
2. ✅ `bun run dev` starts without errors
3. ✅ Can send email to `test@{APP_DOMAIN}` and see it in the UI
4. ✅ Can reply to an email via Brevo

**When complete, output:**

```
🚔 RALPH_COMPLETE

innbox is operational.
- Receiving: ✅ Cloudflare → Webhook → Turso
- Sending: ✅ Brevo API
- UI: ✅ Login → Inbox → Email Detail

Next steps: Deploy to Vercel
```

---

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

### Phase 1: Project Setup ✅
- [x] React Router v7 project exists
- [x] Install: `bun add drizzle-orm @libsql/client clsx tailwind-merge`
- [x] Install dev: `bun add -d drizzle-kit`
- [x] Create `app/lib/utils.ts` with `cn()` helper

### Phase 2: Database ✅
- [x] Create `db/schema.ts` (copy from `plan-files/03-database/schema.ts`)
- [x] Create `app/lib/db.server.ts`
- [x] Create `drizzle.config.ts`
- [x] Add db scripts to package.json
- [x] Run `bun run db:generate && bun run db:migrate`
- [x] Migrations applied to Turso

### Phase 3: Auth ✅
- [x] Create `app/lib/auth.server.ts`
- [x] Create `app/routes/login.tsx`
- [x] Create `app/routes/register.tsx`
- [x] Build passes with auth routes

### Phase 4: Core Routes ✅
- [x] Create `app/routes/_app.tsx` (authenticated layout)
- [x] Create `app/routes/_app.inbox._index.tsx`
- [x] Create `app/routes/_app.inbox.new.tsx`
- [x] Create `app/routes/_app.inbox.$inboxId.tsx`
- [x] Create `app/routes/_app.inbox.$inboxId.$emailId.tsx`

### Phase 5: Webhook (Critical Path) ✅
- [x] Create `workers/email-worker.ts`
- [x] Create `workers/wrangler.toml` (ngrok URL configured)
- [x] Create `app/routes/api.webhook.email.ts`
- [x] Deploy worker
- [x] Configure Cloudflare Email Routing
- [x] Test: send email, see in database ✅

### Phase 6: Email Display ✅
- [x] Style email list (done in Phase 4)
- [x] Style email detail (done in Phase 4)
- [x] Mark as read functionality (done in Phase 4)

### Phase 7: Email Sending ✅
- [x] Create `app/lib/brevo.server.ts`
- [x] Create `app/routes/api.email.send.ts`
- [x] Add compose/reply UI

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

**Final step** — Test reply via Brevo.

Remaining task:
1. Add `BREVO_API_KEY` to `.env`
2. Reply to an email and verify it sends

When you complete a phase, update the checkboxes in this file and announce:

```
✅ Phase X complete. Moving to Phase Y.
```

---

## Progress Tracker

```
Phase 1: [x] Setup
Phase 2: [x] Database
Phase 3: [x] Auth
Phase 4: [x] Routes
Phase 5: [x] Webhook ✅
Phase 6: [x] Display
Phase 7: [x] Sending

Iteration: 5/15
Status: 3/4 EXIT CONDITIONS MET — Need BREVO_API_KEY for reply test
```

Update this tracker after each iteration.

---

*Let's get those emails flowing.*
