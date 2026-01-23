import { redirect, useActionData, useLoaderData } from 'react-router';
import type { Route } from './+types/_app.inbox.new';
import { requireUser } from '../lib/auth.server';
import { db } from '../lib/db.server';
import { inboxes, inboxMembers } from '../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * ✨ Create a new inbox
 *
 * Pick a local part, we'll add @{APP_DOMAIN}
 *
 * 🚫 Sub-users need not apply — this is admin-only territory.
 * They're invited to specific inboxes, not creating their own.
 */

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  // Sub-users can't create new inboxes — redirect them away
  if (user.userType === 'member') {
    throw redirect('/inbox');
  }

  const appDomain = process.env.APP_DOMAIN || 'innbox.dev';
  return { appDomain };
}

export async function action({ request }: Route.ActionArgs) {
  console.log('📥 Create inbox action called');
  const user = await requireUser(request);

  // Double-check: sub-users can't create inboxes
  if (user.userType === 'member') {
    return { error: 'You do not have permission to create inboxes' };
  }

  const formData = await request.formData();
  const localPart = (formData.get('localPart') as string)?.toLowerCase().trim();
  console.log('📥 localPart:', localPart, 'user:', user.id);

  if (!localPart) {
    console.log('📥 Error: no localPart');
    return { error: 'Please enter an inbox name' };
  }

  // Validate local part format
  if (!/^[a-z0-9][a-z0-9._-]*[a-z0-9]$|^[a-z0-9]$/.test(localPart)) {
    return { error: 'Invalid inbox name. Use letters, numbers, dots, hyphens, or underscores.' };
  }

  // Check if already taken
  const existing = await db
    .select()
    .from(inboxes)
    .where(eq(inboxes.localPart, localPart))
    .get();

  if (existing) {
    return { error: 'This inbox name is already taken' };
  }

  console.log('📥 Inserting inbox...');
  const [inbox] = await db
    .insert(inboxes)
    .values({
      userId: user.id,
      localPart,
      name: localPart,
    })
    .returning();

  // Add creator as owner in inboxMembers
  await db.insert(inboxMembers).values({
    inboxId: inbox.id,
    userId: user.id,
    role: 'owner',
  });

  console.log('📥 Inbox created:', inbox.id);
  return redirect(`/inbox/${inbox.id}`);
}

export default function NewInbox() {
  const { appDomain } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Create new inbox
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Choose a name for your inbox. Emails sent to this address will appear here.
        </p>

        <form method="post" action="/inbox/new" className="space-y-4">
          {actionData?.error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {actionData.error}
            </div>
          )}

          <div>
            <label
              htmlFor="localPart"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Inbox name
            </label>
            <div className="flex items-center gap-2">
              <input
                id="localPart"
                name="localPart"
                type="text"
                required
                autoFocus
                placeholder="your-name"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <span className="text-gray-500 dark:text-gray-400 font-medium">
                @{appDomain}
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Create Inbox
          </button>
        </form>
      </div>
    </div>
  );
}
