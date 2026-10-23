CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`happened_on` text NOT NULL,
	`data` text NOT NULL,
	`source` text NOT NULL,
	`source_key` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `record_source_unique` ON `records` (`owner`,`source`,`source_key`);--> statement-breakpoint
CREATE INDEX `record_owner_date` ON `records` (`owner`,`happened_on`);