CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`email_id` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`uploadthing_key` text NOT NULL,
	`uploadthing_url` text NOT NULL,
	`content_id` text,
	`is_inline` integer DEFAULT false,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`email_id`) REFERENCES `emails`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_attachments_email_id` ON `attachments` (`email_id`);--> statement-breakpoint
CREATE TABLE `emails` (
	`id` text PRIMARY KEY NOT NULL,
	`inbox_id` text NOT NULL,
	`message_id` text,
	`from_address` text NOT NULL,
	`from_name` text,
	`to_address` text NOT NULL,
	`reply_to` text,
	`subject` text,
	`body_text` text,
	`body_html` text,
	`raw_headers` text,
	`raw_email_key` text,
	`is_read` integer DEFAULT false,
	`is_starred` integer DEFAULT false,
	`received_at` text DEFAULT (datetime('now')),
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`inbox_id`) REFERENCES `inboxes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_emails_inbox_id` ON `emails` (`inbox_id`);--> statement-breakpoint
CREATE INDEX `idx_emails_received_at` ON `emails` (`received_at`);--> statement-breakpoint
CREATE INDEX `idx_emails_from_address` ON `emails` (`from_address`);--> statement-breakpoint
CREATE TABLE `inboxes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`local_part` text NOT NULL,
	`name` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inboxes_local_part_unique` ON `inboxes` (`local_part`);--> statement-breakpoint
CREATE INDEX `idx_inboxes_user_id` ON `inboxes` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_inboxes_local_part` ON `inboxes` (`local_part`);--> statement-breakpoint
CREATE TABLE `sent_emails` (
	`id` text PRIMARY KEY NOT NULL,
	`inbox_id` text NOT NULL,
	`in_reply_to_id` text,
	`to_addresses` text NOT NULL,
	`cc_addresses` text,
	`bcc_addresses` text,
	`subject` text,
	`body_text` text,
	`body_html` text,
	`brevo_message_id` text,
	`status` text DEFAULT 'sent',
	`sent_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`inbox_id`) REFERENCES `inboxes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`in_reply_to_id`) REFERENCES `emails`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_sent_emails_inbox_id` ON `sent_emails` (`inbox_id`);--> statement-breakpoint
CREATE INDEX `idx_sent_emails_sent_at` ON `sent_emails` (`sent_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_user_id` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text,
	`push_subscription` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);