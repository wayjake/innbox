import { useEffect, useRef, useState, useCallback } from 'react';
import { useRevalidator } from 'react-router';

/**
 * 📡 useInboxSSE — Real-time inbox updates via Server-Sent Events
 *
 * Connects to the SSE endpoint and listens for new emails.
 * When something arrives, it triggers a revalidation so the
 * thread list updates automatically.
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │                                                         │
 *   │   EventSource  ───▶  onmessage  ───▶  revalidate()     │
 *   │                                                         │
 *   │   "Real-time without the poll tax..." ⚡                │
 *   │                                                         │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Falls back to polling after multiple failures
 * - Pauses when tab is hidden, refreshes on return
 * - Clean connection state indicators
 */

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;
const FALLBACK_POLL_INTERVAL = 10_000;

export function useInboxSSE({
  inboxId,
  onNewEmail,
  onThreadUpdate,
  enabled = true,
}: UseInboxSSEOptions) {
  const revalidator = useRevalidator();
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 🎯 Store callbacks in refs to avoid reconnection loops
  // (inline functions change identity every render, but refs stay stable)
  const onNewEmailRef = useRef(onNewEmail);
  const onThreadUpdateRef = useRef(onThreadUpdate);
  onNewEmailRef.current = onNewEmail;
  onThreadUpdateRef.current = onThreadUpdate;

  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');

  // Clear any pending retry timeout
  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Clear fallback polling
  const clearFallbackPolling = useCallback(() => {
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
  }, []);

  // Start fallback polling when SSE fails completely
  const startFallbackPolling = useCallback(() => {
    clearFallbackPolling();
    console.log('📊 SSE: Starting fallback polling');
    setConnectionState('polling');

    fallbackIntervalRef.current = setInterval(() => {
      if (revalidator.state === 'idle') {
        revalidator.revalidate();
      }
    }, FALLBACK_POLL_INTERVAL);
  }, [clearFallbackPolling, revalidator]);

  // Connect to SSE endpoint
  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    clearRetryTimeout();

    // If SSE has failed too many times, use fallback
    if (retryCountRef.current >= MAX_RETRIES) {
      startFallbackPolling();
      return;
    }

    setConnectionState('connecting');

    const url = `/api/sse/inbox?inboxId=${encodeURIComponent(inboxId)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    // 🎉 Connection established
    eventSource.addEventListener('connected', () => {
      console.log('🟢 SSE: Connected to inbox', inboxId);
      setConnectionState('connected');
      retryCountRef.current = 0; // Reset retry count on success
      clearFallbackPolling(); // Stop fallback if we were using it

      // 🔄 Revalidate on connect to catch any missed updates
      // (especially useful after reconnects or returning to tab)
      if (revalidator.state === 'idle') {
        revalidator.revalidate();
      }
    });

    // 📬 New inbox event (email received, thread updated)
    eventSource.addEventListener('inbox-event', (event) => {
      try {
        const data: InboxEventPayload = JSON.parse(event.data);
        console.log('📬 SSE: Inbox event received', data.type);

        // Trigger the appropriate callback (via refs to avoid stale closures)
        if (data.type === 'new_email') {
          onNewEmailRef.current?.(data);
        } else if (data.type === 'thread_update') {
          onThreadUpdateRef.current?.(data);
        }

        // Revalidate to fetch fresh data
        if (revalidator.state === 'idle') {
          revalidator.revalidate();
        }
      } catch (err) {
        console.error('SSE: Failed to parse inbox-event', err);
      }
    });

    // 💓 Heartbeat (keeps connection alive)
    eventSource.addEventListener('heartbeat', () => {
      // Heartbeats are silent but confirm connection is alive
    });

    // ❌ Connection error
    eventSource.onerror = () => {
      console.log('🔴 SSE: Connection error');
      setConnectionState('reconnecting');
      eventSource.close();
      eventSourceRef.current = null;

      // Exponential backoff retry
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCountRef.current);
      retryCountRef.current++;

      console.log(`🔄 SSE: Retrying in ${delay}ms (attempt ${retryCountRef.current}/${MAX_RETRIES})`);

      retryTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [
    inboxId,
    revalidator,
    clearRetryTimeout,
    clearFallbackPolling,
    startFallbackPolling,
  ]);

  // Disconnect and clean up
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    clearRetryTimeout();
    clearFallbackPolling();
    setConnectionState('disconnected');
  }, [clearRetryTimeout, clearFallbackPolling]);

  // Handle tab visibility changes
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden — disconnect to save resources
        console.log('👋 SSE: Tab hidden, disconnecting');
        disconnect();
      } else {
        // Tab visible — reconnect (revalidation happens on 'connected' event)
        console.log('👀 SSE: Tab visible, reconnecting');
        retryCountRef.current = 0; // Reset retries when user returns
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, connect, disconnect, revalidator]);

  // Main effect — connect on mount, disconnect on unmount
  useEffect(() => {
    if (!enabled) {
      disconnect();
      return;
    }

    // Only connect if tab is visible
    if (!document.hidden) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, inboxId, connect, disconnect]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    isReconnecting: connectionState === 'reconnecting' || connectionState === 'connecting',
    isPolling: connectionState === 'polling',
  };
}

// ─────────────────────────────────────────────────────────────
// Types — keeping the shapes at the bottom where they belong
// ─────────────────────────────────────────────────────────────

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'polling';

type InboxEventPayload = {
  type: 'new_email' | 'thread_update';
  threadId: string;
  emailId: string;
  preview: string | null;
  fromAddress: string;
  subject: string | null;
  timestamp: string;
};

type UseInboxSSEOptions = {
  inboxId: string;
  onNewEmail?: (event: InboxEventPayload) => void;
  onThreadUpdate?: (event: InboxEventPayload) => void;
  enabled?: boolean;
};
