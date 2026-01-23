import { useEffect, useState } from 'react';
import { cn } from '../utils';

/**
 * 🍞 Toast notification component
 *
 * Pops up like bread from a toaster,
 * tells you something important,
 * then gracefully fades away.
 *
 *   ┌─────────────────────────────┐
 *   │ 📬 New email from Alice     │
 *   │ RE: Project updates         │
 *   └─────────────────────────────┘
 */

export function Toast({
  message,
  description,
  isVisible,
  onClose,
  duration = 4000,
}: ToastProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      setIsLeaving(true);
      // Wait for exit animation before actually closing
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [isVisible, duration, onClose]);

  // Reset leaving state when toast becomes visible again
  useEffect(() => {
    if (isVisible) setIsLeaving(false);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50',
        'bg-white dark:bg-gray-800 rounded-lg shadow-lg',
        'border border-gray-200 dark:border-gray-700',
        'p-4 max-w-sm',
        'transform transition-all duration-300',
        isLeaving
          ? 'translate-y-2 opacity-0'
          : 'translate-y-0 opacity-100 animate-slide-up'
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {message}
          </p>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
              {description}
            </p>
          )}
        </div>
        <button
          onClick={() => {
            setIsLeaving(true);
            setTimeout(onClose, 300);
          }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Types live down here, away from the action
// ─────────────────────────────────────────────────────────────

type ToastProps = {
  message: string;
  description?: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
};
