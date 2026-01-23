import type { Route } from './+types/api.email.send';
import { requireUser, canAccessInbox } from '../lib/auth.server';
import { db } from '../lib/db.server';
import { inboxes, sentEmails, emails, addressBook, threads } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { sendEmail } from '../lib/brevo.server';
import { updateThreadStats, createThreadForSentEmail } from '../lib/threading.server';

/**
 * 📤 Send Email API
 *
 * Send an email from a user's inbox via Brevo.
 * Both owners and invited members can send from their inbox.
 */

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);

  const formData = await request.formData();
  const inboxId = formData.get('inboxId') as string;
  const to = formData.get('to') as string;
  const cc = formData.get('cc') as string | null;
  const bcc = formData.get('bcc') as string | null;
  const subject = formData.get('subject') as string;
  const bodyText = formData.get('bodyText') as string;
  const bodyHtml = formData.get('bodyHtml') as string | null;
  const inReplyToId = formData.get('inReplyToId') as string | null;

  if (!inboxId || !to || !subject) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Verify user has access to this inbox (owner or member)
  const hasAccess = await canAccessInbox(user.id, inboxId);
  if (!hasAccess) {
    return Response.json({ error: 'Inbox not found' }, { status: 404 });
  }

  const inbox = await db
    .select()
    .from(inboxes)
    .where(eq(inboxes.id, inboxId))
    .get();

  if (!inbox) {
    return Response.json({ error: 'Inbox not found' }, { status: 404 });
  }

  const appDomain = process.env.APP_DOMAIN || 'innbox.dev';
  const fromAddress = `${inbox.localPart}@${appDomain}`;

  // 📬 Parse recipients - comma-separated email addresses
  const parseRecipients = (str: string | null) =>
    str
      ? str.split(',').map((e) => ({ email: e.trim() })).filter((r) => r.email)
      : [];

  const toRecipients = parseRecipients(to);
  const ccRecipients = parseRecipients(cc);
  const bccRecipients = parseRecipients(bcc);

  if (toRecipients.length === 0) {
    return Response.json({ error: 'At least one recipient required' }, { status: 400 });
  }

  // Get reply-to headers and thread info if this is a reply
  let headers: Record<string, string> = {};
  let threadId: string | null = null;

  if (inReplyToId) {
    const originalEmail = await db
      .select()
      .from(emails)
      .where(eq(emails.id, inReplyToId))
      .get();

    if (originalEmail) {
      // Inherit the thread from the original email
      threadId = originalEmail.threadId;

      if (originalEmail.messageId) {
        headers['In-Reply-To'] = originalEmail.messageId;
        headers['References'] = originalEmail.messageId;
      }
    }
  } else {
    // 🆕 Fresh email — create a new thread so it shows up in the list
    // When they reply, References header will link back to this thread
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    threadId = await createThreadForSentEmail(
      inboxId,
      subject,
      toRecipients[0].email, // First recipient as primary participant
      bodyText?.substring(0, 200) || null,
      timestamp
    );
  }

  // Generate a message ID for this sent email (for future reference matching)
  const sentMessageId = `<${crypto.randomUUID()}@${appDomain}>`;

  // Add our generated Message-ID to headers
  headers['Message-ID'] = sentMessageId;

  // Send via Brevo
  const result = await sendEmail({
    from: {
      email: fromAddress,
      name: inbox.name || undefined,
    },
    to: toRecipients,
    cc: ccRecipients.length > 0 ? ccRecipients : undefined,
    bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
    subject,
    textContent: bodyText,
    htmlContent: bodyHtml || undefined,
    replyTo: { email: fromAddress },
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });

  if (!result.success) {
    return Response.json({ error: result.error || 'Failed to send email' }, { status: 500 });
  }

  // Store sent email record with thread reference
  const [sentEmail] = await db
    .insert(sentEmails)
    .values({
      inboxId,
      threadId,
      inReplyToId,
      messageId: sentMessageId,
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

  // 📖 Upsert all recipients to the address book
  // (so you can find them easily next time you send an email)
  const allRecipients = [...toRecipients, ...ccRecipients, ...bccRecipients];
  for (const recipient of allRecipients) {
    await db
      .insert(addressBook)
      .values({
        userId: user.id,
        email: recipient.email,
      })
      .onConflictDoUpdate({
        target: [addressBook.userId, addressBook.email],
        set: {
          timesUsed: sql`times_used + 1`,
          lastUsedAt: sql`datetime('now')`,
        },
      });
  }

  // Update thread stats accordingly
  if (threadId && inReplyToId) {
    // Reply to existing thread — update stats (increment message count, etc.)
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    await updateThreadStats(threadId, {
      messageId: sentMessageId,
      preview: bodyText?.substring(0, 200) || null,
      timestamp,
      isSentEmail: true,
    });
  } else if (threadId) {
    // Fresh email — thread was just created, only need to set the message ID
    // (createThreadForSentEmail already set count=1, preview, timestamp, etc.)
    await db.update(threads).set({ latestMessageId: sentMessageId }).where(eq(threads.id, threadId));
  }

  return Response.json({
    success: true,
    sentEmailId: sentEmail.id,
    messageId: result.messageId,
  });
}
