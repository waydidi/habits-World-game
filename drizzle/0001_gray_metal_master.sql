CREATE TABLE `milestone_rewards` (
	`user_id` text NOT NULL,
	`milestone` text NOT NULL,
	`claimed_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `milestone`)
);
