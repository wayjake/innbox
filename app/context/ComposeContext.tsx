import { createContext, useContext, useState, useCallback } from 'react';

/**
 * ✉️ Compose Context
 *
 * The global brain behind the compose modal.
 * Opens, closes, and remembers which inbox you want to send from.
 *
 *   const { openCompose } = useCompose();
 *   openCompose('inbox-id-123'); // Opens modal, pre-selects inbox
 *
 * Think of it as the conductor for your email symphony. 🎼
 */

const ComposeContext = createContext<ComposeContextValue | null>(null);

export function ComposeProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedInboxId, setSelectedInboxId] = useState<string | null>(null);

  const openCompose = useCallback((inboxId?: string) => {
    if (inboxId) {
      setSelectedInboxId(inboxId);
    }
    setIsOpen(true);
  }, []);

  const closeCompose = useCallback(() => {
    setIsOpen(false);
    // Reset inbox selection after animation completes
    setTimeout(() => setSelectedInboxId(null), 300);
  }, []);

  return (
    <ComposeContext.Provider
      value={{ isOpen, selectedInboxId, openCompose, closeCompose }}
    >
      {children}
    </ComposeContext.Provider>
  );
}

export function useCompose() {
  const context = useContext(ComposeContext);
  if (!context) {
    throw new Error('useCompose must be used within a ComposeProvider');
  }
  return context;
}

// ─────────────────────────────────────────────────────────────
// Types, waiting patiently at the bottom like good types do
// ─────────────────────────────────────────────────────────────

type ComposeContextValue = {
  isOpen: boolean;
  selectedInboxId: string | null;
  openCompose: (inboxId?: string) => void;
  closeCompose: () => void;
};
