# Innbox Database Schema

Database: **Turso** (SQLite at the edge)
ORM: **Drizzle**

## Tables Overview

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `sessions` | Authentication sessions |
| `inboxes` | Email inboxes (localPart@APP_DOMAIN) |
| `emails` | Received emails |
| `attachments` | Email attachments |
| `sent_emails` | Outbound emails |

## Entity Relationship

```
users
  │
  ├─── sessions (1:N)
  │
  └─── inboxes (1:N)
          │
          ├─── emails (1:N)
          │       │
          │       └─── attachments (1:N)
          │
          └─── sent_emails (1:N)
```

## Single Domain Model

The domain is configured via `APP_DOMAIN` environment variable. No domains table needed.

```
inbox.localPart + "@" + APP_DOMAIN = full email address
```

Example: if `APP_DOMAIN=innbox.dev` and `localPart=jake`, the address is `jake@innbox.dev`.

## Table Definitions

### users

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  push_subscription TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);
```

### sessions

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
```

### inboxes

```sql
CREATE TABLE inboxes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_part TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_inboxes_user ON inboxes(user_id);
CREATE INDEX idx_inboxes_local_part ON inboxes(local_part);
```

### emails

```sql
CREATE TABLE emails (
  id TEXT PRIMARY KEY,
  inbox_id TEXT NOT NULL REFERENCES inboxes(id) ON DELETE CASCADE,

  message_id TEXT,
  from_address TEXT NOT NULL,
  from_name TEXT,
  to_address TEXT NOT NULL,
  reply_to TEXT,
  subject TEXT,

  body_text TEXT,
  body_html TEXT,
  raw_headers TEXT,
  raw_email_key TEXT,

  is_read INTEGER DEFAULT 0,
  is_starred INTEGER DEFAULT 0,

  received_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_emails_inbox ON emails(inbox_id);
CREATE INDEX idx_emails_received ON emails(received_at DESC);
CREATE INDEX idx_emails_from ON emails(from_address);
```

### attachments

```sql
CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  email_id TEXT NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploadthing_key TEXT NOT NULL,
  uploadthing_url TEXT NOT NULL,
  content_id TEXT,
  is_inline INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_attachments_email ON attachments(email_id);
```

### sent_emails

```sql
CREATE TABLE sent_emails (
  id TEXT PRIMARY KEY,
  inbox_id TEXT NOT NULL REFERENCES inboxes(id) ON DELETE CASCADE,
  in_reply_to_id TEXT REFERENCES emails(id) ON DELETE SET NULL,

  to_addresses TEXT NOT NULL,
  cc_addresses TEXT,
  bcc_addresses TEXT,

  subject TEXT,
  body_text TEXT,
  body_html TEXT,

  brevo_message_id TEXT,
  status TEXT DEFAULT 'sent',

  sent_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_sent_emails_inbox ON sent_emails(inbox_id);
```

## Drizzle Client Setup

```typescript
// app/lib/db.server.ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '../../db/schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });
```

## Drizzle Config

```typescript
// drizzle.config.ts
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
```

## Package Scripts

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
}
```

## Common Queries

### Find inbox by email address

```typescript
const localPart = emailAddress.split('@')[0];
const inbox = await db
  .select()
  .from(inboxes)
  .where(eq(inboxes.localPart, localPart))
  .get();
```

### Get emails for inbox

```typescript
const emailList = await db
  .select()
  .from(emails)
  .where(eq(emails.inboxId, inboxId))
  .orderBy(desc(emails.receivedAt))
  .limit(50);
```

### Get user's inboxes

```typescript
const userInboxes = await db
  .select()
  .from(inboxes)
  .where(eq(inboxes.userId, userId));
```
