import { useEffect, useRef } from 'react';
import { useRevalidator } from 'react-router';

/**
 * 📬 Email polling hook
 *
 * Like a diligent postal worker who checks for new mail every few seconds.
 * Uses React Router's revalidator to re-fetch loader data periodically.
 *
 * Features:
 *   - Polls every 5 seconds (configurable)
 *   - Pauses when tab is hidden (saves resources)
 *   - Detects new emails by comparing IDs
 *   - Fires callback when new emails arrive
 *
 *   ┌─────────────────────────────────────────┐
 *   │  🔄 poll → compare → notify → repeat   │
 *   └─────────────────────────────────────────┘
 */

export function useEmailPolling({
  emails,
  onNewEmail,
  interval = 5000,
  enabled = true,
}: UseEmailPollingOptions) {
  const revalidator = useRevalidator();
  const previousEmailIdsRef = useRef<Set<string>>(new Set());
  const isFirstRun = useRef(true);

  // Initialize known email IDs on first render
  useEffect(() => {
    if (isFirstRun.current) {
      previousEmailIdsRef.current = new Set(emails.map((e) => e.id));
      isFirstRun.current = false;
    }
  }, [emails]);

  // Detect new emails when the list changes
  useEffect(() => {
    if (isFirstRun.current) return;

    const currentIds = new Set(emails.map((e) => e.id));
    const previousIds = previousEmailIdsRef.current;

    // Find emails that weren't in the previous set
    const newEmails = emails.filter((e) => !previousIds.has(e.id));

    if (newEmails.length > 0) {
      // Notify about the newest email (first in descending list)
      const newestEmail = newEmails[0];
      onNewEmail?.(newestEmail);
    }

    // Update our known IDs
    previousEmailIdsRef.current = currentIds;
  }, [emails, onNewEmail]);

  // Set up polling interval
  useEffect(() => {
    if (!enabled) return;

    let intervalId: ReturnType<typeof setInterval>;

    const startPolling = () => {
      intervalId = setInterval(() => {
        // Only revalidate if we're not already doing so
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
// Types — keeping the important stuff out of the spotlight
// ─────────────────────────────────────────────────────────────

type EmailSummary = {
  id: string;
  fromName: string | null;
  fromAddress: string;
  subject: string | null;
};

type UseEmailPollingOptions = {
  emails: EmailSummary[];
  onNewEmail?: (email: EmailSummary) => void;
  interval?: number;
  enabled?: boolean;
};
