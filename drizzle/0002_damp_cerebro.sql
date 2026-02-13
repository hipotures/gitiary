CREATE TABLE `commit_stats` (
	`repo_id` integer NOT NULL,
	`sha` text NOT NULL,
	`committed_at` text NOT NULL,
	`day` text NOT NULL,
	`message` text NOT NULL,
	`additions` integer DEFAULT 0 NOT NULL,
	`deletions` integer DEFAULT 0 NOT NULL,
	`files_changed` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`repo_id`, `sha`),
	FOREIGN KEY (`repo_id`) REFERENCES `repo`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `commit_stats_day_idx` ON `commit_stats` (`day`);--> statement-breakpoint
CREATE INDEX `commit_stats_repo_day_idx` ON `commit_stats` (`repo_id`,`day`);--> statement-breakpoint
ALTER TABLE `daily` ADD `additions` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `daily` ADD `deletions` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `daily` ADD `files_changed` integer DEFAULT 0 NOT NULL;