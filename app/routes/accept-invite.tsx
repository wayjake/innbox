import { Form, redirect, useActionData, useNavigation, useSearchParams, Link } from 'react-router';
import type { Route } from './+types/accept-invite';
import { validateInvitationToken, acceptInvitation } from '../lib/invitations.server';
import { createSession, createSessionCookie } from '../lib/auth.server';

/**
 * 🎟️ Accept Invitation
 *
 * The golden ticket activation page!
 * Sub-users land here from their invitation email,
 * set a password, and get whisked into their inbox.
 */

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return { valid: false, error: 'Missing invitation token' };
  }

  const result = await validateInvitationToken(token);
  if (!result.valid || !result.invitation) {
    return { valid: false, error: result.error || 'Invalid or expired invitation' };
  }

  return {
    valid: true,
    email: result.invitation.email,
    inboxName: result.invitation.inboxName,
    inboxLocalPart: result.invitation.inboxLocalPart,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const token = formData.get('token') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const name = formData.get('name') as string | null;

  if (!token) {
    return { error: 'Missing invitation token' };
  }

  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' };
  }

  // Validate token again before accepting
  const validation = await validateInvitationToken(token);
  if (!validation.valid || !validation.invitation) {
    return { error: 'Invalid or expired invitation. Please request a new one.' };
  }

  // Accept the invitation (creates user + membership)
  const result = await acceptInvitation(token, password, name || undefined);
  if (!result.success || !result.userId) {
    return { error: result.error || 'Failed to accept invitation' };
  }

  // Create session and log them in
  const sessionId = await createSession(result.userId);

  // Redirect to their inbox
  return redirect(`/inbox/${validation.invitation.inboxId}`, {
    headers: {
      'Set-Cookie': createSessionCookie(sessionId),
    },
  });
}

export default function AcceptInvite({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  if (!loaderData.valid) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-sm w-full space-y-6 text-center">
          <div className="text-5xl">🎟️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Invitation expired
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {loaderData.error || 'This invitation is no longer valid.'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Ask the inbox owner to send you a new invitation.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 rounded-xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium transition-colors"
          >
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            You're invited!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Set up your account to access:
          </p>
          <div className="mt-3 inline-block px-4 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
            <code className="text-lg font-medium text-indigo-700 dark:text-indigo-300">
              {loaderData.inboxLocalPart}@innbox.dev
            </code>
          </div>
        </div>

        <Form method="post" className="space-y-4">
          <input type="hidden" name="token" value={token} />

          {actionData?.error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {actionData.error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={loaderData.email}
              disabled
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Your name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="How should we call you?"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Create password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Setting up...
              </>
            ) : (
              'Activate account'
            )}
          </button>
        </Form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
