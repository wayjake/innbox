import { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from '../components/Toast';

/**
 * 🍞 Toast Context
 *
 * A global toaster for your application.
 * Drop in the provider, and anywhere in your app you can:
 *
 *   const { showToast } = useToast();
 *   showToast('New email from Alice', { description: 'RE: Project updates' });
 *
 * The toast will pop up, hang around for a bit, then see itself out.
 */

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    setToast({
      message,
      description: options?.description,
      duration: options?.duration ?? 4000,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        message={toast?.message ?? ''}
        description={toast?.description}
        isVisible={toast !== null}
        onClose={hideToast}
        duration={toast?.duration}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ─────────────────────────────────────────────────────────────
// Types, tucked away at the bottom like a good footnote
// ─────────────────────────────────────────────────────────────

type ToastState = {
  message: string;
  description?: string;
  duration: number;
};

type ToastOptions = {
  description?: string;
  duration?: number;
};

type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void;
};
