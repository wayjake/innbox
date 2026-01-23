import { Outlet, Link, NavLink, useLoaderData, useParams, Form } from 'react-router';
import { useEffect } from 'react';
import type { Route } from './+types/_app';
import { requireUser } from '../lib/auth.server';
import { db } from '../lib/db.server';
import { inboxes } from '../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * 📬 Authenticated app layout
 *
 * If you're here, you're logged in.
 * Sidebar on the left, content on the right.
 */

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  const userInboxes = await db
    .select()
    .from(inboxes)
    .where(eq(inboxes.userId, user.id));

  const appDomain = process.env.APP_DOMAIN || 'innbox.dev';

  return {
    user: { id: user.id, email: user.email, name: user.name },
    inboxes: userInboxes,
    appDomain,
  };
}

export default function AppLayout() {
  const { user, inboxes: userInboxes, appDomain } = useLoaderData<typeof loader>();
  const params = useParams();

  // Remember last used inbox
  useEffect(() => {
    if (params.inboxId) {
      localStorage.setItem('innbox_last_inbox', params.inboxId);
    }
  }, [params.inboxId]);

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <Link to="/inbox" className="text-xl font-bold text-gray-900 dark:text-white">
            innbox
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link
            to="/inbox/new"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Inbox
          </Link>

          <div className="pt-4">
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Inboxes
            </h3>
            <div className="mt-2 space-y-1">
              {userInboxes.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  No inboxes yet
                </p>
              ) : (
                userInboxes.map((inbox) => (
                  <NavLink
                    key={inbox.id}
                    to={`/inbox/${inbox.id}`}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <svg
                          className={`w-4 h-4 mr-2 ${isActive ? 'text-indigo-500' : 'text-gray-400'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {inbox.localPart}@{appDomain}
                      </>
                    )}
                  </NavLink>
                ))
              )}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {user.email}
            </div>
            <Form method="post" action="/logout">
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Logout
              </button>
            </Form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
