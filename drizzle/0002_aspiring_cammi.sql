ALTER TABLE settings ADD `json` text NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` DROP COLUMN `name`;--> statement-breakpoint
ALTER TABLE `settings` DROP COLUMN `value`;