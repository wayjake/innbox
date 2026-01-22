# 06 - Email Webhook

Receives parsed emails from Cloudflare Worker.

## Files

| File | Description |
|------|-------------|
| `WEBHOOK.md` | Full endpoint implementation, trial logic |

## Endpoint

```
POST /api/webhook/email
Header: X-Webhook-Signature (HMAC-SHA256)
```

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 401 | Invalid signature |
| 403 | Domain not authorized |
| 404 | Inbox not found |

## Next

→ `../07-outbound-email/` for sending emails
