import { useLoaderData, useFetcher } from 'react-router';
import { useState, useRef, useEffect } from 'react';
import type { Route } from './+types/_app.inbox.$inboxId.$emailId';
import { requireUser, canAccessInbox } from '../lib/auth.server';
import { db } from '../lib/db.server';
import { inboxes, emails } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { EmailTagInput } from '../components/EmailTagInput';

/**
 * 📨 Email detail view
 *
 * Where messages reveal their secrets and replies take flight ✈️
 */

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const { inboxId, emailId } = params;

  // Verify inbox access (owner or member)
  const hasAccess = await canAccessInbox(user.id, inboxId);
  if (!hasAccess) {
    throw new Response('Inbox not found', { status: 404 });
  }

  const inbox = await db
    .select()
    .from(inboxes)
    .where(eq(inboxes.id, inboxId))
    .get();

  if (!inbox) {
    throw new Response('Inbox not found', { status: 404 });
  }

  // Get email
  const email = await db
    .select()
    .from(emails)
    .where(and(eq(emails.id, emailId), eq(emails.inboxId, inboxId)))
    .get();

  if (!email) {
    throw new Response('Email not found', { status: 404 });
  }

  // Mark as read
  if (!email.isRead) {
    await db
      .update(emails)
      .set({ isRead: true })
      .where(eq(emails.id, emailId));
  }

  const appDomain = process.env.APP_DOMAIN || 'innbox.dev';

  return { email, inbox, appDomain };
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString();
}

export default function EmailDetail() {
  const { email, inbox, appDomain } = useLoaderData<typeof loader>();
  const [showReply, setShowReply] = useState(false);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fetcher = useFetcher();

  // Reply-to address (use replyTo if available, otherwise from)
  const replyTo = email.replyTo || email.fromAddress;

  // 📬 Recipient state - To, Cc, Bcc as arrays of emails
  const [toEmails, setToEmails] = useState<string[]>([replyTo]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [bccEmails, setBccEmails] = useState<string[]>([]);
  const [showCcBcc, setShowCcBcc] = useState(false);

  const isSending = fetcher.state === 'submitting';
  const sendResult = fetcher.data as { success?: boolean; error?: string } | undefined;

  // Auto-focus the reply textarea when viewing an email
  useEffect(() => {
    if (showReply && replyTextareaRef.current) {
      // Focus and place cursor at the beginning (before the quoted text)
      replyTextareaRef.current.focus();
      replyTextareaRef.current.setSelectionRange(0, 0);
    }
  }, [showReply, email.id]);

  // Reset recipient state when email changes
  useEffect(() => {
    const newReplyTo = email.replyTo || email.fromAddress;
    setToEmails([newReplyTo]);
    setCcEmails([]);
    setBccEmails([]);
    setShowCcBcc(false);
  }, [email.id, email.replyTo, email.fromAddress]);

  // Pre-fill reply subject
  const replySubject = email.subject?.startsWith('Re:')
    ? email.subject
    : `Re: ${email.subject || ''}`;

  // Quote the original message
  const quotedText = `\n\n---\nOn ${formatDate(email.receivedAt)}, ${email.fromName || email.fromAddress} wrote:\n\n${email.bodyText || ''}`;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {email.subject || '(no subject)'}
          </h1>
          <button
            onClick={() => setShowReply(!showReply)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <span>↩</span>
            Reply
          </button>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
              {(email.fromName || email.fromAddress).charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {email.fromName || email.fromAddress}
              </span>
              {email.fromName && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  &lt;{email.fromAddress}&gt;
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              To: {email.toAddress}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(email.receivedAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Reply Form */}
      {showReply && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <fetcher.Form method="post" action="/api/email/send" className="space-y-4">
            <input type="hidden" name="inboxId" value={inbox.id} />
            <input type="hidden" name="inReplyToId" value={email.id} />

            {/* From (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From
              </label>
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 text-sm">
                {inbox.localPart}@{appDomain}
              </div>
            </div>

            {/* To */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  To
                </label>
                {!showCcBcc && (
                  <button
                    type="button"
                    onClick={() => setShowCcBcc(true)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Cc/Bcc
                  </button>
                )}
              </div>
              <EmailTagInput
                name="to"
                value={toEmails}
                onChange={setToEmails}
                placeholder="Add recipients..."
              />
            </div>

            {/* Cc/Bcc fields (conditionally rendered) */}
            {showCcBcc && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cc
                  </label>
                  <EmailTagInput
                    name="cc"
                    value={ccEmails}
                    onChange={setCcEmails}
                    placeholder="Add Cc recipients..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bcc
                  </label>
                  <EmailTagInput
                    name="bcc"
                    value={bccEmails}
                    onChange={setBccEmails}
                    placeholder="Add Bcc recipients..."
                  />
                </div>
              </>
            )}

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                name="subject"
                defaultValue={replySubject}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message
              </label>
              <textarea
                ref={replyTextareaRef}
                name="bodyText"
                rows={8}
                defaultValue={quotedText}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
              />
            </div>

            {/* Error/Success messages */}
            {sendResult?.error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {sendResult.error}
              </div>
            )}
            {sendResult?.success && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm">
                ✓ Email sent successfully!
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? 'Sending...' : 'Send Reply'}
              </button>
              <button
                type="button"
                onClick={() => setShowReply(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </fetcher.Form>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-900">
        {email.bodyHtml ? (
          <div
            className="prose prose-gray dark:prose-invert max-w-none prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-headings:text-gray-900 dark:prose-headings:text-white"
            dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
          />
        ) : email.bodyText ? (
          <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 font-sans leading-relaxed">
            {email.bodyText}
          </pre>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 italic">
            No content
          </p>
        )}
      </div>
    </div>
  );
}
