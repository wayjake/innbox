import type { Route } from './+types/api.email.send';
import { requireUser } from '../lib/auth.server';
import { db } from '../lib/db.server';
import { inboxes, sentEmails, emails } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { sendEmail } from '../lib/brevo.server';

/**
 * 📤 Send Email API
 *
 * Send an email from a user's inbox via Brevo.
 */

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);

  const formData = await request.formData();
  const inboxId = formData.get('inboxId') as string;
  const to = formData.get('to') as string;
  const subject = formData.get('subject') as string;
  const bodyText = formData.get('bodyText') as string;
  const bodyHtml = formData.get('bodyHtml') as string | null;
  const inReplyToId = formData.get('inReplyToId') as string | null;

  if (!inboxId || !to || !subject) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Verify user owns this inbox
  const inbox = await db
    .select()
    .from(inboxes)
    .where(and(eq(inboxes.id, inboxId), eq(inboxes.userId, user.id)))
    .get();

  if (!inbox) {
    return Response.json({ error: 'Inbox not found' }, { status: 404 });
  }

  const appDomain = process.env.APP_DOMAIN || 'innbox.dev';
  const fromAddress = `${inbox.localPart}@${appDomain}`;

  // Parse recipients
  const toRecipients = to
    .split(',')
    .map((email) => ({ email: email.trim() }))
    .filter((r) => r.email);

  if (toRecipients.length === 0) {
    return Response.json({ error: 'At least one recipient required' }, { status: 400 });
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
      email: fromAddress,
      name: inbox.name || undefined,
    },
    to: toRecipients,
    subject,
    textContent: bodyText,
    htmlContent: bodyHtml || undefined,
    replyTo: { email: fromAddress },
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });

  if (!result.success) {
    return Response.json({ error: result.error || 'Failed to send email' }, { status: 500 });
  }

  // Store sent email record
  const [sentEmail] = await db
    .insert(sentEmails)
    .values({
      inboxId,
      inReplyToId,
      toAddresses: JSON.stringify(toRecipients),
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
