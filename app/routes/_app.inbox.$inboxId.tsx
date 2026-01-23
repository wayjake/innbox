import { Link, Outlet, useLoaderData } from 'react-router';
import type { Route } from './+types/_app.inbox.$inboxId';
import { requireUser } from '../lib/auth.server';
import { db } from '../lib/db.server';
import { inboxes, threads, emails } from '../../db/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { useThreadPolling } from '../hooks/useThreadPolling';
import { useToast } from '../context/ToastContext';

/**
 * 📧 Inbox view — threaded conversation list
 *
 * "Where conversations gather like old friends..." 🧵
 */

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const { inboxId } = params;

  const inbox = await db
    .select()
    .from(inboxes)
    .where(and(eq(inboxes.id, inboxId), eq(inboxes.userId, user.id)))
    .get();

  if (!inbox) {
    throw new Response('Inbox not found', { status: 404 });
  }

  // Get threads (primary view)
  const threadList = await db
    .select()
    .from(threads)
    .where(eq(threads.inboxId, inboxId))
    .orderBy(desc(threads.latestMessageAt))
    .limit(100);

  // Also get any orphan emails (no thread assigned yet - for backwards compat)
  const orphanEmails = await db
    .select()
    .from(emails)
    .where(and(eq(emails.inboxId, inboxId), isNull(emails.threadId)))
    .orderBy(desc(emails.receivedAt))
    .limit(50);

  const appDomain = process.env.APP_DOMAIN || 'innbox.dev';

  return {
    inbox,
    threads: threadList,
    orphanEmails,
    appDomain,
  };
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

export default function InboxView() {
  const { inbox, threads: threadList, orphanEmails, appDomain } = useLoaderData<typeof loader>();
  const { showToast } = useToast();

  // 🔄 Poll for thread updates every 5 seconds
  const { isPolling } = useThreadPolling({
    threads: threadList,
    onNewThread: (thread) => {
      showToast('New conversation', {
        description: thread.latestPreview || '(no preview)',
      });
    },
  });

  // Total count includes both threads and orphan emails
  const totalCount = threadList.length + orphanEmails.length;

  return (
    <div className="h-full flex">
      {/* Thread list */}
      <div className="w-96 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {inbox.localPart}@{appDomain}
            </h2>
            {/* Tiny pulse when polling — like a heartbeat 💓 */}
            {isPolling && (
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            )}
          </div>
          <p className="text-sm text-gray-500">
            {totalCount} {totalCount === 1 ? 'conversation' : 'conversations'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {totalCount === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                No conversations yet
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Send an email to {inbox.localPart}@{appDomain}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {/* Render threads */}
              {threadList.map((thread) => {
                const hasUnread = (thread.unreadCount || 0) > 0;
                const messageCount = thread.messageCount || 1;
                const participants: string[] = thread.participants
                  ? JSON.parse(thread.participants)
                  : [];
                const displayName = participants[0] || 'Unknown';

                return (
                  <Link
                    key={thread.id}
                    to={`/inbox/${inbox.id}/thread/${thread.id}`}
                    className={`block p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${
                      hasUnread ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm truncate ${
                            hasUnread
                              ? 'font-semibold text-gray-900 dark:text-white'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {displayName}
                          </p>
                          {/* Message count badge */}
                          {messageCount > 1 && (
                            <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-medium rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              {messageCount}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm truncate ${
                          hasUnread
                            ? 'font-medium text-gray-800 dark:text-gray-200'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {thread.normalizedSubject || '(no subject)'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {thread.latestPreview || ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatTime(thread.latestMessageAt)}
                        </span>
                        {/* Unread count badge */}
                        {hasUnread && (
                          <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-indigo-600 text-white">
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}

              {/* Render orphan emails (backwards compat) */}
              {orphanEmails.map((email) => (
                <Link
                  key={email.id}
                  to={`/inbox/${inbox.id}/${email.id}`}
                  className={`block p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${
                    !email.isRead ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${
                        !email.isRead
                          ? 'font-semibold text-gray-900 dark:text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {email.fromName || email.fromAddress}
                      </p>
                      <p className={`text-sm truncate ${
                        !email.isRead
                          ? 'font-medium text-gray-800 dark:text-gray-200'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {email.subject || '(no subject)'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {email.bodyText?.substring(0, 100) || ''}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatTime(email.receivedAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Thread/Email detail (child route) */}
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
