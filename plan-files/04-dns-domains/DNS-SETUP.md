# DNS & Domain Configuration

## Overview

Each domain that receives emails through Innbox needs:
1. **MX records** pointing to Cloudflare
2. **SPF record** authorizing Cloudflare and Brevo
3. **Innbox verification** TXT record
4. **Cloudflare Email Routing** configured

## DNS Records

### MX Records (Required for receiving)

Point your domain's MX records to Cloudflare's email routing servers:

```dns
example.com.         IN  MX  10  route1.mx.cloudflare.net.
example.com.         IN  MX  20  route2.mx.cloudflare.net.
example.com.         IN  MX  30  route3.mx.cloudflare.net.
```

### SPF Record (Required)

Authorize both Cloudflare (receiving) and Brevo (sending):

```dns
example.com.         IN  TXT "v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com ~all"
```

### DKIM Record (Required for sending)

Get this from Brevo dashboard after adding your domain:

```dns
mail._domainkey.example.com.  IN  TXT "k=rsa; p=MIGf..."
```

### DMARC Record (Recommended)

```dns
_dmarc.example.com.  IN  TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"
```

### Innbox Verification Record

When adding a domain in Innbox, you'll be given a verification token:

```dns
_innbox.example.com.  IN  TXT "innbox-verify=abc123def456"
```

## Cloudflare Email Routing Setup

### Per Domain Configuration

1. **Add domain to Cloudflare**
   - Can use CNAME setup if not transferring nameservers
   - Or full nameserver transfer

2. **Enable Email Routing**
   - Go to Cloudflare Dashboard → Email → Email Routing
   - Click "Enable Email Routing"

3. **Create catch-all rule**
   - Destination address: `*@example.com`
   - Action: "Send to a Worker"
   - Select: `innbox-email-worker`

4. **Verify MX records**
   - Cloudflare will show if MX records are correctly configured

## Domain Verification Flow

### 1. Admin adds domain in Innbox

```
POST /api/domains
{ "domain": "example.com" }
```

Response:
```json
{
  "id": "uuid",
  "domain": "example.com",
  "verificationToken": "abc123def456",
  "isVerified": false,
  "isActive": false,
  "dnsRecord": {
    "type": "TXT",
    "name": "_innbox.example.com",
    "value": "innbox-verify=abc123def456"
  }
}
```

### 2. Admin adds TXT record to DNS

```dns
_innbox.example.com.  IN  TXT "innbox-verify=abc123def456"
```

### 3. Admin clicks "Verify" in Innbox

```
POST /api/domains/verify
{ "domainId": "uuid" }
```

### 4. Innbox checks DNS

```typescript
// app/lib/domains.server.ts
import { Resolver } from 'dns/promises';

const resolver = new Resolver();

export async function verifyDomain(domain: string, expectedToken: string): Promise<boolean> {
  try {
    const records = await resolver.resolveTxt(`_innbox.${domain}`);
    const flatRecords = records.flat();
    
    return flatRecords.some(record => 
      record === `innbox-verify=${expectedToken}`
    );
  } catch (error) {
    // DNS lookup failed - record doesn't exist
    return false;
  }
}
```

### 5. Domain marked verified

```typescript
await db
  .update(domains)
  .set({
    isVerified: true,
    isActive: true,
    verifiedAt: new Date().toISOString(),
  })
  .where(eq(domains.id, domainId));
```

## Domain Verification API

```typescript
// app/routes/api.domains.verify.ts
import type { ActionFunctionArgs } from 'react-router';
import { db } from '~/db/client';
import { domains } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '~/lib/auth.server';
import { verifyDomain } from '~/lib/domains.server';

export async function action({ request }: ActionFunctionArgs) {
  await requireAdmin(request);
  
  const { domainId } = await request.json();
  
  const domain = await db
    .select()
    .from(domains)
    .where(eq(domains.id, domainId))
    .get();
  
  if (!domain) {
    return Response.json({ error: 'Domain not found' }, { status: 404 });
  }
  
  if (domain.isVerified) {
    return Response.json({ error: 'Domain already verified' }, { status: 400 });
  }
  
  const isValid = await verifyDomain(domain.domain, domain.verificationToken);
  
  if (!isValid) {
    return Response.json({ 
      error: 'Verification failed',
      message: 'TXT record not found. Please add the DNS record and try again.',
    }, { status: 400 });
  }
  
  await db
    .update(domains)
    .set({
      isVerified: true,
      isActive: true,
      verifiedAt: new Date().toISOString(),
    })
    .where(eq(domains.id, domainId));
  
  return Response.json({ success: true });
}
```

## Application Domain

Your main Innbox application domain (not for receiving email):

```dns
; Point to Vercel
innbox.dev.          IN  CNAME  cname.vercel-dns.com.

; Or with www
www.innbox.dev.      IN  CNAME  cname.vercel-dns.com.
```

## Brevo Domain Setup

For sending emails, you also need to verify domains in Brevo:

1. Go to Brevo Dashboard → Senders & IP → Domains
2. Click "Add a domain"
3. Enter your domain (e.g., `example.com`)
4. Add the DNS records Brevo provides:
   - SPF (add `include:spf.brevo.com` to existing)
   - DKIM (new TXT record)
5. Click "Verify" in Brevo

## Troubleshooting

### MX records not propagating

- DNS can take up to 48 hours to propagate
- Use `dig MX example.com` to check current records
- Cloudflare shows status in Email Routing dashboard

### Verification failing

- Ensure TXT record has exact format: `innbox-verify=TOKEN`
- Check for typos in the token
- Use `dig TXT _innbox.example.com` to verify

### Emails not arriving

1. Check MX records are correct
2. Verify domain is marked "Active" in Innbox
3. Check Cloudflare Email Worker logs
4. Verify webhook is receiving requests

### Sent emails going to spam

1. Verify SPF includes Brevo
2. Verify DKIM is set up in Brevo
3. Set up DMARC policy
4. Build sender reputation gradually
