# Wiggum Ralph Loop

```
    ┌─────────────────────────────────────────────┐
    │  🚔 WIGGUM                                  │
    │                                             │
    │  "Uh, Chief? I found something!"            │
    │                        - Ralph Wiggum       │
    └─────────────────────────────────────────────╯
```

## Quick Start

**To start building, tell Claude:**

```
Read wiggum/RALPH.md and begin Phase 1
```

Or run `/ralph-loop` if available.

---

## Goal

**Get emails flowing as fast as possible.**

Single domain. No billing. No complexity. Just email.

---

## Source Documentation

| Document | Path |
|----------|------|
| **Master Index** | [plan-files/INDEX.md](../plan-files/INDEX.md) |
| **Implementation** | [plan-files/13-implementation/PHASES.md](../plan-files/13-implementation/PHASES.md) |

---

## Core Docs

| Topic | Source |
|-------|--------|
| Overview | [01-overview/README.md](../plan-files/01-overview/README.md) |
| Database | [03-database/SCHEMA.md](../plan-files/03-database/SCHEMA.md) |
| Schema Code | [03-database/schema.ts](../plan-files/03-database/schema.ts) |
| Cloudflare Worker | [05-cloudflare-worker/WORKER.md](../plan-files/05-cloudflare-worker/WORKER.md) |
| Webhook | [06-webhook/WEBHOOK.md](../plan-files/06-webhook/WEBHOOK.md) |
| Sending (Brevo) | [07-outbound-email/BREVO.md](../plan-files/07-outbound-email/BREVO.md) |

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Bun |
| Framework | React Router v7 |
| Database | Turso + Drizzle |
| Email In | Cloudflare Email Workers |
| Email Out | Brevo API |
| Hosting | Vercel |

---

## Fast Path to Email

1. **Database** — Turso + Drizzle schema
2. **Worker + Webhook** — receive emails
3. **Auth** — protect the inbox
4. **Routes** — view emails
5. **Display** — make it pretty
6. **Sending** — Brevo integration

---

## Wiggum Summaries

| Document | Description |
|----------|-------------|
| [architecture.md](./architecture.md) | System overview |
| [design.md](./design.md) | UI quick reference |

---

*"I'm helping!" - Ralph*
