import { useState, useEffect } from 'react';
import { useFetcher } from 'react-router';
import { cn } from '../utils';
import { useCompose } from '../context/ComposeContext';
import { useToast } from '../context/ToastContext';
import { EmailTagInput } from './EmailTagInput';

/**
 * ✏️ Compose Modal
 *
 * The slide-up email composer that lives at the bottom of your screen.
 * Like a little email submarine surfacing when you need it.
 *
 *   ┌─────────────────────────────────────┐
 *   │  ✕  New Message                     │
 *   ├─────────────────────────────────────┤
 *   │  From: [dropdown] ▼                 │
 *   │  To:   [fancy tag input]            │
 *   │  Subject: ______________________    │
 *   │  ┌───────────────────────────────┐  │
 *   │  │ Write something brilliant...  │  │
 *   │  └───────────────────────────────┘  │
 *   │                         [Send] 📤   │
 *   └─────────────────────────────────────┘
 */

export function ComposeModal({ inboxes, appDomain }: ComposeModalProps) {
  const { isOpen, selectedInboxId, closeCompose } = useCompose();
  const { showToast } = useToast();
  const fetcher = useFetcher();

  // Form state
  const [inboxId, setInboxId] = useState<string>('');
  const [toEmails, setToEmails] = useState<string[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [bccEmails, setBccEmails] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);

  // 🎯 Pre-select inbox when opened with a specific one
  useEffect(() => {
    if (selectedInboxId) {
      setInboxId(selectedInboxId);
    } else if (inboxes.length > 0 && !inboxId) {
      setInboxId(inboxes[0].id);
    }
  }, [selectedInboxId, inboxes, inboxId]);

  // 🎉 Handle successful send
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if (fetcher.data.success) {
        showToast('Email sent!', { description: 'Your message is on its way' });
        resetForm();
        closeCompose();
      } else if (fetcher.data.error) {
        showToast('Failed to send', { description: fetcher.data.error });
      }
    }
  }, [fetcher.state, fetcher.data, showToast, closeCompose]);

  const resetForm = () => {
    setToEmails([]);
    setCcEmails([]);
    setBccEmails([]);
    setSubject('');
    setBodyText('');
    setShowCcBcc(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inboxId || toEmails.length === 0 || !subject) {
      showToast('Missing fields', { description: 'Please fill in To, Subject, and select an inbox' });
      return;
    }

    const formData = new FormData();
    formData.set('inboxId', inboxId);
    formData.set('to', toEmails.join(','));
    formData.set('cc', ccEmails.join(','));
    formData.set('bcc', bccEmails.join(','));
    formData.set('subject', subject);
    formData.set('bodyText', bodyText);

    fetcher.submit(formData, { method: 'POST', action: '/api/email/send' });
  };

  const isLoading = fetcher.state !== 'idle';
  const selectedInbox = inboxes.find((i) => i.id === inboxId);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - subtle overlay */}
      <div
        className="fixed inset-0 bg-black/10 z-40"
        onClick={closeCompose}
      />

      {/* Modal - slides up from bottom right */}
      <div
        className={cn(
          'fixed bottom-4 right-4 z-50',
          'w-[500px] max-h-[80vh]',
          'bg-white dark:bg-gray-900',
          'rounded-lg shadow-2xl',
          'border border-gray-200 dark:border-gray-700',
          'flex flex-col',
          'animate-slide-up-compose'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            New Message
          </h2>
          <button
            type="button"
            onClick={closeCompose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {/* From (inbox selector) */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 dark:text-gray-400 w-12">From</label>
              <select
                value={inboxId}
                onChange={(e) => setInboxId(e.target.value)}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded-lg text-sm',
                  'border border-gray-300 dark:border-gray-700',
                  'bg-white dark:bg-gray-800',
                  'text-gray-900 dark:text-white',
                  'focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                )}
              >
                {inboxes.map((inbox) => (
                  <option key={inbox.id} value={inbox.id}>
                    {inbox.localPart}@{appDomain}
                  </option>
                ))}
              </select>
            </div>

            {/* To */}
            <div className="flex items-start gap-2">
              <label className="text-sm text-gray-500 dark:text-gray-400 w-12 pt-2">To</label>
              <div className="flex-1">
                <EmailTagInput
                  name="to"
                  value={toEmails}
                  onChange={setToEmails}
                  placeholder="Add recipients..."
                />
              </div>
              {!showCcBcc && (
                <button
                  type="button"
                  onClick={() => setShowCcBcc(true)}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 pt-2"
                >
                  Cc/Bcc
                </button>
              )}
            </div>

            {/* Cc (collapsible) */}
            {showCcBcc && (
              <>
                <div className="flex items-start gap-2">
                  <label className="text-sm text-gray-500 dark:text-gray-400 w-12 pt-2">Cc</label>
                  <div className="flex-1">
                    <EmailTagInput
                      name="cc"
                      value={ccEmails}
                      onChange={setCcEmails}
                      placeholder="Add Cc recipients..."
                    />
                  </div>
                </div>

                {/* Bcc */}
                <div className="flex items-start gap-2">
                  <label className="text-sm text-gray-500 dark:text-gray-400 w-12 pt-2">Bcc</label>
                  <div className="flex-1">
                    <EmailTagInput
                      name="bcc"
                      value={bccEmails}
                      onChange={setBccEmails}
                      placeholder="Add Bcc recipients..."
                    />
                  </div>
                </div>
              </>
            )}

            {/* Subject */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 dark:text-gray-400 w-12">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
                className={cn(
                  'flex-1 px-3 py-1.5 rounded-lg text-sm',
                  'border border-gray-300 dark:border-gray-700',
                  'bg-white dark:bg-gray-800',
                  'text-gray-900 dark:text-white placeholder-gray-400',
                  'focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                )}
              />
            </div>

            {/* Body */}
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Write your message..."
              rows={8}
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm resize-none',
                'border border-gray-300 dark:border-gray-700',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-white placeholder-gray-400',
                'focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
              )}
            />
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              type="submit"
              disabled={isLoading || toEmails.length === 0}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium',
                'bg-indigo-600 hover:bg-indigo-700 text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors',
                'flex items-center gap-2'
              )}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  Send
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Types hang out at the bottom, as is tradition
// ─────────────────────────────────────────────────────────────

type Inbox = {
  id: string;
  localPart: string;
  name: string | null;
};

type ComposeModalProps = {
  inboxes: Inbox[];
  appDomain: string;
};
