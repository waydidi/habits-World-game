export const INSERT_READING = "INSERT INTO habit_days (user_id, day, read_at) VALUES (?, ?, ?) ON CONFLICT(user_id, day) DO NOTHING";
export const CLAIM_BREAKFAST = "UPDATE habit_days SET reward_at = ? WHERE user_id = ? AND day = ? AND reward_at IS NULL";
export const COUNT_COMPLETED = "SELECT COUNT(*) AS completed FROM habit_days WHERE user_id = ? AND reward_at IS NOT NULL";
