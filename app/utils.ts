import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 🎨 Tailwind class merger
 *
 * Combines classes intelligently so you can write:
 *   cn('px-4 py-2', isActive && 'bg-blue-500', className)
 *
 * Without worrying about conflicting utilities.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
