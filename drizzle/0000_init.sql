CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`submitted_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "applications_type_check" CHECK("applications"."type" in ('hacker', 'mentor')),
	CONSTRAINT "applications_status_check" CHECK("applications"."status" in ('draft', 'submitted', 'under_review', 'accepted', 'waitlisted', 'rejected')),
	CONSTRAINT "applications_submitted_at_check" CHECK(("applications"."status" = 'draft') = ("applications"."submitted_at" is null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_user_type_unique` ON `applications` (`user_id`,`type`);--> statement-breakpoint
CREATE INDEX `applications_status_idx` ON `applications` (`status`);--> statement-breakpoint
CREATE INDEX `applications_submitted_idx` ON `applications` (`submitted_at`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`technical` integer NOT NULL,
	`passion` integer NOT NULL,
	`fit` integer NOT NULL,
	`total` integer GENERATED ALWAYS AS (technical + passion + fit) STORED,
	`comment` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "reviews_technical_check" CHECK("reviews"."technical" between 1 and 5),
	CONSTRAINT "reviews_passion_check" CHECK("reviews"."passion" between 1 and 5),
	CONSTRAINT "reviews_fit_check" CHECK("reviews"."fit" between 1 and 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_application_reviewer_unique` ON `reviews` (`application_id`,`reviewer_id`);--> statement-breakpoint
CREATE INDEX `reviews_application_idx` ON `reviews` (`application_id`);--> statement-breakpoint
CREATE INDEX `reviews_reviewer_idx` ON `reviews` (`reviewer_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expiry_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `status_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`actor_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "status_events_to_check" CHECK("status_events"."to_status" in ('draft', 'submitted', 'under_review', 'accepted', 'waitlisted', 'rejected')),
	CONSTRAINT "status_events_from_check" CHECK("status_events"."from_status" is null or "status_events"."from_status" in ('draft', 'submitted', 'under_review', 'accepted', 'waitlisted', 'rejected'))
);
--> statement-breakpoint
CREATE INDEX `status_events_application_idx` ON `status_events` (`application_id`,`id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`role` text DEFAULT 'applicant' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "users_role_check" CHECK("users"."role" in ('applicant', 'organizer'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);