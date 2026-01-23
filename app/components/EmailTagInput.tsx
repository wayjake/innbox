import { useState, useRef, useEffect, useCallback, useId } from 'react';
import { cn } from '../utils';

/**
 * 🏷️ Email Tag Input
 *
 * A fancy input that turns email addresses into little pills.
 * Type, hit Enter, and watch your recipients stack up like
 * boxes in a warehouse. Backspace to remove the last one.
 *
 *   ┌─────────────────────────────────────────────────────┐
 *   │ [alice@co.com ×] [bob@org.net ×] type here...      │
 *   └─────────────────────────────────────────────────────┘
 *
 * Features autocomplete from your address book too! 📖
 */

export function EmailTagInput({
  name,
  value,
  onChange,
  placeholder = 'Type email and press Enter',
}: EmailTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputId = useId(); // Stable unique ID to confuse browser autocomplete

  // 🔍 Fetch address book suggestions as user types
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      // Show top contacts when clicking in empty input
      try {
        const res = await fetch('/api/addressbook');
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.contacts || []);
        }
      } catch {
        setSuggestions([]);
      }
      return;
    }

    try {
      const res = await fetch(`/api/addressbook?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        // Filter out already-added emails
        const filtered = (data.contacts || []).filter(
          (c: Contact) => !value.includes(c.email)
        );
        setSuggestions(filtered);
      }
    } catch {
      setSuggestions([]);
    }
  }, [value]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showSuggestions) {
        fetchSuggestions(inputValue);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [inputValue, showSuggestions, fetchSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Basic email validation
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Add an email to the list
  const addEmail = (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (trimmed && isValidEmail(trimmed) && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  // Remove an email from the list
  const removeEmail = (emailToRemove: string) => {
    onChange(value.filter((e) => e !== emailToRemove));
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        addEmail(suggestions[selectedIndex].email);
      } else if (inputValue.trim()) {
        addEmail(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag when backspacing on empty input
      removeEmail(value[value.length - 1]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  // Select a suggestion
  const selectSuggestion = (contact: Contact) => {
    addEmail(contact.email);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={value.join(',')} />

      {/* Tag container with input */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-1 p-2',
          'border border-gray-300 dark:border-gray-700 rounded-lg',
          'bg-white dark:bg-gray-800',
          'focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent',
          'min-h-[42px]'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Email tags */}
        {value.map((email) => (
          <span
            key={email}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
              'bg-indigo-100 dark:bg-indigo-900/50',
              'text-indigo-700 dark:text-indigo-300 text-sm'
            )}
          >
            {email}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeEmail(email);
              }}
              className="hover:text-indigo-900 dark:hover:text-indigo-100"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}

        {/* Text input - using nope + unique name tricks to beat browser autocomplete 🥊 */}
        <input
          ref={inputRef}
          type="text"
          name={`recipient_search_${inputId}`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => {
            setShowSuggestions(true);
            fetchSuggestions(inputValue);
          }}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          autoComplete="nope"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-lpignore="true"
          data-form-type="other"
          aria-autocomplete="list"
          className={cn(
            'flex-1 min-w-[120px] outline-none',
            'bg-transparent text-gray-900 dark:text-white text-sm',
            'placeholder-gray-400 dark:placeholder-gray-500'
          )}
        />
      </div>

      {/* Autocomplete dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          className={cn(
            'absolute z-10 w-full mt-1',
            'bg-white dark:bg-gray-800 rounded-lg shadow-lg',
            'border border-gray-200 dark:border-gray-700',
            'max-h-48 overflow-y-auto'
          )}
        >
          {suggestions.map((contact, index) => (
            <button
              key={contact.email}
              type="button"
              onClick={() => selectSuggestion(contact)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'transition-colors',
                index === selectedIndex && 'bg-gray-100 dark:bg-gray-700'
              )}
            >
              <div className="font-medium text-gray-900 dark:text-white">
                {contact.email}
              </div>
              {contact.name && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {contact.name}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Types live down here, chilling with the other type definitions
// ─────────────────────────────────────────────────────────────

type Contact = {
  email: string;
  name: string | null;
  timesUsed: number | null;
};

type EmailTagInputProps = {
  name: string;
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
};
