# 03 - Database

Turso (SQLite) with Drizzle ORM.

## Files

| File | Description |
|------|-------------|
| `SCHEMA.md` | Table definitions, relationships, common queries |
| `schema.ts` | Complete Drizzle schema (copy to `db/schema.ts`) |

## Tables

- `users` — accounts with trial tracking
- `sessions` — auth sessions
- `domains` — authorized email domains
- `inboxes` — user email inboxes
- `emails` — received emails
- `attachments` — email attachments
- `sent_emails` — outbound emails
- `api_keys` — API access tokens

## Commands

```bash
bun run db:generate  # Generate migration
bun run db:migrate   # Apply migration
bun run db:studio    # Open Drizzle Studio
```

## Next

→ `../04-dns-domains/` for DNS setup
