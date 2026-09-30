import { INSERT_READING, CLAIM_BREAKFAST, COUNT_COMPLETED, CLAIM_LEVEL_TWO } from "@/lib/habit-queries";
import { getRawDb } from "./index";
import { bangkokDay, summarize, HABITS_PER_LEVEL, type HabitDay, type HabitState } from "@/lib/habit-rules";
export async function loadHabits(userId: string): Promise<HabitState> {
  const db = getRawDb(); const day = bangkokDay();
  const results = await db.batch([
    db.prepare("SELECT day, read_at AS readAt, reward_at AS rewardAt FROM habit_days WHERE user_id = ? AND day = ?").bind(userId, day),
    db.prepare("SELECT day, read_at AS readAt, reward_at AS rewardAt FROM habit_days WHERE user_id = ? ORDER BY day DESC LIMIT 30").bind(userId),
    db.prepare(COUNT_COMPLETED).bind(userId),
    db.prepare("SELECT claimed_at AS claimedAt FROM milestone_rewards WHERE user_id = ? AND milestone = 'level_2'").bind(userId),
  ]);
  const today = (results[0].results[0] as HabitDay | undefined) ?? null;
  return summarize(day, today, results[1].results as HabitDay[], Number((results[2].results[0] as { completed: number }).completed), (results[3].results[0] as { claimedAt: string } | undefined)?.claimedAt ?? null);
}
export async function completeReading(userId: string, day: string) {
  await getRawDb().prepare(INSERT_READING)
    .bind(userId, day, new Date().toISOString()).run();
}
export async function claimBreakfast(userId: string, day: string): Promise<boolean> {
  const db = getRawDb();
  await db.prepare(CLAIM_BREAKFAST)
    .bind(new Date().toISOString(), userId, day).run();
  const row = await db.prepare("SELECT reward_at FROM habit_days WHERE user_id = ? AND day = ?").bind(userId, day).first<{ reward_at: string | null }>();
  return Boolean(row?.reward_at);
}

export async function claimLevelTwoReward(userId: string): Promise<boolean> {
  const db = getRawDb();
  await db.prepare(CLAIM_LEVEL_TWO).bind(userId, new Date().toISOString(), userId, HABITS_PER_LEVEL).run();
  return Boolean(await db.prepare("SELECT claimed_at FROM milestone_rewards WHERE user_id = ? AND milestone = 'level_2'").bind(userId).first());
}
