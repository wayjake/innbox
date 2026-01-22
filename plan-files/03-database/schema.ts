// db/schema.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ===========================================
// USERS
// ===========================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),

  // Push notifications
  pushSubscription: text('push_subscription'), // JSON

  // Timestamps
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
}));

// ===========================================
// SESSIONS
// ===========================================

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
}, (table) => ({
  userIdIdx: index('idx_sessions_user_id').on(table.userId),
}));

// ===========================================
// INBOXES
// ===========================================

export const inboxes = sqliteTable('inboxes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  localPart: text('local_part').unique().notNull(), // e.g., "jake"
  name: text('name'), // display name
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => ({
  userIdIdx: index('idx_inboxes_user_id').on(table.userId),
  localPartIdx: index('idx_inboxes_local_part').on(table.localPart),
}));

// ===========================================
// EMAILS (Received)
// ===========================================

export const emails = sqliteTable('emails', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  inboxId: text('inbox_id').notNull().references(() => inboxes.id, { onDelete: 'cascade' }),

  // Email metadata
  messageId: text('message_id'),
  fromAddress: text('from_address').notNull(),
  fromName: text('from_name'),
  toAddress: text('to_address').notNull(),
  replyTo: text('reply_to'),
  subject: text('subject'),

  // Content
  bodyText: text('body_text'),
  bodyHtml: text('body_html'),
  rawHeaders: text('raw_headers'), // JSON
  rawEmailKey: text('raw_email_key'), // UploadThing key for .eml file

  // State
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  isStarred: integer('is_starred', { mode: 'boolean' }).default(false),

  // Timestamps
  receivedAt: text('received_at').default(sql`(datetime('now'))`),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
}, (table) => ({
  inboxIdIdx: index('idx_emails_inbox_id').on(table.inboxId),
  receivedAtIdx: index('idx_emails_received_at').on(table.receivedAt),
  fromAddressIdx: index('idx_emails_from_address').on(table.fromAddress),
}));

// ===========================================
// ATTACHMENTS
// ===========================================

export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  emailId: text('email_id').notNull().references(() => emails.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  uploadthingKey: text('uploadthing_key').notNull(),
  uploadthingUrl: text('uploadthing_url').notNull(),
  contentId: text('content_id'), // For inline images
  isInline: integer('is_inline', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
}, (table) => ({
  emailIdIdx: index('idx_attachments_email_id').on(table.emailId),
}));

// ===========================================
// SENT EMAILS (Outbound)
// ===========================================

export const sentEmails = sqliteTable('sent_emails', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  inboxId: text('inbox_id').notNull().references(() => inboxes.id, { onDelete: 'cascade' }),

  // Reply reference (null if new email)
  inReplyToId: text('in_reply_to_id').references(() => emails.id, { onDelete: 'set null' }),

  // Recipients (JSON arrays)
  toAddresses: text('to_addresses').notNull(),
  ccAddresses: text('cc_addresses'),
  bccAddresses: text('bcc_addresses'),

  // Content
  subject: text('subject'),
  bodyText: text('body_text'),
  bodyHtml: text('body_html'),

  // Brevo tracking
  brevoMessageId: text('brevo_message_id'),
  status: text('status').default('sent'), // sent, delivered, bounced, failed

  // Timestamps
  sentAt: text('sent_at').default(sql`(datetime('now'))`),
}, (table) => ({
  inboxIdIdx: index('idx_sent_emails_inbox_id').on(table.inboxId),
  sentAtIdx: index('idx_sent_emails_sent_at').on(table.sentAt),
}));

// ===========================================
// TYPE EXPORTS
// ===========================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Inbox = typeof inboxes.$inferSelect;
export type NewInbox = typeof inboxes.$inferInsert;

export type Email = typeof emails.$inferSelect;
export type NewEmail = typeof emails.$inferInsert;

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;

export type SentEmail = typeof sentEmails.$inferSelect;
export type NewSentEmail = typeof sentEmails.$inferInsert;
