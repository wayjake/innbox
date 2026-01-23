/**
 * 🚌 Event Bus — In-Memory Pub/Sub for SSE
 *
 * A simple message highway connecting webhooks to browsers.
 * When an email arrives, it hops on the bus and rides straight
 * to waiting SSE connections.
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │                                                         │
 *   │   📬 Webhook  ──────▶  🚌 EventBus  ──────▶  🖥️ Browser │
 *   │                         │                               │
 *   │                         ▼                               │
 *   │                    Map<inboxId,                         │
 *   │                       Set<connections>>                 │
 *   │                                                         │
 *   └─────────────────────────────────────────────────────────┘
 *
 * "All aboard the notification express!" 🚂
 */

// Each SSE connection gets one of these
type SSEConnection = {
  userId: string;
  controller: ReadableStreamDefaultController;
  connectedAt: number;
};

// Events that flow through the bus
export type InboxEvent = {
  type: 'new_email' | 'thread_update';
  threadId: string;
  emailId: string;
  preview: string | null;
  fromAddress: string;
  subject: string | null;
  timestamp: string;
};

// The bus itself — Map<inboxId, Set<SSEConnection>>
const subscribers = new Map<string, Set<SSEConnection>>();

// Heartbeat interval — keeps connections alive like a steady pulse 💓
const HEARTBEAT_INTERVAL = 30_000;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Subscribe to inbox updates
 *
 * Returns an unsubscribe function — call it when the connection closes.
 */
export function subscribe(
  inboxId: string,
  userId: string,
  controller: ReadableStreamDefaultController
): () => void {
  const connection: SSEConnection = {
    userId,
    controller,
    connectedAt: Date.now(),
  };

  // Get or create the inbox's subscriber set
  let inboxSubs = subscribers.get(inboxId);
  if (!inboxSubs) {
    inboxSubs = new Set();
    subscribers.set(inboxId, inboxSubs);
  }
  inboxSubs.add(connection);

  // Start the heartbeat if this is the first subscriber
  if (!heartbeatTimer) {
    startHeartbeat();
  }

  console.log(`🔔 SSE: User ${userId} subscribed to inbox ${inboxId} (${inboxSubs.size} listeners)`);

  // Return the unsubscribe function
  return () => {
    inboxSubs?.delete(connection);

    // Clean up empty sets
    if (inboxSubs?.size === 0) {
      subscribers.delete(inboxId);
    }

    // Stop heartbeat if no subscribers left
    if (subscribers.size === 0 && heartbeatTimer) {
      stopHeartbeat();
    }

    console.log(`🔕 SSE: User ${userId} unsubscribed from inbox ${inboxId}`);
  };
}

/**
 * Notify all subscribers of an inbox about a new event
 *
 * Like ringing a bell in a quiet room — everyone hears it 🔔
 */
export function notifyInbox(inboxId: string, event: InboxEvent): void {
  const inboxSubs = subscribers.get(inboxId);
  if (!inboxSubs || inboxSubs.size === 0) {
    return; // No one's listening, that's okay
  }

  const message = formatSSE('inbox-event', event);

  // Track failed connections for cleanup
  const deadConnections: SSEConnection[] = [];

  for (const connection of inboxSubs) {
    try {
      connection.controller.enqueue(message);
    } catch (err) {
      // Connection probably closed — mark for cleanup
      console.log(`🔌 SSE: Connection to user ${connection.userId} failed, removing`);
      deadConnections.push(connection);
    }
  }

  // Clean up dead connections
  for (const dead of deadConnections) {
    inboxSubs.delete(dead);
  }

  if (inboxSubs.size === 0) {
    subscribers.delete(inboxId);
  }

  console.log(`📤 SSE: Notified ${inboxSubs.size} listeners for inbox ${inboxId} — ${event.type}`);
}

/**
 * Send heartbeat to all connections
 *
 * Keeps connections alive through proxies and load balancers
 * that might otherwise timeout idle connections.
 */
function sendHeartbeat(): void {
  const heartbeat = formatSSE('heartbeat', { timestamp: Date.now() });
  const deadConnections: Array<{ inboxId: string; connection: SSEConnection }> = [];

  for (const [inboxId, inboxSubs] of subscribers) {
    for (const connection of inboxSubs) {
      try {
        connection.controller.enqueue(heartbeat);
      } catch {
        deadConnections.push({ inboxId, connection });
      }
    }
  }

  // Clean up dead connections
  for (const { inboxId, connection } of deadConnections) {
    const inboxSubs = subscribers.get(inboxId);
    inboxSubs?.delete(connection);
    if (inboxSubs?.size === 0) {
      subscribers.delete(inboxId);
    }
  }
}

function startHeartbeat(): void {
  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
  console.log('💓 SSE: Heartbeat started');
}

function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    console.log('💤 SSE: Heartbeat stopped (no subscribers)');
  }
}

/**
 * Format data as a Server-Sent Event
 *
 * SSE format is simple but particular:
 *   event: eventType
 *   data: {"json":"here"}
 *
 *   (blank line signals end of message)
 */
function formatSSE(eventType: string, data: unknown): Uint8Array {
  const encoder = new TextEncoder();
  const lines = [
    `event: ${eventType}`,
    `data: ${JSON.stringify(data)}`,
    '',
    '',  // Extra newline to end the event
  ].join('\n');

  return encoder.encode(lines);
}

/**
 * Get current connection count (for debugging/monitoring)
 */
export function getConnectionStats(): { totalConnections: number; inboxCount: number } {
  let totalConnections = 0;
  for (const subs of subscribers.values()) {
    totalConnections += subs.size;
  }
  return {
    totalConnections,
    inboxCount: subscribers.size,
  };
}
