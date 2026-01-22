# Deployment

Deploy Innbox to Vercel with Turso database.

## Prerequisites

- Vercel account
- Turso account
- Cloudflare account (for email routing)
- Brevo account (for sending)
- UploadThing account
- GitHub repo

## Vercel Configuration

### vercel.json

```json
{
  "buildCommand": "bun run build",
  "installCommand": "bun install",
  "framework": null,
  "outputDirectory": "build/client",
  "functions": {
    "build/server/index.js": {
      "runtime": "nodejs20.x",
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### Build Settings

In Vercel project settings:
- **Build Command:** `bun run build`
- **Output Directory:** `build/client`
- **Install Command:** `bun install`
- **Node.js Version:** 20.x

## Environment Variables

Add in Vercel Dashboard → Settings → Environment Variables:

```
# App
APP_NAME=innbox
APP_DOMAIN=innbox.dev
APP_URL=https://innbox.dev

# Database
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-turso-token

# File Storage
UPLOADTHING_SECRET=sk_live_xxx
UPLOADTHING_APP_ID=your-app-id

# Email
WEBHOOK_SECRET=your-webhook-secret-32-chars-min
BREVO_API_KEY=xkeysib-xxx

# Push Notifications
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_CONTACT_EMAIL=admin@innbox.dev

# Security
SESSION_SECRET=your-session-secret-32-chars-min
CRON_SECRET=your-cron-secret-32-chars-min
```

## CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy Innbox

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Run migrations
        run: bun run db:migrate
        env:
          TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}
          TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### GitHub Secrets

Add to repo Settings → Secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

## Database Setup (Turso)

### Create Database

```bash
# Install Turso CLI
brew install tursodatabase/tap/turso

# Login
turso auth login

# Create database
turso db create innbox

# Get connection info
turso db show innbox --url
turso db tokens create innbox
```

### Run Migrations

```bash
# Local
bun run db:migrate

# Or in CI
TURSO_DATABASE_URL=xxx TURSO_AUTH_TOKEN=xxx bun run db:migrate
```

## Cloudflare Worker Deployment

```bash
# Navigate to workers directory
cd workers

# Install dependencies
bun install

# Deploy worker
wrangler deploy

# Set webhook secret
wrangler secret put WEBHOOK_SECRET
```

Update `wrangler.toml` with your production URL:
```toml
[vars]
WEBHOOK_URL = "https://innbox.dev/api/webhook/email"
```

## Domain Setup

### Application Domain

1. Add domain to Vercel project
2. Configure DNS:
   ```dns
   innbox.dev.     IN  CNAME  cname.vercel-dns.com.
   www.innbox.dev. IN  CNAME  cname.vercel-dns.com.
   ```

### Email Domains

For each domain receiving email:

1. Add to Cloudflare
2. Configure MX records
3. Enable Email Routing
4. Create catch-all → Worker rule
5. Add to Innbox admin panel
6. Verify TXT record

See `../04-dns-domains/DNS-SETUP.md`

## First Admin User

After deployment, create the first admin user:

```bash
# Using Turso CLI
turso db shell innbox

# Run SQL
UPDATE users SET is_admin = 1 WHERE email = 'your@email.com';
```

## Health Checks

### Verify Deployment

1. **App loads:** `https://innbox.dev`
2. **Can register:** Create new account
3. **Can login:** Sign in
4. **Admin access:** `/admin/domains` loads

### Verify Email Flow

1. Add domain in admin
2. Verify DNS record
3. Create inbox
4. Send test email
5. Check email appears in inbox

### Verify Push Notifications

1. Install as PWA on iOS
2. Accept notification permission
3. Send test email
4. Notification should appear

## Monitoring

### Vercel Logs

- Function logs: Vercel Dashboard → Logs
- Cron logs: Vercel Dashboard → Cron Jobs

### Cloudflare Logs

```bash
wrangler tail innbox-email-worker
```

### Error Tracking (Optional)

Add Sentry or similar:

```bash
bun add @sentry/remix
```

## Scaling Considerations

### Vercel

- Default: 10 concurrent executions
- Increase: Upgrade Vercel plan

### Turso

- Default: 500 rows/second
- Increase: Turso paid plan

### UploadThing

- Default: 2GB storage
- Increase: UploadThing paid plan

### Cloudflare Workers

- Default: 100,000 requests/day
- Increase: Workers paid plan

## Rollback

### Vercel

```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote <deployment-url>
```

### Database

Keep migration backups and test rollback procedures.
