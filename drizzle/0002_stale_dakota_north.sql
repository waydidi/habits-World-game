CREATE TABLE `cannabis_logs` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`grams` real NOT NULL,
	`trigger` text NOT NULL,
	PRIMARY KEY(`user_id`, `day`),
	CONSTRAINT "nonnegative_grams" CHECK("cannabis_logs"."grams" >= 0)
);
--> statement-breakpoint
CREATE TABLE `player_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`settings` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quest_completions` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`quest_id` text NOT NULL,
	`xp` integer NOT NULL,
	`completed_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `day`, `quest_id`),
	CONSTRAINT "positive_quest_xp" CHECK("quest_completions"."xp" >= 0)
);
