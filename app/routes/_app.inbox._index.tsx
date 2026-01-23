import { Link, useNavigate, redirect } from 'react-router';
import { useEffect } from 'react';
import type { Route } from './+types/_app.inbox._index';
import { requireUser, getUserAccessibleInboxes } from '../lib/auth.server';

/**
 * 📥 Inbox index — redirect to last used inbox or show landing
 *
 * We remember where you left off — like a good bookmark.
 *
 * 🎭 Sub-users get whisked directly to their inbox:
 * Since they only have access to one, why make them choose?
 */

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  // Get user's accessible inboxes
  const userInboxes = await getUserAccessibleInboxes(user.id);

  // Sub-users (members) with just one inbox get auto-redirected
  // No need to show them a "Select an inbox" page
  if (user.userType === 'member' && userInboxes.length === 1) {
    throw redirect(`/inbox/${userInboxes[0].id}`);
  }

  const isAdmin = user.userType !== 'member';

  return {
    inboxIds: userInboxes.map((i) => i.id),
    isAdmin,
    hasInboxes: userInboxes.length > 0,
  };
}

export default function InboxIndex({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const { inboxIds, isAdmin, hasInboxes } = loaderData;

  useEffect(() => {
    // Check for last used inbox in localStorage (only for admins)
    if (isAdmin) {
      const lastInboxId = localStorage.getItem('innbox_last_inbox');

      if (lastInboxId && inboxIds.includes(lastInboxId)) {
        navigate(`/inbox/${lastInboxId}`, { replace: true });
      }
    }
  }, [inboxIds, isAdmin, navigate]);

  // Sub-users without any inbox (edge case)
  if (!isAdmin && !hasInboxes) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No inbox access
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have access to any inboxes yet. Contact an admin to get invited.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Select an inbox
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Choose an inbox from the sidebar, or create a new one to start receiving emails.
        </p>
        <Link
          to="/inbox/new"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Inbox
        </Link>
      </div>
    </div>
  );
}
