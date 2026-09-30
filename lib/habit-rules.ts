export type HabitDay = { day: string; readAt: string; rewardAt: string | null };
export type HabitState = {
  day: string; today: HabitDay | null; history: HabitDay[];
  completed: number; totalXp: number; level: number;
  stagePercent: number; habitPercent: number;
};
export const XP_PER_HABIT = 2;
export const FIRST_STAGE_LEVELS = 10;
export function bangkokDay(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function summarize(day: string, today: HabitDay | null, history: HabitDay[], completed: number): HabitState {
  return {
    day, today, history, completed, totalXp: completed * XP_PER_HABIT,
    level: Math.min(completed + 1, FIRST_STAGE_LEVELS),
    stagePercent: Math.min(completed / FIRST_STAGE_LEVELS * 100, 100),
    habitPercent: today?.rewardAt ? 100 : today?.readAt ? 50 : 0,
  };
}
