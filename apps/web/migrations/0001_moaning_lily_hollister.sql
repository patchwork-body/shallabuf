CREATE TABLE `key` (
	`id` text PRIMARY KEY NOT NULL,
	`primary` integer DEFAULT false NOT NULL,
	`password` text,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `session` ADD `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL;