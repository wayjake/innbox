import type { Route } from './+types/api.sse.inbox';
import { requireUser, canAccessInbox } from '../lib/auth.server';
import { subscribe } from '../lib/eventBus.server';

/**
 * 📡 SSE Endpoint — Real-Time Inbox Updates
 *
 * GET /api/sse/inbox?inboxId=xxx
 *
 * Opens a Server-Sent Events stream that pushes notifications
 * when new emails arrive in the inbox.
 *
 *   ┌─────────────────────────────────────────────┐
 *   │                                             │
 *   │   Browser  ◀──────────────  Server         │
 *   │                                             │
 *   │   "Just sit back and let the               │
 *   │    emails come to you..." 📨               │
 *   │                                             │
 *   └─────────────────────────────────────────────┘
 *
 * Unlike WebSockets, SSE is unidirectional (server → client)
 * and plays nicely with HTTP/2 multiplexing. Plus, EventSource
 * handles reconnection automatically. Win-win! 🎉
 *
 * Now supports both owners and invited members!
 */

export async function loader({ request }: Route.LoaderArgs) {
  // 🔐 Authenticate the user
  const user = await requireUser(request);

  // 📬 Get the inbox ID from query params
  const url = new URL(request.url);
  const inboxId = url.searchParams.get('inboxId');

  if (!inboxId) {
    return new Response('Missing inboxId parameter', { status: 400 });
  }

  // 🔒 Verify the user has access to this inbox (owner or member)
  const hasAccess = await canAccessInbox(user.id, inboxId);
  if (!hasAccess) {
    return new Response('Inbox not found or access denied', { status: 404 });
  }

  // 🌊 Create the SSE stream
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send an initial "connected" event so the client knows we're live
      const encoder = new TextEncoder();
      const welcomeMessage = [
        'event: connected',
        `data: ${JSON.stringify({ inboxId, timestamp: Date.now() })}`,
        '',
        '',
      ].join('\n');
      controller.enqueue(encoder.encode(welcomeMessage));

      // Subscribe to inbox events
      unsubscribe = subscribe(inboxId, user.id, controller);
    },

    cancel() {
      // Clean up when the connection closes (tab closed, network issue, etc.)
      unsubscribe?.();
    },
  });

  // Handle connection abort (client disconnect)
  request.signal.addEventListener('abort', () => {
    unsubscribe?.();
  });

  // Return the SSE response with proper headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      // CORS headers if needed (for same-origin this is usually fine)
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
