#!/usr/bin/env bun
/**
 * 🧵 Thread Backfill Script
 *
 * Migrates existing emails into threads.
 * Run this ONCE after adding the threads table.
 *
 * Usage:
 *   bun scripts/backfill-threads.ts
 *
 * What it does:
 *   1. Finds all emails without a threadId (oldest first)
 *   2. For each email, finds or creates an appropriate thread
 *   3. Links the email to the thread
 *   4. Updates thread stats
 *
 *   ┌─────────────────────────────────────────────────┐
 *   │  📧 → 🔍 find thread → 🧵 link → ✅ done       │
 *   └─────────────────────────────────────────────────┘
 */

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { eq, and, isNull, asc, gte, desc, sql } from 'drizzle-orm';
import * as schema from '../db/schema';

// Setup database connection
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const db = drizzle(client, { schema });

// How many days to look back for subject-based matching
const SUBJECT_MATCH_DAYS = 7;

/**
 * Normalize email subject for threading comparison
 */
function normalizeSubject(subject: string | null | undefined): string {
  if (!subject) return '';
  const prefixPattern = /^(re|fwd?|fw|aw|sv|r|rif|tr|doorst)(\[\d+\])?:\s*/i;
  let normalized = subject.toLowerCase().trim();
  let prev;
  do {
    prev = normalized;
    normalized = normalized.replace(prefixPattern, '');
  } while (normalized !== prev);
  return normalized.trim();
}

/**
 * Extract Message-IDs from headers
 */
function extractMessageIds(headers: Record<string, string>): string[] {
  const referencesHeader = headers['references'] || headers['References'] || '';
  const inReplyToHeader = headers['in-reply-to'] || headers['In-Reply-To'] || '';
  const idPattern = /<[^>]+>/g;
  const refMatches = referencesHeader.match(idPattern) || [];
  const replyMatches = inReplyToHeader.match(idPattern) || [];
  return Array.from(new Set([...refMatches, ...replyMatches]));
}

async function main() {
  console.log('🧵 Starting thread backfill...\n');

  // Get all emails without a threadId, oldest first
  const orphanEmails = await db
    .select()
    .from(schema.emails)
    .where(isNull(schema.emails.threadId))
    .orderBy(asc(schema.emails.receivedAt));

  console.log(`Found ${orphanEmails.length} emails without threads\n`);

  if (orphanEmails.length === 0) {
    console.log('Nothing to backfill!');
    return;
  }

  let threadsCreated = 0;
  let emailsLinked = 0;

  for (const email of orphanEmails) {
    const headers = email.rawHeaders ? JSON.parse(email.rawHeaders) : {};
    const referencedIds = extractMessageIds(headers);

    let threadId: string | null = null;

    // Strategy 1: Match by Message-ID references
    for (const refId of referencedIds) {
      const matchingEmail = await db
        .select({ threadId: schema.emails.threadId })
        .from(schema.emails)
        .where(
          and(
            eq(schema.emails.inboxId, email.inboxId),
            eq(schema.emails.messageId, refId)
          )
        )
        .get();

      if (matchingEmail?.threadId) {
        threadId = matchingEmail.threadId;
        break;
      }
    }

    // Strategy 2: Match by normalized subject within time window
    if (!threadId) {
      const normalized = normalizeSubject(email.subject);
      if (normalized && email.receivedAt) {
        const emailDate = new Date(email.receivedAt);
        const cutoffDate = new Date(emailDate);
        cutoffDate.setDate(cutoffDate.getDate() - SUBJECT_MATCH_DAYS);
        const cutoffStr = cutoffDate.toISOString().replace('T', ' ').slice(0, 19);

        const matchingThread = await db
          .select({ id: schema.threads.id })
          .from(schema.threads)
          .where(
            and(
              eq(schema.threads.inboxId, email.inboxId),
              eq(schema.threads.normalizedSubject, normalized),
              gte(schema.threads.latestMessageAt, cutoffStr)
            )
          )
          .orderBy(desc(schema.threads.latestMessageAt))
          .get();

        if (matchingThread) {
          threadId = matchingThread.id;
        }
      }
    }

    // Create new thread if no match found
    if (!threadId) {
      const [newThread] = await db
        .insert(schema.threads)
        .values({
          inboxId: email.inboxId,
          normalizedSubject: normalizeSubject(email.subject),
          participants: JSON.stringify([email.fromAddress]),
          messageCount: 0, // Will be updated below
          unreadCount: 0,
          latestPreview: email.bodyText?.substring(0, 200) || null,
          latestMessageAt: email.receivedAt,
        })
        .returning({ id: schema.threads.id });

      threadId = newThread.id;
      threadsCreated++;
      console.log(`  🆕 Created thread: ${threadId.substring(0, 8)}... (${normalizeSubject(email.subject) || 'no subject'})`);
    }

    // Link email to thread
    await db
      .update(schema.emails)
      .set({ threadId })
      .where(eq(schema.emails.id, email.id));

    emailsLinked++;

    // Update thread stats
    const thread = await db
      .select()
      .from(schema.threads)
      .where(eq(schema.threads.id, threadId))
      .get();

    if (thread) {
      const currentParticipants: string[] = thread.participants
        ? JSON.parse(thread.participants)
        : [];

      if (!currentParticipants.includes(email.fromAddress)) {
        currentParticipants.push(email.fromAddress);
      }

      // Check if this email is more recent
      const currentLatest = thread.latestMessageAt
        ? new Date(thread.latestMessageAt).getTime()
        : 0;
      const emailTimestamp = email.receivedAt
        ? new Date(email.receivedAt).getTime()
        : 0;

      const updates: Partial<typeof schema.threads.$inferInsert> = {
        messageCount: (thread.messageCount || 0) + 1,
        participants: JSON.stringify(currentParticipants),
      };

      if (emailTimestamp >= currentLatest) {
        updates.latestMessageAt = email.receivedAt;
        updates.latestPreview = email.bodyText?.substring(0, 200) || null;
      }

      if (!email.isRead) {
        updates.unreadCount = (thread.unreadCount || 0) + 1;
      }

      await db
        .update(schema.threads)
        .set(updates)
        .where(eq(schema.threads.id, threadId));
    }

    if (emailsLinked % 100 === 0) {
      console.log(`  ... processed ${emailsLinked} emails`);
    }
  }

  // Also link sent emails to their threads
  console.log('\nLinking sent emails to threads...');

  const orphanSentEmails = await db
    .select()
    .from(schema.sentEmails)
    .where(isNull(schema.sentEmails.threadId))
    .orderBy(asc(schema.sentEmails.sentAt));

  let sentEmailsLinked = 0;

  for (const sentEmail of orphanSentEmails) {
    // If it has an inReplyToId, get the thread from that email
    if (sentEmail.inReplyToId) {
      const originalEmail = await db
        .select({ threadId: schema.emails.threadId })
        .from(schema.emails)
        .where(eq(schema.emails.id, sentEmail.inReplyToId))
        .get();

      if (originalEmail?.threadId) {
        await db
          .update(schema.sentEmails)
          .set({ threadId: originalEmail.threadId })
          .where(eq(schema.sentEmails.id, sentEmail.id));

        // Update thread message count
        const thread = await db
          .select()
          .from(schema.threads)
          .where(eq(schema.threads.id, originalEmail.threadId))
          .get();

        if (thread) {
          const currentLatest = thread.latestMessageAt
            ? new Date(thread.latestMessageAt).getTime()
            : 0;
          const sentTimestamp = sentEmail.sentAt
            ? new Date(sentEmail.sentAt).getTime()
            : 0;

          const updates: Partial<typeof schema.threads.$inferInsert> = {
            messageCount: (thread.messageCount || 0) + 1,
          };

          if (sentTimestamp >= currentLatest) {
            updates.latestMessageAt = sentEmail.sentAt;
            updates.latestPreview = sentEmail.bodyText?.substring(0, 200) || null;
          }

          await db
            .update(schema.threads)
            .set(updates)
            .where(eq(schema.threads.id, originalEmail.threadId));
        }

        sentEmailsLinked++;
      }
    }
  }

  console.log(`\n✅ Backfill complete!`);
  console.log(`   Threads created: ${threadsCreated}`);
  console.log(`   Emails linked: ${emailsLinked}`);
  console.log(`   Sent emails linked: ${sentEmailsLinked}`);
}

main().catch(console.error);
