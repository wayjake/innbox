import { useEffect, useRef, useCallback, useState } from 'react';
import { useRevalidator } from 'react-router';

/**
 * 🔄 useInboxPolling — Keep your inbox fresh with good ol' polling
 *
 * Sometimes the simplest solution is the best one. SSE is great
 * until serverless gets in the way. Polling just works™.
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │                                                         │
 *   │   setInterval  ───▶  revalidate()  ───▶  fresh data    │
 *   │                                                         │
 *   │   "Tick tock, any new mail on the block?" ⏰            │
 *   │                                                         │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Features:
 * - Polls every 5 seconds when tab is visible
 * - Pauses when tab is hidden (saves resources)
 * - Immediately refreshes when returning to tab
 */

const POLL_INTERVAL = 5_000; // 5 seconds — fast enough to feel responsive

export function useInboxPolling({
  inboxId,
  enabled = true,
}: UseInboxPollingOptions) {
  const revalidator = useRevalidator();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isActive, setIsActive] = useState(false);

  // 🧹 Clean up interval
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsActive(false);
  }, []);

  // 🚀 Start polling
  const startPolling = useCallback(() => {
    stopPolling();

    intervalRef.current = setInterval(() => {
      if (revalidator.state === 'idle') {
        revalidator.revalidate();
      }
    }, POLL_INTERVAL);
    setIsActive(true);
  }, [revalidator, stopPolling]);

  // 👀 Handle tab visibility changes
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden — pause polling to save resources
        stopPolling();
      } else {
        // Tab visible — refresh immediately and resume polling
        if (revalidator.state === 'idle') {
          revalidator.revalidate();
        }
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, startPolling, stopPolling, revalidator]);

  // 🎬 Main effect — start/stop based on enabled state
  useEffect(() => {
    if (!enabled) {
      stopPolling();
      return;
    }

    // Only poll if tab is visible
    if (!document.hidden) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, inboxId, startPolling, stopPolling]);

  return {
    isPolling: isActive,
  };
}

// ─────────────────────────────────────────────────────────────
// Types — as promised, at the bottom where they belong
// ─────────────────────────────────────────────────────────────

type UseInboxPollingOptions = {
  inboxId: string;
  enabled?: boolean;
};
