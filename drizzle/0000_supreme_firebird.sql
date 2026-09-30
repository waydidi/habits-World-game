CREATE TABLE `habit_days` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`read_at` text NOT NULL,
	`reward_at` text,
	PRIMARY KEY(`user_id`, `day`),
	CONSTRAINT "reward_after_read" CHECK("habit_days"."reward_at" IS NULL OR "habit_days"."reward_at" >= "habit_days"."read_at")
);
