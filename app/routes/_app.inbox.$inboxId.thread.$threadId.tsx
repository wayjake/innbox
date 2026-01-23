import { useLoaderData, useFetcher, useRevalidator } from 'react-router';
import { useState, useRef, useEffect } from 'react';
import type { Route } from './+types/_app.inbox.$inboxId.thread.$threadId';
import { requireUser, canAccessInbox } from '../lib/auth.server';
import { db } from '../lib/db.server';
import { inboxes, threads, emails, sentEmails } from '../../db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { recalculateThreadUnreadCount } from '../lib/threading.server';

/**
 * 🧵 Thread Conversation View
 *
 * "Newest at the top, history at your fingertips..."
 *
 * Shows all emails (received + sent) in a thread, newest first,
 * with older messages collapsed by default. Reply form sits at top.
 *
 *   ┌─────────────────────────────────────────┐
 *   │  ┌─────────────────────────────────────┐│
 *   │  │ Reply form                          ││
 *   │  └─────────────────────────────────────┘│
 *   │                                         │
 *   │  ▼ 📧 Email 3 (newest) — expanded      │
 *   │    "Sounds good, let's do it!"          │
 *   │                                         │
 *   │  ▶ 📤 Reply 1 — collapsed (click→expand)│
 *   │                                         │
 *   │  ▶ 📧 Email 1 (oldest) — collapsed     │
 *   └─────────────────────────────────────────┘
 */

export async function loader({ request, params }: Route.LoaderArgs) {
  // 🎭 Dynamic import ensures these functions stay server-only
  // (top-level imports from .server files can confuse the bundler)
  const { stripQuotedText, stripQuotedHtml, getPreviewSnippet } = await import(
    '../lib/emailBodyParser.server'
  );

  const user = await requireUser(request);
  const { inboxId, threadId } = params;

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

  // 📬 Track which emails were unread (we'll tell the UI to expand these)
  // Capture this BEFORE marking them as read so the UI knows what's "new"
  const initiallyUnreadIds = receivedEmails
    .filter((e) => !e.isRead)
    .map((e) => e.id);

  // Mark all unread emails as read
  if (initiallyUnreadIds.length > 0) {
    await Promise.all(
      initiallyUnreadIds.map((id) =>
        db.update(emails).set({ isRead: true }).where(eq(emails.id, id))
      )
    );
    // Recalculate thread unread count
    await recalculateThreadUnreadCount(threadId);
  }

  // 🕐 Pre-format dates on server to avoid hydration mismatches
  // (toLocaleString can differ between server/client environments)
  const formatDateServer = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Combine and sort messages: newest first ⬇️
  // (so the freshest content is always at the top of the thread)
  // Also pre-compute cleaned content to avoid hydration mismatches 🎭
  const allMessages = [
    ...receivedEmails.map((e) => {
      const cleanText = stripQuotedText(e.bodyText);
      const cleanHtml = stripQuotedHtml(e.bodyHtml);
      return {
        type: 'received' as const,
        id: e.id,
        fromAddress: e.fromAddress,
        fromName: e.fromName,
        toAddress: e.toAddress,
        subject: e.subject,
        bodyText: e.bodyText,
        bodyHtml: e.bodyHtml,
        cleanText,
        cleanHtml,
        previewSnippet: getPreviewSnippet(e.bodyText),
        // 🎭 Explicit Boolean() prevents truthy/falsy serialization quirks
        hasQuotedContent: Boolean(
          (e.bodyText && cleanText !== e.bodyText) ||
            (e.bodyHtml && cleanHtml !== e.bodyHtml)
        ),
        timestamp: e.receivedAt,
        formattedDate: formatDateServer(e.receivedAt),
      };
    }),
    ...sentEmailList.map((e) => {
      const toAddresses = JSON.parse(e.toAddresses || '[]');
      const cleanText = stripQuotedText(e.bodyText);
      const cleanHtml = stripQuotedHtml(e.bodyHtml);
      return {
        type: 'sent' as const,
        id: e.id,
        fromAddress: `${inbox.localPart}@${process.env.APP_DOMAIN || 'innbox.dev'}`,
        fromName: inbox.name,
        toAddress: toAddresses[0]?.email || 'Unknown',
        subject: e.subject,
        bodyText: e.bodyText,
        bodyHtml: e.bodyHtml,
        cleanText,
        cleanHtml,
        previewSnippet: getPreviewSnippet(e.bodyText),
        // 🎭 Explicit Boolean() prevents truthy/falsy serialization quirks
        hasQuotedContent: Boolean(
          (e.bodyText && cleanText !== e.bodyText) ||
            (e.bodyHtml && cleanHtml !== e.bodyHtml)
        ),
        timestamp: e.sentAt,
        formattedDate: formatDateServer(e.sentAt),
      };
    }),
  ].sort((a, b) => {
    const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return dateB - dateA; // Descending: newest first 🆕
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
    initiallyUnreadIds, // 🔔 Tell the UI which messages were unread on load
  };
}

export default function ThreadView() {
  const { inbox, thread, messages, lastReceivedEmail, appDomain, initiallyUnreadIds } =
    useLoaderData<typeof loader>();
  const [showReply, setShowReply] = useState(false);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  // 🎭 Collapse state: expand unread messages + always the newest one
  // We track which messages are expanded via their unique key
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initialExpanded = new Set<string>();
    // Expand all messages that were unread when page loaded
    initiallyUnreadIds.forEach((id) => initialExpanded.add(`received-${id}`));
    // Always expand the newest message (first in our desc-sorted list)
    if (messages.length > 0) {
      initialExpanded.add(`${messages[0].type}-${messages[0].id}`);
    }
    return initialExpanded;
  });

  // 👁️ Track whether to show quoted content per message
  const [showQuotedIds, setShowQuotedIds] = useState<Set<string>>(new Set());

  const isSending = fetcher.state === 'submitting';
  const sendResult = fetcher.data as
    | { success?: boolean; error?: string }
    | undefined;

  // Auto-focus reply and scroll after successful send
  useEffect(() => {
    if (sendResult?.success) {
      revalidator.revalidate();
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

  // Toggle expand/collapse for a message
  const toggleExpanded = (messageKey: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageKey)) {
        next.delete(messageKey);
      } else {
        next.add(messageKey);
      }
      return next;
    });
  };

  // Toggle show quoted content for a message
  const toggleShowQuoted = (messageKey: string) => {
    setShowQuotedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageKey)) {
        next.delete(messageKey);
      } else {
        next.add(messageKey);
      }
      return next;
    });
  };

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

      {/* Scrollable area: Reply form (at top since newest first) + Messages */}
      <div className="flex-1 overflow-y-auto">
        {/* Reply Form - now at top! */}
        {showReply && (
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
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

        {/* Messages List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {messages.map((message) => {
            const messageKey = `${message.type}-${message.id}`;
            const isExpanded = expandedIds.has(messageKey);
            const showQuoted = showQuotedIds.has(messageKey);

            // Use pre-computed values from loader (avoids hydration mismatches)
            const { cleanText, cleanHtml, previewSnippet, hasQuotedContent } = message;

            return (
              <div
                key={messageKey}
                className={`${
                  message.type === 'sent'
                    ? 'bg-indigo-50/30 dark:bg-indigo-900/10'
                    : 'bg-white dark:bg-gray-900'
                }`}
              >
                {/* Clickable header row for expand/collapse */}
                <button
                  type="button"
                  onClick={() => toggleExpanded(messageKey)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                >
                  {/* Expand/collapse chevron */}
                  <span className="text-gray-400 dark:text-gray-500 flex-shrink-0 w-5">
                    {isExpanded ? '▼' : '▶'}
                  </span>

                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === 'sent'
                        ? 'bg-indigo-100 dark:bg-indigo-900'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${
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

                  {/* Sender + time + preview (collapsed) */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {message.fromName || message.fromAddress}
                      </span>
                      {message.type === 'sent' && (
                        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                          Sent
                        </span>
                      )}
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {message.formattedDate}
                      </span>
                    </div>
                    {/* Show preview only when collapsed */}
                    {!isExpanded && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {previewSnippet}
                      </p>
                    )}
                  </div>
                </button>

                {/* Expanded message body */}
                {isExpanded && (
                  <div className="px-4 pb-4 pl-16">
                    {/* Full header info */}
                    <div className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                      {message.fromName && (
                        <span className="block">
                          From: {message.fromName} &lt;{message.fromAddress}&gt;
                        </span>
                      )}
                      <span className="block">To: {message.toAddress}</span>
                    </div>

                    {/* Message body - show clean or full based on toggle */}
                    <div className="prose prose-gray dark:prose-invert max-w-none prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-headings:text-gray-900 dark:prose-headings:text-white">
                      {showQuoted ? (
                        // Show full original content
                        message.bodyHtml ? (
                          <div dangerouslySetInnerHTML={{ __html: message.bodyHtml }} />
                        ) : message.bodyText ? (
                          <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                            {message.bodyText}
                          </pre>
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400 italic">
                            No content
                          </p>
                        )
                      ) : (
                        // Show clean (quote-stripped) content
                        cleanHtml && cleanHtml.trim() ? (
                          <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
                        ) : cleanText ? (
                          <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                            {cleanText}
                          </pre>
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400 italic">
                            No content
                          </p>
                        )
                      )}
                    </div>

                    {/* Toggle to show/hide quoted content */}
                    {hasQuotedContent && (
                      <button
                        type="button"
                        onClick={() => toggleShowQuoted(messageKey)}
                        className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
                      >
                        <span>{showQuoted ? '▲' : '•••'}</span>
                        <span>{showQuoted ? 'Hide quoted content' : 'Show quoted content'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
