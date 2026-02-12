CREATE TABLE `daily` (
	`repo_id` integer NOT NULL,
	`day` text NOT NULL,
	`commits` integer NOT NULL,
	PRIMARY KEY(`repo_id`, `day`),
	FOREIGN KEY (`repo_id`) REFERENCES `repo`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `repo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_sync_at` text,
	`created_at` text NOT NULL
);
