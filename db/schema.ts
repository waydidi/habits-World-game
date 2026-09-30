import { sqliteTable, text, primaryKey, check } from "drizzle-orm/sqlite-core";
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
