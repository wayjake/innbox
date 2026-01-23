import { redirect } from 'react-router';
import type { Route } from './+types/_app.inbox.$inboxId._index';
import { requireUser, canAccessInbox } from '../lib/auth.server';
import { db } from '../lib/db.server';
import { inboxes, emails } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * 📬 Auto-select first unread email when entering an inbox
 *
 * No more staring at empty states — dive right in!
 * Now with membership-based access for sub-users too.
 */

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const { inboxId } = params;

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

  // Find first unread email, or first email if all read
  const firstUnread = await db
    .select()
    .from(emails)
    .where(and(eq(emails.inboxId, inboxId), eq(emails.isRead, false)))
    .orderBy(desc(emails.receivedAt))
    .limit(1)
    .get();

  if (firstUnread) {
    throw redirect(`/inbox/${inboxId}/${firstUnread.id}`);
  }

  // No unread? Show first email
  const firstEmail = await db
    .select()
    .from(emails)
    .where(eq(emails.inboxId, inboxId))
    .orderBy(desc(emails.receivedAt))
    .limit(1)
    .get();

  if (firstEmail) {
    throw redirect(`/inbox/${inboxId}/${firstEmail.id}`);
  }

  // No emails at all — show empty state
  return null;
}

export default function InboxEmailIndex() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          No emails yet
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Emails sent to this inbox will appear here
        </p>
      </div>
    </div>
  );
}
