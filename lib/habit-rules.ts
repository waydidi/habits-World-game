export type HabitDay = { day: string; readAt: string; rewardAt: string | null };
export type HabitState = {
  day: string; today: HabitDay | null; history: HabitDay[];
  completed: number; totalXp: number; level: number;
  stagePercent: number; habitPercent: number; levelXp: number; levelsCompleted: number;
  level2Reward: { unlocked: boolean; claimedAt: string | null };
};
export const XP_PER_HABIT = 4;
export const XP_PER_LEVEL = 100;
export const HABITS_PER_LEVEL = XP_PER_LEVEL / XP_PER_HABIT;
export const FIRST_STAGE_LEVELS = 10;
export function bangkokDay(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function summarize(day: string, today: HabitDay | null, history: HabitDay[], completed: number, level2RewardClaimedAt: string | null = null): HabitState {
  const totalXp = completed * XP_PER_HABIT;
  const levelsCompleted = Math.min(Math.floor(totalXp / XP_PER_LEVEL), FIRST_STAGE_LEVELS);
  return {
    day, today, history, completed, totalXp, levelsCompleted,
    level2Reward: { unlocked: completed >= HABITS_PER_LEVEL, claimedAt: level2RewardClaimedAt },
    level: Math.min(levelsCompleted + 1, FIRST_STAGE_LEVELS),
    levelXp: levelsCompleted === FIRST_STAGE_LEVELS ? XP_PER_LEVEL : totalXp % XP_PER_LEVEL,
    stagePercent: Math.min(totalXp / (FIRST_STAGE_LEVELS * XP_PER_LEVEL) * 100, 100),
    habitPercent: today?.rewardAt ? 100 : today?.readAt ? 50 : 0,
  };
}
