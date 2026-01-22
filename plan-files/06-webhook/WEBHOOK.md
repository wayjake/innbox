# Email Webhook Endpoint

Receives parsed emails from Cloudflare Email Worker and stores them in the database.

## Endpoint

```
POST /api/webhook/email
```

## Authentication

HMAC-SHA256 signature in `X-Webhook-Signature` header.

## Flow

```
1. Verify signature
2. Check domain is authorized (verified + active)
3. Find inbox for recipient address
4. Check user's trial status
5. Determine email visibility
6. Upload raw .eml to UploadThing
7. Create email record
8. Update user's email counts
9. Process attachments
10. Send push notification (visible emails only)
```

## Request Payload

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
    content: string; // Base64
  }>;
  rawEmail: string; // Base64
}
```

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Email processed successfully |
| 400 | Invalid recipient address |
| 401 | Invalid signature |
| 403 | Domain not authorized / Account deactivated / Trial limit |
| 404 | Inbox not found |
| 500 | Internal error |

## Full Implementation

```typescript
// app/routes/api.webhook.email.ts
import type { ActionFunctionArgs } from 'react-router';
import { db } from '~/db/client';
import { domains, inboxes, emails, attachments, users } from '~/db/schema';
import { eq, and } from 'drizzle-orm';
import { uploadFiles } from '~/lib/uploadthing.server';
import { sendPushNotification } from '~/lib/push.server';
import { 
  TRIAL_VISIBLE_LIMIT, 
  TRIAL_CAPTURE_LIMIT, 
  ACCOUNT_STATUS 
} from '~/db/schema';

// Verify webhook signature from Cloudflare Worker
async function verifySignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  const signatureBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
  return crypto.subtle.verify('HMAC', key, signatureBuffer, encoder.encode(payload));
}

export async function action({ request }: ActionFunctionArgs) {
  // Verify webhook signature
  const signature = request.headers.get('X-Webhook-Signature');
  const body = await request.text();
  
  const isValid = await verifySignature(body, signature, process.env.WEBHOOK_SECRET!);
  if (!isValid) {
    console.error('Invalid webhook signature');
    return new Response('Invalid signature', { status: 401 });
  }

  const payload = JSON.parse(body);
  
  try {
    // Extract domain from recipient address
    const toAddress = payload.to.toLowerCase();
    const [localPart, domainName] = toAddress.split('@');
    
    if (!domainName) {
      return new Response('Invalid recipient address', { status: 400 });
    }
    
    // Check if domain is authorized
    const domain = await db
      .select()
      .from(domains)
      .where(
        and(
          eq(domains.domain, domainName),
          eq(domains.isVerified, true),
          eq(domains.isActive, true)
        )
      )
      .get();
    
    if (!domain) {
      console.log(`Rejected email for unauthorized domain: ${domainName}`);
      return new Response('Domain not authorized', { status: 403 });
    }
    
    // Find inbox and user
    const inbox = await db
      .select({
        inbox: inboxes,
        user: users,
      })
      .from(inboxes)
      .innerJoin(users, eq(inboxes.userId, users.id))
      .where(
        and(
          eq(inboxes.address, toAddress),
          eq(inboxes.isActive, true)
        )
      )
      .get();

    if (!inbox) {
      console.log(`No inbox found for: ${toAddress}`);
      return new Response('Inbox not found', { status: 404 });
    }

    const user = inbox.user;

    // Check trial status
    if (user.accountStatus === ACCOUNT_STATUS.DEACTIVATED) {
      return new Response('Account deactivated', { status: 403 });
    }
    
    if (user.accountStatus === ACCOUNT_STATUS.TRIAL && 
        user.totalEmailCount >= TRIAL_CAPTURE_LIMIT) {
      return new Response('Trial limit reached', { status: 403 });
    }
    
    // Determine visibility for trial users
    const isVisible = user.accountStatus === ACCOUNT_STATUS.ACTIVE || 
                      user.visibleEmailCount < TRIAL_VISIBLE_LIMIT;

    // Upload raw email to UploadThing
    const rawEmailBuffer = Uint8Array.from(atob(payload.rawEmail), c => c.charCodeAt(0));
    const rawEmailFile = new File([rawEmailBuffer], `${payload.messageId}.eml`, {
      type: 'message/rfc822',
    });
    const [rawEmailUpload] = await uploadFiles([rawEmailFile]);

    // Create email record
    const [newEmail] = await db
      .insert(emails)
      .values({
        inboxId: inbox.inbox.id,
        messageId: payload.messageId,
        fromAddress: payload.from.address,
        fromName: payload.from.name,
        toAddress: payload.to,
        replyTo: payload.replyTo,
        subject: payload.subject,
        bodyText: payload.text,
        bodyHtml: payload.html,
        rawHeaders: JSON.stringify(payload.headers),
        rawEmailKey: rawEmailUpload.key,
        isVisible,
      })
      .returning();

    // Update user's email counts
    const newTotalCount = user.totalEmailCount + 1;
    const newVisibleCount = isVisible ? user.visibleEmailCount + 1 : user.visibleEmailCount;

    await db
      .update(users)
      .set({
        totalEmailCount: newTotalCount,
        visibleEmailCount: newVisibleCount,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, user.id));

    // Check if user just hit the capture limit (deactivate account)
    if (newTotalCount >= TRIAL_CAPTURE_LIMIT && user.accountStatus === ACCOUNT_STATUS.TRIAL) {
      const now = new Date();
      const purgeDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      await db
        .update(users)
        .set({
          accountStatus: ACCOUNT_STATUS.DEACTIVATED,
          trialLimitReachedAt: now.toISOString(),
          deactivatedAt: now.toISOString(),
          scheduledPurgeAt: purgeDate.toISOString(),
        })
        .where(eq(users.id, user.id));

      await db
        .update(inboxes)
        .set({ isActive: false })
        .where(eq(inboxes.userId, user.id));
    }

    // Process attachments
    for (const att of payload.attachments || []) {
      const buffer = Uint8Array.from(atob(att.content), c => c.charCodeAt(0));
      const file = new File([buffer], att.filename, { type: att.mimeType });
      const [upload] = await uploadFiles([file]);

      await db.insert(attachments).values({
        emailId: newEmail.id,
        filename: att.filename,
        mimeType: att.mimeType,
        sizeBytes: buffer.length,
        uploadthingKey: upload.key,
        uploadthingUrl: upload.url,
      });
    }

    // Only send push notification for visible emails
    if (isVisible) {
      await sendPushNotification(user.id, {
        title: payload.from.name || payload.from.address,
        body: payload.subject || '(No subject)',
        data: { emailId: newEmail.id, inboxId: inbox.inbox.id },
      });
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
}
```

## Trial Logic Summary

| User Status | Total Count | Visible Count | Action |
|-------------|-------------|---------------|--------|
| trial | < 3300 | < 300 | Accept, visible |
| trial | < 3300 | >= 300 | Accept, hidden |
| trial | >= 3300 | any | Reject, deactivate |
| active | any | any | Accept, visible |
| deactivated | any | any | Reject |

## Testing

```bash
# Test with curl (won't have valid signature, but good for format testing)
curl -X POST https://innbox.dev/api/webhook/email \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: invalid" \
  -d '{
    "messageId": "test-123",
    "from": {"address": "test@example.com"},
    "to": "inbox@yourdomain.com",
    "subject": "Test Email"
  }'
```
