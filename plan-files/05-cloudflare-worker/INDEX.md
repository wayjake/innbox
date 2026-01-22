# 05 - Cloudflare Email Worker

Receives emails via Cloudflare Email Routing and forwards to webhook.

## Files

| File | Description |
|------|-------------|
| `WORKER.md` | Setup instructions, deployment, troubleshooting |
| `email-worker.ts` | Worker source code (copy to `workers/`) |
| `wrangler.toml` | Wrangler configuration (copy to `workers/`) |

## Deployment

```bash
cd workers
bun add postal-mime
wrangler deploy
wrangler secret put WEBHOOK_SECRET
```

## Flow

```
Email → Cloudflare MX → Email Worker → POST webhook → Vercel
```

## Next

→ `../06-webhook/` for webhook endpoint
