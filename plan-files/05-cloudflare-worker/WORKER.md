# Cloudflare Email Worker

The Email Worker receives emails via Cloudflare Email Routing, parses them with `postal-mime`, and POSTs to your Vercel webhook.

## Files

- `email-worker.ts` — Worker source code
- `wrangler.toml` — Wrangler configuration

## How It Works

```
Email arrives at Cloudflare
        │
        ▼
┌─────────────────────┐
│ Email Worker        │
│ - Parse with postal │
│ - Sign with HMAC    │
│ - POST to webhook   │
└─────────────────────┘
        │
        ▼
POST /api/webhook/email
(on Vercel)
```

## Deployment

### Prerequisites

```bash
# Install wrangler globally
bun add -g wrangler

# Login to Cloudflare
wrangler login
```

### Install dependencies

```bash
cd workers
bun init
bun add postal-mime
```

### Deploy

```bash
cd workers
wrangler deploy
```

### Set secrets

```bash
wrangler secret put WEBHOOK_SECRET
# Enter your WEBHOOK_SECRET value (same as in Vercel env)
```

## Configuration

### wrangler.toml

```toml
name = "innbox-email-worker"
main = "email-worker.ts"
compatibility_date = "2024-01-01"

[vars]
WEBHOOK_URL = "https://innbox.dev/api/webhook/email"

# WEBHOOK_SECRET is set via `wrangler secret put`
```

### Email Routing Setup

For each domain in Cloudflare:

1. Go to **Email** → **Email Routing**
2. Click **Routing rules** tab
3. Create rule:
   - **Catch-all**: `*@example.com`
   - **Action**: Send to Worker
   - **Worker**: `innbox-email-worker`

## Webhook Payload

The worker sends this JSON payload to your webhook:

```typescript
interface EmailPayload {
  messageId: string;
  from: {
    address: string;
    name?: string;
  };
  to: string;
  replyTo?: string;
  subject?: string;
  text?: string;
  html?: string;
  headers: Record<string, string>;
  attachments: Array<{
    filename: string;
    mimeType: string;
    content: string; // Base64 encoded
  }>;
  rawEmail: string; // Base64 encoded .eml
}
```

## Signature Verification

The worker signs the payload with HMAC-SHA256:

```typescript
// Worker side - signing
const signature = await sign(JSON.stringify(payload), env.WEBHOOK_SECRET);

// Sent as header
headers: {
  'X-Webhook-Signature': signature
}
```

The Vercel webhook verifies:

```typescript
// Webhook side - verification
const isValid = await verifySignature(body, signature, process.env.WEBHOOK_SECRET);
```

## Troubleshooting

### Check worker logs

```bash
wrangler tail innbox-email-worker
```

### Test locally

```bash
wrangler dev
```

### Common issues

**Worker not triggering:**
- Verify Email Routing is enabled for domain
- Check catch-all rule exists and points to worker
- Verify MX records point to Cloudflare

**Webhook failing:**
- Check WEBHOOK_URL is correct in wrangler.toml
- Verify WEBHOOK_SECRET matches between worker and Vercel
- Check Vercel function logs for errors

**Attachments missing:**
- postal-mime has size limits
- Very large attachments may timeout

## Full Source Code

See `email-worker.ts` in this directory.
