# Implementation Phases

Fast path to sending and receiving emails.

**Goal:** Get emails flowing as quickly as possible.

---

## Phase 1: Project Setup

```
1. We already have React Router v7 project

2. Install dependencies:
   bun add drizzle-orm @libsql/client clsx tailwind-merge

   bun add -d drizzle-kit

3. Create app/lib/utils.ts:
   import { type ClassValue, clsx } from "clsx";
   import { twMerge } from "tailwind-merge";
   export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs));
   }

✓ Verify: bun run dev works
```

---

## Phase 2: Database

```
1. Copy db/schema.ts from ../03-database/schema.ts

2. Create app/lib/db.server.ts:
   import { drizzle } from 'drizzle-orm/libsql';
   import { createClient } from '@libsql/client';
   import * as schema from '../../db/schema';

   const client = createClient({
     url: process.env.TURSO_DATABASE_URL!,
     authToken: process.env.TURSO_AUTH_TOKEN!,
   });

   export const db = drizzle(client, { schema });

3. Create drizzle.config.ts:
   import type { Config } from 'drizzle-kit';

   export default {
     schema: './db/schema.ts',
     out: './db/migrations',
     driver: 'turso',
     dbCredentials: {
       url: process.env.TURSO_DATABASE_URL!,
       authToken: process.env.TURSO_AUTH_TOKEN!,
     },
   } satisfies Config;

4. Add to package.json:
   "db:generate": "drizzle-kit generate",
   "db:migrate": "drizzle-kit migrate",
   "db:studio": "drizzle-kit studio"

5. Generate and run migrations:
   bun run db:generate
   bun run db:migrate

✓ Verify: bun run db:studio shows tables
```

---

## Phase 3: Auth (Minimal)

```
1. Install session deps:
   bun add cookie-signature

2. Create app/lib/auth.server.ts:
   - hashPassword (Bun.password.hash)
   - verifyPassword (Bun.password.verify)
   - createSession (generate ID, store in sessions table)
   - getSession (from cookie)
   - getUser (from session)
   - logout (delete session)

3. Create app/routes/login.tsx:
   - Simple email + password form
   - Create session on success
   - Redirect to /inbox

4. Create app/routes/register.tsx:
   - Email + password + name form
   - Create user + session
   - Redirect to /inbox

✓ Verify: Can register and login
```

---

## Phase 4: Core Routes

```
1. Create app/routes/_app.tsx (layout):
   - Check for session
   - Redirect to /login if not authenticated
   - Simple sidebar with inbox list
   - Outlet for child routes

2. Create app/routes/_app.inbox._index.tsx:
   - List user's inboxes
   - "Create Inbox" button

3. Create app/routes/_app.inbox.new.tsx:
   - Form: local part input + @{APP_DOMAIN}
   - Create inbox on submit
   - Redirect to inbox view

4. Create app/routes/_app.inbox.$inboxId.tsx:
   - List emails in inbox
   - Click to view email

5. Create app/routes/_app.inbox.$inboxId.$emailId.tsx:
   - Show email detail
   - Mark as read
   - Reply button (for later)

✓ Verify: Can create inbox, see empty email list
```

---

## Phase 5: Cloudflare Worker + Webhook

```
THIS IS THE CRITICAL PATH TO RECEIVING EMAIL

1. Create workers/ directory

2. Create workers/email-worker.ts:
   - Parse incoming email with postal-mime
   - POST to webhook with HMAC signature
   - See ../05-cloudflare-worker/email-worker.ts

3. Create workers/wrangler.toml:
   name = "innbox-email-worker"
   main = "email-worker.ts"
   compatibility_date = "2024-01-01"

   [vars]
   WEBHOOK_URL = "https://your-app.vercel.app/api/webhook/email"

4. Deploy worker:
   cd workers
   bun add postal-mime
   wrangler deploy
   wrangler secret put WEBHOOK_SECRET

5. Create app/routes/api.webhook.email.ts:
   - Verify HMAC signature
   - Extract email data
   - Find or create inbox by local part
   - Store email in database
   - Return 200

6. Configure Cloudflare Email Routing:
   - Domain → Email → Email Routing
   - Catch-all → Send to Worker

✓ Verify: Send test email, see it in database
```

---

## Phase 6: Email Display

```
1. Update inbox route to show real emails

2. Style email list:
   - Sender name/address
   - Subject
   - Preview text
   - Time received
   - Unread indicator

3. Style email detail:
   - From, To, Subject, Date
   - HTML body (sanitized)
   - Plain text fallback

✓ Verify: Emails display correctly
```

---

## Phase 7: Attachments (Optional)

```
1. Create UploadThing account

2. Add to .env:
   UPLOADTHING_SECRET=...
   UPLOADTHING_APP_ID=...

3. Update webhook to upload attachments

4. Display attachments in email detail

✓ Verify: Attachments save and display
```

---

## Phase 8: Email Sending

```
1. Create Brevo account, get API key

2. Add to .env:
   BREVO_API_KEY=...

3. Create app/lib/brevo.server.ts:
   async function sendEmail({ from, to, subject, html, text })

4. Create app/routes/api.email.send.ts:
   - Validate sender owns inbox
   - Send via Brevo
   - Store in sent_emails

5. Add compose/reply UI to inbox

✓ Verify: Can send and receive replies
```

---

## Phase 9: Push Notifications (Optional)

```
1. Generate VAPID keys:
   bunx web-push generate-vapid-keys

2. Create PWA manifest + service worker

3. Trigger push on new email

✓ Verify: Push notifications work
```

---

## Phase 10: Deploy

```
1. Push to GitHub

2. Connect to Vercel

3. Add environment variables

4. Run migrations

5. Configure DNS for email domain

✓ Verify: Full flow works in production
```

---

## Minimum Viable Path

For the absolute fastest path to email, do phases in this order:

1. **Phase 2** — Database (need to store emails)
2. **Phase 5** — Worker + Webhook (receive emails)
3. **Phase 3** — Auth (protect the inbox)
4. **Phase 4** — Routes (view emails)
5. **Phase 6** — Email Display (make it pretty)

Everything else can come after.
