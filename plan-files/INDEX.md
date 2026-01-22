# Innbox Documentation Index

A self-hostable email receiving service. One domain. No friction.

## Quick Start

1. Read `01-overview/README.md` for architecture
2. Follow `13-implementation/PHASES.md` step by step
3. Verify with `14-testing/CHECKLIST.md`

## Documentation Structure

```
plan-files/
├── INDEX.md                    # This file
├── .env.example                # Environment template
│
├── 01-overview/
│   └── README.md               # Architecture & tech stack
│
├── 02-design/
│   └── DESIGN-SYSTEM.md        # Colors, typography, components
│
├── 03-database/
│   ├── SCHEMA.md               # Table definitions
│   └── schema.ts               # Drizzle schema
│
├── 04-dns-domains/
│   └── DNS-SETUP.md            # MX records, Cloudflare setup
│
├── 05-cloudflare-worker/
│   ├── WORKER.md               # Setup instructions
│   ├── email-worker.ts         # Worker source
│   └── wrangler.toml           # Wrangler config
│
├── 06-webhook/
│   └── WEBHOOK.md              # Inbound email endpoint
│
├── 07-outbound-email/
│   └── BREVO.md                # Sending emails via Brevo
│
├── 09-pwa-push/
│   └── PWA.md                  # Service worker, push notifications
│
├── 10-ui-components/
│   └── COMPONENTS.md           # UI component specs
│
├── 11-routes/
│   └── ROUTES.md               # Route implementations
│
├── 12-deployment/
│   └── DEPLOYMENT.md           # Vercel config
│
├── 13-implementation/
│   └── PHASES.md               # Step-by-step build guide
│
└── 14-testing/
    └── CHECKLIST.md            # Verification checklist
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Bun |
| Framework | React Router v7 |
| Database | Turso (SQLite) + Drizzle |
| File Storage | UploadThing |
| Email Inbound | Cloudflare Email Workers |
| Email Outbound | Brevo API |
| Push | Web Push API |
| Hosting | Vercel |

## Core Features

- **Single domain** — configured via `APP_DOMAIN` env var
- **Instant inboxes** — `anything@yourdomain.com` just works
- **Email receiving** — Cloudflare Worker → Webhook → Database
- **Email sending** — Brevo API for replies
- **Push notifications** — PWA on iOS/Android
- **Attachments** — stored via UploadThing

## Implementation Order

1. Project setup (React Router + deps)
2. Database (Turso + Drizzle)
3. UI components
4. Email components
5. Layout
6. Auth (simple login)
7. Core routes (inbox, email view)
8. Cloudflare Worker + Webhook
9. UploadThing
10. Brevo (sending)
11. PWA + Push
12. Deploy
