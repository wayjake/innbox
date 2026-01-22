// workers/email-worker.ts
import { EmailMessage } from 'cloudflare:email';
import PostalMime from 'postal-mime';

export interface Env {
  WEBHOOK_URL: string;
  WEBHOOK_SECRET: string;
}

/**
 * 📬 Cloudflare Email Worker
 *
 * Receives emails via Cloudflare Email Routing,
 * parses them, and forwards to our webhook.
 */

export default {
  async email(message: EmailMessage, env: Env): Promise<void> {
    const rawEmail = await new Response(message.raw).arrayBuffer();

    // Parse the email
    const parser = new PostalMime();
    const parsed = await parser.parse(rawEmail);

    // Prepare webhook payload
    const payload = {
      messageId: parsed.messageId || crypto.randomUUID(),
      from: {
        address: message.from,
        name: parsed.from?.name,
      },
      to: message.to,
      replyTo: parsed.replyTo?.[0]?.address,
      subject: parsed.subject,
      text: parsed.text,
      html: parsed.html,
      headers: Object.fromEntries(
        parsed.headers?.map(h => [h.key, h.value]) || []
      ),
      attachments: parsed.attachments?.map(att => ({
        filename: att.filename || 'attachment',
        mimeType: att.mimeType,
        content: btoa(String.fromCharCode(...new Uint8Array(att.content))),
      })) || [],
      rawEmail: btoa(String.fromCharCode(...new Uint8Array(rawEmail))),
    };

    // Sign the payload
    const signature = await sign(JSON.stringify(payload), env.WEBHOOK_SECRET);

    // Send to webhook
    console.log(`Sending to webhook: ${env.WEBHOOK_URL}`);
    const response = await fetch(env.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'ngrok-skip-browser-warning': 'true', // Bypass ngrok interstitial
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Webhook failed: ${response.status} - ${text}`);
      throw new Error(`Webhook failed: ${response.status}`);
    }

    console.log(`Email processed: ${message.from} -> ${message.to}`);
  },
};

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
