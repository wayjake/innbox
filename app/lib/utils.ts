import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 🎨 The magical class name combiner
 *
 * Merges Tailwind classes intelligently — no more
 * "bg-red-500 bg-blue-500" conflicts. The last one wins.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
