CREATE TABLE `inbox_members` (
	`id` text PRIMARY KEY NOT NULL,
	`inbox_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`inbox_id`) REFERENCES `inboxes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_inbox_members_inbox_user` ON `inbox_members` (`inbox_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_inbox_members_inbox_id` ON `inbox_members` (`inbox_id`);--> statement-breakpoint
CREATE INDEX `idx_inbox_members_user_id` ON `inbox_members` (`user_id`);--> statement-breakpoint
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
);
--> statement-breakpoint
CREATE INDEX `idx_invitation_tokens_inbox_id` ON `invitation_tokens` (`inbox_id`);--> statement-breakpoint
CREATE INDEX `idx_invitation_tokens_email` ON `invitation_tokens` (`email`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')),
	`updated_by` text,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `users` ADD `user_type` text DEFAULT 'admin';