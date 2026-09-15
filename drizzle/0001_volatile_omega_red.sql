ALTER TABLE `settings` ADD `provider` text DEFAULT 'gemini' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `doubao_secret` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `doubao_model` text DEFAULT 'doubao-seedream-5-0-pro-260628' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `gemini_cooldown` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `doubao_cooldown` integer DEFAULT 0 NOT NULL;