import { sqliteTable, text, integer, real, primaryKey, check } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const habitDays = sqliteTable("habit_days", {
  userId: text("user_id").notNull(),
  day: text("day").notNull(),
  readAt: text("read_at").notNull(),
  rewardAt: text("reward_at"),
}, (table) => [
  primaryKey({ columns: [table.userId, table.day] }),
  check("reward_after_read", sql`${table.rewardAt} IS NULL OR ${table.rewardAt} >= ${table.readAt}`),
]);

export const milestoneRewards = sqliteTable("milestone_rewards", {
  userId: text("user_id").notNull(),
  milestone: text("milestone").notNull(),
  claimedAt: text("claimed_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.milestone] })]);

export const questCompletions = sqliteTable("quest_completions", {
 userId:text("user_id").notNull(), day:text("day").notNull(),questId:text("quest_id").notNull(),
 xp:integer("xp").notNull(),completedAt:text("completed_at").notNull(),
},t=>[primaryKey({columns:[t.userId,t.day,t.questId]}),check("positive_quest_xp",sql`${t.xp} >= 0`)]);
export const playerProfiles = sqliteTable("player_profiles", {
 userId:text("user_id").primaryKey(),settings:text("settings").notNull(),
});
export const cannabisLogs = sqliteTable("cannabis_logs", {
 userId:text("user_id").notNull(),day:text("day").notNull(),grams:real("grams").notNull(),
 trigger:text("trigger").notNull(),
},t=>[primaryKey({columns:[t.userId,t.day]}),check("nonnegative_grams",sql`${t.grams} >= 0`)]);
