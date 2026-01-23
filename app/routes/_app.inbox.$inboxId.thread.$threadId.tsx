import { useLoaderData, useFetcher, useRevalidator } from 'react-router';
import { useState, useRef, useEffect } from 'react';
import type { Route } from './+types/_app.inbox.$inboxId.thread.$threadId';
import { requireUser } from '../lib/auth.server';
import { db } from '../lib/db.server';
import { inboxes, threads, emails, sentEmails } from '../../db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { recalculateThreadUnreadCount } from '../lib/threading.server';

/**
 * 🧵 Thread Conversation View
 *
 * "Where messages dance together in chronological harmony..."
 *
 * Shows all emails (received + sent) in a thread, oldest to newest,
 * with a reply form at the bottom for continuing the conversation.
 *
 *   ┌─────────────────────────────────────────┐
 *   │  📧 Email 1 (received)                  │
 *   │  ↓                                      │
 *   │  📤 Reply 1 (sent)                      │
 *   │  ↓                                      │
 *   │  📧 Email 2 (received)                  │
 *   │  ↓                                      │
 *   │  ┌─────────────────────────────────────┐│
 *   │  │ Reply form                          ││
 *   │  └─────────────────────────────────────┘│
 *   └─────────────────────────────────────────┘
 */

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const { inboxId, threadId } = params;

  // Verify inbox ownership
  const inbox = await db
    .select()
    .from(inboxes)
    .where(and(eq(inboxes.id, inboxId), eq(inboxes.userId, user.id)))
    .get();

  if (!inbox) {
    throw new Response('Inbox not found', { status: 404 });
  }

  // Get thread
  const thread = await db
    .select()
    .from(threads)
    .where(and(eq(threads.id, threadId), eq(threads.inboxId, inboxId)))
    .get();

  if (!thread) {
    throw new Response('Thread not found', { status: 404 });
  }

  // Get all received emails in this thread (chronological)
  const receivedEmails = await db
    .select()
    .from(emails)
    .where(eq(emails.threadId, threadId))
    .orderBy(asc(emails.receivedAt));

  // Get all sent emails in this thread (chronological)
  const sentEmailList = await db
    .select()
    .from(sentEmails)
    .where(eq(sentEmails.threadId, threadId))
    .orderBy(asc(sentEmails.sentAt));

  // Mark all unread emails as read
  const unreadIds = receivedEmails
    .filter((e) => !e.isRead)
    .map((e) => e.id);

  if (unreadIds.length > 0) {
    await Promise.all(
      unreadIds.map((id) =>
        db.update(emails).set({ isRead: true }).where(eq(emails.id, id))
      )
    );
    // Recalculate thread unread count
    await recalculateThreadUnreadCount(threadId);
  }

  // Combine and sort all messages chronologically
  const allMessages = [
    ...receivedEmails.map((e) => ({
      type: 'received' as const,
      id: e.id,
      fromAddress: e.fromAddress,
      fromName: e.fromName,
      toAddress: e.toAddress,
      subject: e.subject,
      bodyText: e.bodyText,
      bodyHtml: e.bodyHtml,
      timestamp: e.receivedAt,
    })),
    ...sentEmailList.map((e) => {
      const toAddresses = JSON.parse(e.toAddresses || '[]');
      return {
        type: 'sent' as const,
        id: e.id,
        fromAddress: `${inbox.localPart}@${process.env.APP_DOMAIN || 'innbox.dev'}`,
        fromName: inbox.name,
        toAddress: toAddresses[0]?.email || 'Unknown',
        subject: e.subject,
        bodyText: e.bodyText,
        bodyHtml: e.bodyHtml,
        timestamp: e.sentAt,
      };
    }),
  ].sort((a, b) => {
    const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return dateA - dateB;
  });

  const appDomain = process.env.APP_DOMAIN || 'innbox.dev';

  // Get the last received email for reply functionality
  const lastReceivedEmail = [...receivedEmails].pop();

  return {
    inbox,
    thread,
    messages: allMessages,
    lastReceivedEmail,
    appDomain,
  };
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ThreadView() {
  const { inbox, thread, messages, lastReceivedEmail, appDomain } =
    useLoaderData<typeof loader>();
  const [showReply, setShowReply] = useState(true);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  const isSending = fetcher.state === 'submitting';
  const sendResult = fetcher.data as
    | { success?: boolean; error?: string }
    | undefined;

  // Scroll to bottom on initial load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Auto-focus reply and scroll after successful send
  useEffect(() => {
    if (sendResult?.success) {
      // Revalidate to get the new message
      revalidator.revalidate();
      // Clear the form
      if (replyTextareaRef.current) {
        replyTextareaRef.current.value = '';
      }
    }
  }, [sendResult, revalidator]);

  // Focus reply textarea
  useEffect(() => {
    if (showReply && replyTextareaRef.current) {
      replyTextareaRef.current.focus();
    }
  }, [showReply]);

  // Build reply subject
  const replySubject =
    thread.normalizedSubject?.startsWith('re:') ||
    thread.normalizedSubject?.startsWith('Re:')
      ? thread.normalizedSubject
      : `Re: ${thread.normalizedSubject || ''}`;

  // Reply-to address (from last received email)
  const replyTo =
    lastReceivedEmail?.replyTo || lastReceivedEmail?.fromAddress || '';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Thread Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {thread.normalizedSubject || '(no subject)'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </p>
          </div>
          <button
            onClick={() => setShowReply(!showReply)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <span>↩</span>
            Reply
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {messages.map((message, index) => (
            <div
              key={`${message.type}-${message.id}`}
              className={`p-6 ${
                message.type === 'sent'
                  ? 'bg-indigo-50/30 dark:bg-indigo-900/10'
                  : 'bg-white dark:bg-gray-900'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.type === 'sent'
                      ? 'bg-indigo-100 dark:bg-indigo-900'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <span
                    className={`font-medium ${
                      message.type === 'sent'
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {(message.fromName || message.fromAddress)
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {message.fromName || message.fromAddress}
                    </span>
                    {message.fromName && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        &lt;{message.fromAddress}&gt;
                      </span>
                    )}
                    {message.type === 'sent' && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400">
                        Sent
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    To: {message.toAddress}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(message.timestamp)}
                  </div>
                </div>
              </div>

              {/* Message Body */}
              <div className="pl-14">
                {message.bodyHtml ? (
                  <div
                    className="prose prose-gray dark:prose-invert max-w-none prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-headings:text-gray-900 dark:prose-headings:text-white"
                    dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
                  />
                ) : message.bodyText ? (
                  <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 font-sans leading-relaxed">
                    {message.bodyText}
                  </pre>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic">
                    No content
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Form */}
      {showReply && (
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
          <fetcher.Form method="post" action="/api/email/send" className="space-y-4">
            <input type="hidden" name="inboxId" value={inbox.id} />
            {lastReceivedEmail && (
              <input type="hidden" name="inReplyToId" value={lastReceivedEmail.id} />
            )}

            {/* Compact header */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500 dark:text-gray-400">From:</span>
              <span className="text-gray-700 dark:text-gray-300">
                {inbox.localPart}@{appDomain}
              </span>
              <span className="text-gray-500 dark:text-gray-400">To:</span>
              <input
                type="email"
                name="to"
                defaultValue={replyTo}
                className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Subject (hidden, uses thread subject) */}
            <input type="hidden" name="subject" value={replySubject} />

            {/* Body */}
            <textarea
              ref={replyTextareaRef}
              name="bodyText"
              rows={4}
              placeholder="Write your reply..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm resize-none"
            />

            {/* Error/Success messages */}
            {sendResult?.error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {sendResult.error}
              </div>
            )}
            {sendResult?.success && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm">
                Message sent!
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Send'
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowReply(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Hide
              </button>
            </div>
          </fetcher.Form>
        </div>
      )}
    </div>
  );
}
