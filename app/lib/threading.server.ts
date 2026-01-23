/**
 * 🧵 Email Threading Utilities
 *
 * Gmail-compatible email threading that groups related messages.
 * Uses References/In-Reply-To headers as primary signal,
 * with normalized subject matching as fallback.
 *
 *   ┌─────────────────────────────────────────────────────┐
 *   │  "The thread that connects us all..."              │
 *   │                                                     │
 *   │  Email A  ──────────────────────────▶  Thread 1    │
 *   │     └── Reply B  ──References──────▶  Thread 1    │
 *   │          └── Reply C  ────────────▶  Thread 1    │
 *   │                                                     │
 *   │  Email D (same subject, 3 days later) ▶ Thread 1  │
 *   │  Email E (same subject, 8 days later) ▶ Thread 2  │
 *   └─────────────────────────────────────────────────────┘
 */

import { db } from './db.server';
import { threads, emails, sentEmails } from '../../db/schema';
import { eq, and, or, gte, desc, sql } from 'drizzle-orm';

// How many days to look back for subject-based matching
const SUBJECT_MATCH_DAYS = 7;

/**
 * Normalize email subject for threading comparison
 *
 * Strips common prefixes: Re:, Fwd:, FW:, RE:, Fwd[n]:, etc.
 * Also handles localized prefixes like "AW:" (German), "SV:" (Swedish)
 *
 * @example normalizeSubject("Re: Re: Fwd: Hello World!") => "hello world!"
 */
export function normalizeSubject(subject: string | null | undefined): string {
  if (!subject) return '';

  // Common reply/forward prefixes across languages
  const prefixPattern = /^(re|fwd?|fw|aw|sv|r|rif|tr|doorst)(\[\d+\])?:\s*/i;

  let normalized = subject.toLowerCase().trim();

  // Keep stripping prefixes until none remain
  let prev;
  do {
    prev = normalized;
    normalized = normalized.replace(prefixPattern, '');
  } while (normalized !== prev);

  return normalized.trim();
}

/**
 * Extract Message-IDs from References and In-Reply-To headers
 *
 * These headers contain angle-bracketed message IDs that form
 * the reply chain. Gmail uses these as primary threading signal.
 *
 * @example extractMessageIds(headers) => ['<abc@example.com>', '<def@example.com>']
 */
export function extractMessageIds(headers: Record<string, string>): string[] {
  const messageIds: string[] = [];

  // Collect from both headers
  const referencesHeader = headers['references'] || headers['References'] || '';
  const inReplyToHeader = headers['in-reply-to'] || headers['In-Reply-To'] || '';

  // Extract all message IDs (angle-bracketed strings)
  const idPattern = /<[^>]+>/g;

  const refMatches = referencesHeader.match(idPattern) || [];
  const replyMatches = inReplyToHeader.match(idPattern) || [];

  // Combine and deduplicate
  const allIds = new Set([...refMatches, ...replyMatches]);
  return Array.from(allIds);
}

/**
 * Find an existing thread for an incoming email
 *
 * Threading strategy (Gmail-compatible):
 * 1. Check if any referenced Message-ID belongs to an existing thread
 * 2. Fall back to normalized subject match within SUBJECT_MATCH_DAYS
 *
 * @returns Thread ID if found, null otherwise
 */
export async function findThreadForEmail(
  inboxId: string,
  messageId: string | null,
  headers: Record<string, string>,
  subject: string | null
): Promise<string | null> {
  const referencedIds = extractMessageIds(headers);

  // Strategy 1: Match by Message-ID references (strongest signal)
  if (referencedIds.length > 0) {
    // Check received emails
    for (const refId of referencedIds) {
      const matchingEmail = await db
        .select({ threadId: emails.threadId })
        .from(emails)
        .where(and(eq(emails.inboxId, inboxId), eq(emails.messageId, refId)))
        .get();

      if (matchingEmail?.threadId) {
        return matchingEmail.threadId;
      }

      // Also check sent emails
      const matchingSent = await db
        .select({ threadId: sentEmails.threadId })
        .from(sentEmails)
        .where(and(eq(sentEmails.inboxId, inboxId), eq(sentEmails.messageId, refId)))
        .get();

      if (matchingSent?.threadId) {
        return matchingSent.threadId;
      }
    }
  }

  // Strategy 2: Match by normalized subject within time window
  const normalized = normalizeSubject(subject);
  if (normalized) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - SUBJECT_MATCH_DAYS);
    const cutoffStr = cutoffDate.toISOString().replace('T', ' ').slice(0, 19);

    const matchingThread = await db
      .select({ id: threads.id })
      .from(threads)
      .where(
        and(
          eq(threads.inboxId, inboxId),
          eq(threads.normalizedSubject, normalized),
          gte(threads.latestMessageAt, cutoffStr)
        )
      )
      .orderBy(desc(threads.latestMessageAt))
      .get();

    if (matchingThread) {
      return matchingThread.id;
    }
  }

  return null;
}

/**
 * Create a new thread for an email
 */
export async function createThread(
  inboxId: string,
  subject: string | null,
  fromAddress: string,
  preview: string | null,
  receivedAt: string | null
): Promise<string> {
  const [thread] = await db
    .insert(threads)
    .values({
      inboxId,
      normalizedSubject: normalizeSubject(subject),
      participants: JSON.stringify([fromAddress]),
      messageCount: 1,
      unreadCount: 1,
      latestPreview: preview?.substring(0, 200) || null,
      latestMessageAt: receivedAt || new Date().toISOString().replace('T', ' ').slice(0, 19),
    })
    .returning({ id: threads.id });

  return thread.id;
}

/**
 * Create a new thread for a sent email (one-off, not a reply)
 *
 * Unlike createThread(), this starts with unreadCount: 0
 * because we wrote it—nothing to "read" yet!
 * When they reply, the thread will already exist 📬
 */
export async function createThreadForSentEmail(
  inboxId: string,
  subject: string | null,
  recipientAddress: string,
  preview: string | null,
  sentAt: string | null
): Promise<string> {
  const [thread] = await db
    .insert(threads)
    .values({
      inboxId,
      normalizedSubject: normalizeSubject(subject),
      participants: JSON.stringify([recipientAddress]),
      messageCount: 1,
      unreadCount: 0, // Sent emails aren't "unread"
      latestPreview: preview?.substring(0, 200) || null,
      latestMessageAt: sentAt || new Date().toISOString().replace('T', ' ').slice(0, 19),
    })
    .returning({ id: threads.id });

  return thread.id;
}

/**
 * Update thread stats after a new message is added
 */
export async function updateThreadStats(
  threadId: string,
  opts: {
    messageId?: string;
    preview?: string | null;
    timestamp?: string | null;
    fromAddress?: string;
    incrementUnread?: boolean;
    decrementUnread?: boolean;
    isSentEmail?: boolean;
  }
): Promise<void> {
  const thread = await db.select().from(threads).where(eq(threads.id, threadId)).get();
  if (!thread) return;

  const updates: Partial<typeof threads.$inferInsert> = {};

  // Update message count
  if (!opts.isSentEmail) {
    updates.messageCount = (thread.messageCount || 0) + 1;
  } else {
    // Sent emails also count in thread
    updates.messageCount = (thread.messageCount || 0) + 1;
  }

  // Update latest message info
  if (opts.timestamp) {
    const currentLatest = thread.latestMessageAt
      ? new Date(thread.latestMessageAt).getTime()
      : 0;
    const newTimestamp = new Date(opts.timestamp).getTime();

    if (newTimestamp >= currentLatest) {
      updates.latestMessageAt = opts.timestamp;
      if (opts.messageId) updates.latestMessageId = opts.messageId;
      if (opts.preview !== undefined) updates.latestPreview = opts.preview?.substring(0, 200) || null;
    }
  }

  // Update unread count
  if (opts.incrementUnread) {
    updates.unreadCount = (thread.unreadCount || 0) + 1;
  } else if (opts.decrementUnread && (thread.unreadCount || 0) > 0) {
    updates.unreadCount = (thread.unreadCount || 0) - 1;
  }

  // Update participants
  if (opts.fromAddress) {
    const currentParticipants: string[] = thread.participants
      ? JSON.parse(thread.participants)
      : [];
    if (!currentParticipants.includes(opts.fromAddress)) {
      currentParticipants.push(opts.fromAddress);
      updates.participants = JSON.stringify(currentParticipants);
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.update(threads).set(updates).where(eq(threads.id, threadId));
  }
}

/**
 * Recalculate unread count for a thread
 * (useful after marking emails as read)
 */
export async function recalculateThreadUnreadCount(threadId: string): Promise<void> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(emails)
    .where(and(eq(emails.threadId, threadId), eq(emails.isRead, false)))
    .get();

  const unreadCount = result?.count || 0;

  await db
    .update(threads)
    .set({ unreadCount })
    .where(eq(threads.id, threadId));
}
