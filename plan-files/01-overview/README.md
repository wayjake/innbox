# Innbox — Project Overview

A self-hostable email service for a single domain. Receive and send emails with push notifications.

## Core Concept

```
┌─────────────────────────────────────────────────────────────┐
│  anything@yourdomain.com → your inbox                       │
│                                                             │
│  No signup. No inbox creation. Just works.                  │
│  Configure APP_DOMAIN and start receiving.                  │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Bun | Fast JS runtime |
| Framework | React Router v7 | Full-stack React |
| Database | Turso (SQLite) | Edge-ready SQLite |
| ORM | Drizzle | Type-safe queries |
| File Storage | UploadThing | Attachment storage |
| Email Inbound | Cloudflare Email Workers | SMTP → Webhook |
| Email Outbound | Brevo | Sending API |
| Push | Web Push API | PWA notifications |
| Hosting | Vercel | Serverless deployment |

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      EMAIL RECEIVING                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  sender@gmail.com                                           │
│        │                                                    │
│        ▼                                                    │
│  ┌──────────────┐    MX lookup    ┌────────────────────┐   │
│  │ Gmail Server │ ──────────────► │ Cloudflare MX      │   │
│  └──────────────┘                 └────────────────────┘   │
│                                          │                  │
│                                          ▼                  │
│                                 ┌────────────────────┐     │
│                                 │ Cloudflare Email   │     │
│                                 │ Worker             │     │
│                                 └────────────────────┘     │
│                                          │                  │
│                                 Parse + POST to webhook     │
│                                          │                  │
│                                          ▼                  │
│                                 ┌────────────────────┐     │
│                                 │ Innbox Webhook     │     │
│                                 │ /api/webhook/email │     │
│                                 └────────────────────┘     │
│                                          │                  │
│                      ┌───────────────────┼───────────────┐ │
│                      │                   │               │ │
│                      ▼                   ▼               ▼ │
│              ┌────────────┐     ┌────────────┐   ┌────────┐│
│              │ Store in   │     │ Upload     │   │ Send   ││
│              │ Turso      │     │ attachments│   │ Push   ││
│              └────────────┘     └────────────┘   └────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      EMAIL SENDING                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User clicks "Reply"                                        │
│        │                                                    │
│        ▼                                                    │
│  ┌────────────────────┐                                    │
│  │ POST /api/send     │                                    │
│  └────────────────────┘                                    │
│        │                                                    │
│        ▼                                                    │
│  ┌────────────────────┐     ┌────────────────────┐         │
│  │ Brevo API          │────▶│ Recipient inbox    │         │
│  └────────────────────┘     └────────────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
innbox/
├── app/
│   ├── components/
│   │   ├── ui/              # Button, Input, Card, etc.
│   │   ├── email/           # EmailList, EmailDetail
│   │   └── layout/          # Sidebar, AppShell
│   ├── lib/
│   │   ├── db.server.ts     # Turso/Drizzle client
│   │   ├── auth.server.ts   # Session management
│   │   ├── push.server.ts   # Web Push
│   │   ├── brevo.server.ts  # Email sending
│   │   └── utils.ts         # cn() helper
│   ├── routes/              # All route files
│   └── root.tsx
├── db/
│   ├── schema.ts            # Drizzle schema
│   └── migrations/
├── workers/
│   ├── email-worker.ts      # Cloudflare Worker
│   └── wrangler.toml
├── public/
│   ├── manifest.json        # PWA manifest
│   └── sw.js                # Service worker
└── .env
```

## Environment Variables

```env
# App
APP_NAME=innbox
APP_DOMAIN=innbox.dev

# Database
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...

# Files
UPLOADTHING_SECRET=...
UPLOADTHING_APP_ID=...

# Email
WEBHOOK_SECRET=...          # Cloudflare ↔ Vercel signing
BREVO_API_KEY=...           # Outbound email

# Push
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# Auth
SESSION_SECRET=...
```

## Next Steps

1. **Database Schema** → `../03-database/SCHEMA.md`
2. **Implementation** → `../13-implementation/PHASES.md`
