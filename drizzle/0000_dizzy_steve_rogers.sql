CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`config` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `collections_owner_created` ON `collections` (`owner`,`created`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`owner` text NOT NULL,
	`position` integer NOT NULL,
	`prompt` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`image` text,
	`error` text,
	`started` integer,
	`attempt` text
);
--> statement-breakpoint
CREATE INDEX `jobs_collection_position` ON `jobs` (`collection_id`,`position`);--> statement-breakpoint
CREATE INDEX `jobs_owner_status` ON `jobs` (`owner`,`status`);--> statement-breakpoint
CREATE TABLE `settings` (
	`owner` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`model` text NOT NULL
);
