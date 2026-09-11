-- Mentor becomes judge. SQLite cannot rewrite a CHECK in place, so the table
-- is rebuilt. Existing mentor rows keep their answers; only the type changes.
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `applications__new` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`submitted_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "applications_type_check" CHECK("type" in ('hacker', 'judge')),
	CONSTRAINT "applications_status_check" CHECK("status" in ('draft', 'submitted', 'under_review', 'accepted', 'waitlisted', 'rejected')),
	CONSTRAINT "applications_submitted_at_check" CHECK(("status" = 'draft') = ("submitted_at" is null))
);
--> statement-breakpoint
INSERT INTO `applications__new` (`id`, `user_id`, `type`, `status`, `answers`, `submitted_at`, `created_at`, `updated_at`)
SELECT
	`id`,
	`user_id`,
	CASE `type` WHEN 'mentor' THEN 'judge' ELSE `type` END,
	`status`,
	`answers`,
	`submitted_at`,
	`created_at`,
	`updated_at`
FROM `applications`;
--> statement-breakpoint
DROP TABLE `applications`;
--> statement-breakpoint
ALTER TABLE `applications__new` RENAME TO `applications`;
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_user_type_unique` ON `applications` (`user_id`,`type`);
--> statement-breakpoint
CREATE INDEX `applications_status_idx` ON `applications` (`status`);
--> statement-breakpoint
CREATE INDEX `applications_submitted_idx` ON `applications` (`submitted_at`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
