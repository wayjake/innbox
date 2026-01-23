-- ===========================================
-- Sub-User System: The Great Inbox Democracy
-- ===========================================
-- Admins reign supreme, but now they can invite
-- trusted souls to peek at specific inboxes.
-- Everyone gets an email, nobody gets too much power.

-- Add user_type column to distinguish admins from invited members
ALTER TABLE `users` ADD `user_type` text DEFAULT 'admin';--> statement-breakpoint

-- Create inbox_members table to track who can see what
CREATE TABLE `inbox_members` (
	`id` text PRIMARY KEY NOT NULL,
	`inbox_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL DEFAULT 'member',
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`inbox_id`) REFERENCES `inboxes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint

-- Unique constraint: one person, one role per inbox (no double-dipping!)
CREATE UNIQUE INDEX `idx_inbox_members_inbox_user` ON `inbox_members` (`inbox_id`, `user_id`);--> statement-breakpoint
CREATE INDEX `idx_inbox_members_inbox_id` ON `inbox_members` (`inbox_id`);--> statement-breakpoint
CREATE INDEX `idx_inbox_members_user_id` ON `inbox_members` (`user_id`);--> statement-breakpoint

-- Create invitation_tokens table for the VIP invite system
CREATE TABLE `invitation_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`inbox_id` text NOT NULL,
	`email` text NOT NULL,
	`invited_by` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`accepted_at` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`inbox_id`) REFERENCES `inboxes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint

CREATE INDEX `idx_invitation_tokens_inbox_id` ON `invitation_tokens` (`inbox_id`);--> statement-breakpoint
CREATE INDEX `idx_invitation_tokens_email` ON `invitation_tokens` (`email`);--> statement-breakpoint

-- ===========================================
-- BACKFILL: Crown the existing inbox creators
-- ===========================================
-- Every inbox that exists today was created by an admin,
-- so let's make sure they're marked as owners in the new system.

INSERT INTO inbox_members (id, inbox_id, user_id, role, created_at)
SELECT
	lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))) as id,
	id as inbox_id,
	user_id,
	'owner' as role,
	datetime('now') as created_at
FROM inboxes;
