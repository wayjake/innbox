import { Outlet, Link, NavLink, useLoaderData, useParams, Form } from 'react-router';
import { useEffect } from 'react';
import type { Route } from './+types/_app';
import { requireUser, getUserAccessibleInboxes } from '../lib/auth.server';
import { ToastProvider } from '../context/ToastContext';
import { ComposeProvider, useCompose } from '../context/ComposeContext';
import { ComposeModal } from '../components/ComposeModal';

/**
 * 📬 Authenticated app layout
 *
 * If you're here, you're logged in.
 * Sidebar on the left, content on the right.
 *
 * 🎭 Plot twist: sub-users get a minimal sidebar!
 * Admins see the full inbox kingdom, members see just their one inbox.
 */

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  // Get all inboxes the user can access (owned or member)
  const userInboxes = await getUserAccessibleInboxes(user.id);

  const appDomain = process.env.APP_DOMAIN || 'innbox.dev';

  // Sub-users (members) have userType='member' and typically access just one inbox
  const isAdmin = user.userType !== 'member';

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      userType: user.userType || 'admin',
    },
    inboxes: userInboxes,
    appDomain,
    isAdmin,
  };
}

export default function AppLayout() {
  const { user, inboxes: userInboxes, appDomain, isAdmin } = useLoaderData<typeof loader>();
  const params = useParams();

  // Remember last used inbox (only for admins with multiple inboxes)
  useEffect(() => {
    if (params.inboxId && isAdmin) {
      localStorage.setItem('innbox_last_inbox', params.inboxId);
    }
  }, [params.inboxId, isAdmin]);

  return (
    <ToastProvider>
      <ComposeProvider>
        <div className="min-h-screen flex bg-white dark:bg-gray-950">
          {/* Sidebar - full for admins, minimal for sub-users */}
          {isAdmin ? (
            <AdminSidebar user={user} inboxes={userInboxes} appDomain={appDomain} />
          ) : (
            <MemberSidebar user={user} inboxes={userInboxes} appDomain={appDomain} />
          )}

          {/* Main content */}
          <main className="flex-1">
            <Outlet />
          </main>
        </div>

        {/* Compose modal - floats above everything */}
        <ComposeModal inboxes={userInboxes} appDomain={appDomain} />
      </ComposeProvider>
    </ToastProvider>
  );
}

/**
 * 🗂️ Admin Sidebar
 *
 * The full-featured sidebar for inbox owners.
 * Contains the compose button, inbox list, and ability to create new inboxes.
 */
function AdminSidebar({ user, inboxes: userInboxes, appDomain }: SidebarProps) {
  const { openCompose } = useCompose();

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <Link to="/inbox" className="text-xl font-bold text-gray-900 dark:text-white">
          innbox
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {/* ✏️ Compose button - the star of the show */}
        <button
          onClick={() => openCompose()}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Compose
        </button>

        <div className="pt-4">
          <div className="flex items-center justify-between px-3">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Inboxes
            </h3>
            <Link
              to="/inbox/new"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Create new inbox"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Link>
          </div>
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
  );
}

/**
 * 👤 Member Sidebar (Sub-user view)
 *
 * A minimal sidebar for invited members.
 * No inbox list, no create button — just their assigned inbox and compose.
 *
 *   "Less is more" - Mies van der Rohe (probably about inboxes)
 */
function MemberSidebar({ user, inboxes: userInboxes, appDomain }: SidebarProps) {
  const { openCompose } = useCompose();

  // Sub-users typically have just one inbox
  const inbox = userInboxes[0];

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      {/* Show the inbox they have access to */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        {inbox ? (
          <Link to={`/inbox/${inbox.id}`} className="block">
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {inbox.name || inbox.localPart}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {inbox.localPart}@{appDomain}
            </div>
          </Link>
        ) : (
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            innbox
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {/* ✏️ Compose button */}
        <button
          onClick={() => openCompose()}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Compose
        </button>

        {/* Go to inbox link */}
        {inbox && (
          <NavLink
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
                Inbox
              </>
            )}
          </NavLink>
        )}
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
  );
}

// ─────────────────────────────────────────────────────────────
// Types tucked at the bottom, cozy and organized
// ─────────────────────────────────────────────────────────────

type SidebarProps = {
  user: { id: string; email: string; name: string | null };
  inboxes: Array<{ id: string; localPart: string; name: string | null; role: string }>;
  appDomain: string;
};
