import { useEffect, useRef } from 'react';
import { useRevalidator } from 'react-router';

/**
 * 🧵 Thread polling hook
 *
 * Like useEmailPolling but for threaded conversations.
 * Watches for new threads or updates to existing ones.
 *
 *   ┌─────────────────────────────────────────────┐
 *   │  🔄 poll → compare → notify → repeat       │
 *   │                                             │
 *   │  "Threads weave stories over time..."      │
 *   └─────────────────────────────────────────────┘
 */

export function useThreadPolling({
  threads,
  onNewThread,
  onThreadUpdate,
  interval = 5000,
  enabled = true,
}: UseThreadPollingOptions) {
  const revalidator = useRevalidator();
  const previousThreadIdsRef = useRef<Set<string>>(new Set());
  const previousLatestAtRef = useRef<Map<string, string>>(new Map());
  const isFirstRun = useRef(true);

  // Initialize known thread IDs and timestamps on first render
  useEffect(() => {
    if (isFirstRun.current) {
      previousThreadIdsRef.current = new Set(threads.map((t) => t.id));
      previousLatestAtRef.current = new Map(
        threads.map((t) => [t.id, t.latestMessageAt || ''])
      );
      isFirstRun.current = false;
    }
  }, [threads]);

  // Detect new threads or updates when the list changes
  useEffect(() => {
    if (isFirstRun.current) return;

    const currentIds = new Set(threads.map((t) => t.id));
    const previousIds = previousThreadIdsRef.current;
    const previousLatestAt = previousLatestAtRef.current;

    // Find threads that weren't in the previous set (new threads)
    const newThreads = threads.filter((t) => !previousIds.has(t.id));

    if (newThreads.length > 0) {
      // Notify about the newest thread
      const newestThread = newThreads[0];
      onNewThread?.(newestThread);
    }

    // Find threads with updated latestMessageAt (existing thread got new message)
    const updatedThreads = threads.filter((t) => {
      const prevLatest = previousLatestAt.get(t.id);
      return prevLatest && prevLatest !== t.latestMessageAt;
    });

    if (updatedThreads.length > 0 && onThreadUpdate) {
      // Notify about the most recently updated thread
      const mostRecentUpdate = updatedThreads[0];
      onThreadUpdate(mostRecentUpdate);
    }

    // Update our known state
    previousThreadIdsRef.current = currentIds;
    previousLatestAtRef.current = new Map(
      threads.map((t) => [t.id, t.latestMessageAt || ''])
    );
  }, [threads, onNewThread, onThreadUpdate]);

  // Set up polling interval
  useEffect(() => {
    if (!enabled) return;

    let intervalId: ReturnType<typeof setInterval>;

    const startPolling = () => {
      intervalId = setInterval(() => {
        if (revalidator.state === 'idle') {
          revalidator.revalidate();
        }
      }, interval);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };

    // Handle visibility changes — pause when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Immediately check for updates when tab becomes visible
        if (revalidator.state === 'idle') {
          revalidator.revalidate();
        }
        startPolling();
      }
    };

    // Start polling if tab is visible
    if (!document.hidden) {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [revalidator, interval, enabled]);

  return {
    isPolling: revalidator.state === 'loading',
  };
}

// ─────────────────────────────────────────────────────────────
// Types — keeping the important stuff tucked away neatly
// ─────────────────────────────────────────────────────────────

type ThreadSummary = {
  id: string;
  normalizedSubject: string | null;
  latestPreview: string | null;
  latestMessageAt: string | null;
};

type UseThreadPollingOptions = {
  threads: ThreadSummary[];
  onNewThread?: (thread: ThreadSummary) => void;
  onThreadUpdate?: (thread: ThreadSummary) => void;
  interval?: number;
  enabled?: boolean;
};
