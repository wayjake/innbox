# Outbound Email (Brevo)

Send emails from user inboxes using the Brevo Transactional API.

## Setup

### 1. Create Brevo Account

Sign up at https://www.brevo.com

### 2. Get API Key

1. Go to SMTP & API → API Keys
2. Click "Generate a new API key"
3. Copy key and add to `.env` as `BREVO_API_KEY`

### 3. Verify Sending Domains

For each domain users will send from:

1. Go to Senders & IP → Domains
2. Click "Add a domain"
3. Add required DNS records (see `../04-dns-domains/DNS-SETUP.md`)
4. Verify in Brevo

## Brevo Client

```typescript
// app/lib/brevo.server.ts

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface SendEmailOptions {
  from: {
    email: string;
    name?: string;
  };
  to: Array<{
    email: string;
    name?: string;
  }>;
  subject: string;
  textContent?: string;
  htmlContent?: string;
  replyTo?: {
    email: string;
    name?: string;
  };
  headers?: Record<string, string>;
  attachments?: Array<{
    name: string;
    content: string; // Base64 encoded
    contentType?: string;
  }>;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  
  if (!apiKey) {
    console.error('BREVO_API_KEY not configured');
    return { success: false, error: 'Email sending not configured' };
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: options.from,
        to: options.to,
        subject: options.subject,
        textContent: options.textContent,
        htmlContent: options.htmlContent,
        replyTo: options.replyTo,
        headers: options.headers,
        attachment: options.attachments,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Brevo API error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send email' 
      };
    }

    const result = await response.json();
    return { 
      success: true, 
      messageId: result.messageId 
    };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
```

## Send Email API Endpoint

```typescript
// app/routes/api.email.send.ts
import type { ActionFunctionArgs } from 'react-router';
import { db } from '~/db/client';
import { inboxes, sentEmails, emails, users, domains } from '~/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireUser } from '~/lib/auth.server';
import { sendEmail } from '~/lib/brevo.server';
import { ACCOUNT_STATUS } from '~/db/schema';

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  
  // Check if user can send (not deactivated)
  if (user.accountStatus === ACCOUNT_STATUS.DEACTIVATED) {
    return Response.json(
      { error: 'Account deactivated' },
      { status: 403 }
    );
  }
  
  const formData = await request.formData();
  const inboxId = formData.get('inboxId') as string;
  const to = formData.get('to') as string; // Comma-separated
  const cc = formData.get('cc') as string | null;
  const bcc = formData.get('bcc') as string | null;
  const subject = formData.get('subject') as string;
  const bodyText = formData.get('bodyText') as string;
  const bodyHtml = formData.get('bodyHtml') as string | null;
  const inReplyToId = formData.get('inReplyToId') as string | null;
  
  if (!inboxId || !to || !subject) {
    return Response.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }
  
  // Verify user owns this inbox and domain is verified
  const inbox = await db
    .select({
      inbox: inboxes,
      domain: domains,
    })
    .from(inboxes)
    .innerJoin(domains, eq(inboxes.domainId, domains.id))
    .where(
      and(
        eq(inboxes.id, inboxId),
        eq(inboxes.userId, user.id),
        eq(inboxes.isActive, true)
      )
    )
    .get();
  
  if (!inbox) {
    return Response.json(
      { error: 'Inbox not found' },
      { status: 404 }
    );
  }
  
  if (!inbox.domain.isVerified || !inbox.domain.isActive) {
    return Response.json(
      { error: 'Domain not verified for sending' },
      { status: 403 }
    );
  }
  
  // Parse recipients
  const parseRecipients = (str: string | null) => {
    if (!str) return [];
    return str.split(',').map(email => ({ email: email.trim() })).filter(r => r.email);
  };
  
  const toRecipients = parseRecipients(to);
  const ccRecipients = parseRecipients(cc);
  const bccRecipients = parseRecipients(bcc);
  
  if (toRecipients.length === 0) {
    return Response.json(
      { error: 'At least one recipient required' },
      { status: 400 }
    );
  }
  
  // Get reply-to headers if this is a reply
  let headers: Record<string, string> = {};
  if (inReplyToId) {
    const originalEmail = await db
      .select()
      .from(emails)
      .where(eq(emails.id, inReplyToId))
      .get();
    
    if (originalEmail?.messageId) {
      headers['In-Reply-To'] = originalEmail.messageId;
      headers['References'] = originalEmail.messageId;
    }
  }
  
  // Send via Brevo
  const result = await sendEmail({
    from: {
      email: inbox.inbox.address,
      name: inbox.inbox.name || undefined,
    },
    to: toRecipients,
    subject,
    textContent: bodyText,
    htmlContent: bodyHtml || undefined,
    replyTo: {
      email: inbox.inbox.address,
    },
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });
  
  if (!result.success) {
    return Response.json(
      { error: result.error || 'Failed to send email' },
      { status: 500 }
    );
  }
  
  // Store sent email record
  const [sentEmail] = await db
    .insert(sentEmails)
    .values({
      inboxId,
      inReplyToId,
      toAddresses: JSON.stringify(toRecipients),
      ccAddresses: ccRecipients.length > 0 ? JSON.stringify(ccRecipients) : null,
      bccAddresses: bccRecipients.length > 0 ? JSON.stringify(bccRecipients) : null,
      subject,
      bodyText,
      bodyHtml,
      brevoMessageId: result.messageId,
      status: 'sent',
    })
    .returning();
  
  return Response.json({ 
    success: true, 
    sentEmailId: sentEmail.id,
    messageId: result.messageId,
  });
}
```

## Components

### Compose Email Modal

See `../10-ui-components/email/compose-email.tsx`

### Sent List

See `../10-ui-components/email/sent-list.tsx`

## Reply Threading

When replying to an email, include headers for proper threading:

```typescript
headers: {
  'In-Reply-To': originalEmail.messageId,
  'References': originalEmail.messageId,
}
```

This ensures email clients group replies correctly.

## Brevo API Reference

### Send Transactional Email

```
POST https://api.brevo.com/v3/smtp/email

Headers:
  api-key: your-api-key
  content-type: application/json

Body:
{
  "sender": { "email": "from@example.com", "name": "Sender" },
  "to": [{ "email": "to@example.com", "name": "Recipient" }],
  "subject": "Subject",
  "textContent": "Plain text",
  "htmlContent": "<p>HTML content</p>",
  "replyTo": { "email": "reply@example.com" },
  "headers": { "X-Custom": "value" }
}

Response:
{
  "messageId": "<unique-id@smtp-relay.mailin.fr>"
}
```

## Error Handling

| Brevo Error | Meaning | Action |
|-------------|---------|--------|
| 401 | Invalid API key | Check BREVO_API_KEY |
| 400 | Bad request | Check payload format |
| 429 | Rate limited | Implement backoff |
| 500 | Brevo error | Retry with backoff |

## Testing

```bash
# Test sending (requires valid Brevo API key)
curl -X POST https://innbox.dev/api/email/send \
  -H "Cookie: session=..." \
  -F "inboxId=..." \
  -F "to=test@example.com" \
  -F "subject=Test" \
  -F "bodyText=Hello"
```
