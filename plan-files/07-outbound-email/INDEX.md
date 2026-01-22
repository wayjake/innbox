# 07 - Outbound Email (Brevo)

Send emails via Brevo Transactional API.

## Files

| File | Description |
|------|-------------|
| `BREVO.md` | Brevo setup, API client, send endpoint, components |

## Setup

1. Create Brevo account
2. Get API key from dashboard
3. Add `BREVO_API_KEY` to env
4. Verify sending domains (SPF + DKIM)

## API

```
POST /api/email/send
Body: { inboxId, to, subject, bodyText, inReplyToId? }
```

## Next

→ `../08-trial-system/` for trial logic
