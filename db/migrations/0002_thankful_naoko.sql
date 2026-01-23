CREATE TABLE `address_book` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`times_used` integer DEFAULT 1,
	`last_used_at` text DEFAULT (datetime('now')),
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_address_book_user_email` ON `address_book` (`user_id`,`email`);--> statement-breakpoint
CREATE INDEX `idx_address_book_user_id` ON `address_book` (`user_id`);--> statement-breakpoint
CREATE TABLE `threads` (
	`id` text PRIMARY KEY NOT NULL,
	`inbox_id` text NOT NULL,
	`normalized_subject` text NOT NULL,
	`participants` text,
	`message_count` integer DEFAULT 1,
	`unread_count` integer DEFAULT 0,
	`latest_message_id` text,
	`latest_message_at` text,
	`latest_preview` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`inbox_id`) REFERENCES `inboxes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_threads_inbox_id` ON `threads` (`inbox_id`);--> statement-breakpoint
CREATE INDEX `idx_threads_latest_at` ON `threads` (`latest_message_at`);--> statement-breakpoint
CREATE INDEX `idx_threads_normalized_subject` ON `threads` (`normalized_subject`);--> statement-breakpoint
ALTER TABLE `emails` ADD `thread_id` text REFERENCES threads(id);--> statement-breakpoint
CREATE INDEX `idx_emails_thread_id` ON `emails` (`thread_id`);--> statement-breakpoint
ALTER TABLE `sent_emails` ADD `thread_id` text REFERENCES threads(id);--> statement-breakpoint
ALTER TABLE `sent_emails` ADD `message_id` text;--> statement-breakpoint
CREATE INDEX `idx_sent_emails_thread_id` ON `sent_emails` (`thread_id`);