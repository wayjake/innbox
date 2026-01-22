import { redirect } from 'react-router';
import type { Route } from './+types/logout';
import { getSessionFromCookie, deleteSession, createLogoutCookie } from '../lib/auth.server';

/**
 * 🚪 Logout route
 *
 * Clears the session and redirects to home.
 */

export async function action({ request }: Route.ActionArgs) {
  const sessionId = await getSessionFromCookie(request);

  if (sessionId) {
    await deleteSession(sessionId);
  }

  return redirect('/', {
    headers: {
      'Set-Cookie': createLogoutCookie(),
    },
  });
}

export async function loader() {
  return redirect('/');
}
