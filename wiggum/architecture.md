# Architecture

```
    ╔═══════════════════════════════════════════╗
    ║  🏗️  SYSTEM ARCHITECTURE                  ║
    ╚═══════════════════════════════════════════╝
```

> Full details: [plan-files/01-overview/README.md](../plan-files/01-overview/README.md)

## The Big Picture

```
  ┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
  │  Cloudflare  │     │     Vercel       │     │    Turso     │
  │  Email       │────▶│  /api/webhook    │────▶│   SQLite     │
  │  Worker      │     │                  │     │              │
  └──────────────┘     └──────────────────┘     └──────────────┘
```

## Email Flow

**Receiving:**
1. Email hits Cloudflare MX
2. Cloudflare Worker parses + POSTs to webhook
3. Webhook stores in Turso
4. User sees email in inbox

**Sending:**
1. User composes reply
2. POST to /api/send
3. Brevo API delivers email

## Single Domain Model

Domain configured via `APP_DOMAIN` env var.

```
localPart + "@" + APP_DOMAIN = email address
```

No domains table needed. Simple.

## Tech Stack

| Layer | Tech |
|-------|------|
| Runtime | Bun |
| Framework | React Router v7 |
| Database | Turso + Drizzle |
| Email In | Cloudflare Workers |
| Email Out | Brevo API |
| Hosting | Vercel |

## Deep Dives

- [Database Schema](../plan-files/03-database/SCHEMA.md)
- [Cloudflare Worker](../plan-files/05-cloudflare-worker/WORKER.md)
- [Webhook](../plan-files/06-webhook/WEBHOOK.md)
- [Brevo](../plan-files/07-outbound-email/BREVO.md)

---

*Boxes and arrows. That's all architecture really is.*
