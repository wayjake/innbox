import type { Route } from './+types/api.webhook.email';
import { db } from '../lib/db.server';
import { inboxes, emails } from '../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * 📬 Email Webhook Endpoint
 *
 * Receives emails from Cloudflare Email Worker.
 * Verifies HMAC signature, finds/creates inbox, stores email.
 */

interface WebhookPayload {
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
    content: string; // base64
  }>;
  rawEmail: string; // base64
}

export async function action({ request }: Route.ActionArgs) {
  console.log('📬 Webhook hit!', {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
  });

  // Only accept POST
  if (request.method !== 'POST') {
    console.log('❌ Method not allowed:', request.method);
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify signature
  const signature = request.headers.get('X-Webhook-Signature');
  if (!signature) {
    console.log('❌ Missing X-Webhook-Signature header');
    return new Response('Missing signature', { status: 401 });
  }

  const body = await request.text();
  const expectedSignature = await sign(body, process.env.WEBHOOK_SECRET!);

  if (signature !== expectedSignature) {
    console.error('Invalid webhook signature');
    return new Response('Invalid signature', { status: 401 });
  }

  // Parse payload
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // Extract local part from "to" address
  const appDomain = process.env.APP_DOMAIN || 'innbox.dev';
  const toAddress = payload.to.toLowerCase();

  if (!toAddress.endsWith(`@${appDomain}`)) {
    console.log(`Rejecting email to ${toAddress} - wrong domain`);
    return new Response('Invalid domain', { status: 400 });
  }

  const localPart = toAddress.split('@')[0];

  // Find or create inbox
  let inbox = await db
    .select()
    .from(inboxes)
    .where(eq(inboxes.localPart, localPart))
    .get();

  if (!inbox) {
    // For now, reject emails to non-existent inboxes
    // In the future, could auto-create or have catch-all
    console.log(`No inbox found for ${localPart}@${appDomain}`);
    return new Response('Inbox not found', { status: 404 });
  }

  // Store email
  const [email] = await db
    .insert(emails)
    .values({
      inboxId: inbox.id,
      messageId: payload.messageId,
      fromAddress: payload.from.address,
      fromName: payload.from.name,
      toAddress: payload.to,
      replyTo: payload.replyTo,
      subject: payload.subject,
      bodyText: payload.text,
      bodyHtml: payload.html,
      rawHeaders: JSON.stringify(payload.headers),
      isRead: false,
      isStarred: false,
    })
    .returning();

  console.log(`Email stored: ${email.id} (${payload.from.address} -> ${localPart}@${appDomain})`);

  // TODO: Handle attachments with UploadThing
  // TODO: Send push notification

  return new Response(JSON.stringify({ success: true, emailId: email.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function sign(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
