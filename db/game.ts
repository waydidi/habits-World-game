import { INSERT_QUEST,INSERT_CLEAN_QUEST,INSERT_LEVEL2_REWARD,IMPORT_LEGACY_READING } from '@/lib/game-queries';
import { env } from 'cloudflare:workers';
import { getRawDb } from './index';
import { progression } from '@/lib/classic-exp';
import { bangkokDay, EMPTY_PROFILE, QUESTS, questXp, finances, validateProfile, type GameState, type Profile, type QuestId, type Completion } from '@/lib/game-rules';
export async function initializePlayer(userId:string) {
 const db=getRawDb();let profile:Profile=EMPTY_PROFILE;
 if(env.PERSONAL_SETUP) profile=validateProfile(JSON.parse(env.PERSONAL_SETUP));
 await db.batch([
  db.prepare('INSERT INTO player_profiles (user_id,settings) VALUES (?,?) ON CONFLICT(user_id) DO NOTHING').bind(userId,JSON.stringify(profile)),
  // Preserve prior reading records. This is an idempotent user-scoped data import, not a schema migration.
  db.prepare(IMPORT_LEGACY_READING).bind(userId),
 ]);
}
export async function loadGame(userId:string):Promise<GameState> {
 await initializePlayer(userId);const db=getRawDb();const day=bangkokDay();
 const rows=await db.batch([
  db.prepare('SELECT settings FROM player_profiles WHERE user_id=?').bind(userId),
  db.prepare('SELECT COALESCE(SUM(xp),0) AS totalXp, COUNT(*) AS defeated, SUM(CASE WHEN quest_id=\'reading\' THEN 10 ELSE 0 END) AS pages, SUM(CASE WHEN quest_id=\'cannabis\' AND NOT EXISTS (SELECT 1 FROM cannabis_logs cl WHERE cl.user_id=quest_completions.user_id AND cl.day=quest_completions.day AND cl.grams>0) THEN 1 ELSE 0 END) AS cleanDays FROM quest_completions WHERE user_id=?').bind(userId),
  db.prepare('SELECT day,quest_id AS questId,xp,completed_at AS completedAt FROM quest_completions WHERE user_id=? AND day=?').bind(userId,day),
  db.prepare('SELECT day,quest_id AS questId,xp,completed_at AS completedAt FROM quest_completions WHERE user_id=? ORDER BY completed_at DESC LIMIT 50').bind(userId),
  db.prepare('SELECT grams,trigger FROM cannabis_logs WHERE user_id=? AND day=?').bind(userId,day),
  db.prepare('SELECT reward_at AS claimedAt FROM habit_days WHERE user_id=? AND day=?').bind(userId,day),
  db.prepare("SELECT claimed_at AS claimedAt FROM milestone_rewards WHERE user_id=? AND milestone='level_2'").bind(userId),
 ]);
 const profile=validateProfile(JSON.parse((rows[0].results[0] as {settings:string}).settings));
 const totals=rows[1].results[0] as {totalXp:number;defeated:number;pages:number|null;cleanDays:number|null};
 const totalXp=Number(totals.totalXp);const today=rows[2].results as Completion[];const progress=progression(totalXp);
 return {day,profile,progress,finances:finances(profile),totalXp,today,history:rows[3].results as Completion[],defeated:Number(totals.defeated),booksPages:Number(totals.pages??0),cleanDays:Number(totals.cleanDays??0),
 cannabisLog:(rows[4].results[0] as {grams:number;trigger:string}|undefined)??null,
 breakfast:{unlocked:today.some(q=>q.questId==='reading'),claimedAt:(rows[5].results[0] as {claimedAt:string|null}|undefined)?.claimedAt??null},
 level2Reward:{unlocked:progress.level>=2,claimedAt:(rows[6].results[0] as {claimedAt:string}|undefined)?.claimedAt??null}};
}
export async function completeQuest(userId:string,id:QuestId) {
 if(!QUESTS.some(q=>q.id===id)) throw new Error('Unknown monster.');
 const game=await loadGame(userId);if(game.today.some(q=>q.questId===id)) return;
 const db=getRawDb();const now=new Date().toISOString();const xp=questXp(id,game.totalXp);
 if(id==='cannabis') {
  if(!game.profile.quitDate || game.profile.quitDate>game.day) throw new Error('Choose a quit date first. This quest opens on that date.');
  if(game.cannabisLog && game.cannabisLog.grams>0) throw new Error("Today's check-in records cannabis use. You can try the cannabis-free quest tomorrow; your earned EXP stays safe.");
  await db.batch([
   db.prepare(INSERT_CLEAN_QUEST).bind(userId,game.day,xp,now,userId,game.day),
   db.prepare('INSERT INTO cannabis_logs (user_id,day,grams,trigger) VALUES (?,?,0,\'\') ON CONFLICT(user_id,day) DO NOTHING').bind(userId,game.day),
  ]);
  if(!await db.prepare("SELECT 1 FROM quest_completions WHERE user_id=? AND day=? AND quest_id='cannabis'").bind(userId,game.day).first()) throw new Error('Cannabis use was recorded for today. Try this quest tomorrow.');
 } else {
  const statements=[db.prepare(INSERT_QUEST).bind(userId,game.day,id,xp,now)];
  if(id==='reading') statements.push(db.prepare('INSERT INTO habit_days (user_id,day,read_at) VALUES (?,?,?) ON CONFLICT(user_id,day) DO NOTHING').bind(userId,game.day,now));
  await db.batch(statements);
 }
}
export async function saveProfile(userId:string,profile:Profile) {
 await initializePlayer(userId);
 await getRawDb().prepare('UPDATE player_profiles SET settings=? WHERE user_id=?').bind(JSON.stringify(validateProfile(profile)),userId).run();
}
export async function saveCannabisLog(userId:string,grams:number,trigger:string) {
 await initializePlayer(userId);
 await getRawDb().prepare('INSERT INTO cannabis_logs (user_id,day,grams,trigger) VALUES (?,?,?,?) ON CONFLICT(user_id,day) DO UPDATE SET grams=excluded.grams,trigger=excluded.trigger').bind(userId,bangkokDay(),grams,trigger).run();
}
export async function claimReward(userId:string,reward:'breakfast'|'level2') {
 const game=await loadGame(userId);const db=getRawDb();const now=new Date().toISOString();
 if(reward==='breakfast') {
  if(!game.breakfast.unlocked) throw new Error('Read ten pages to unlock breakfast.');
  await db.prepare('UPDATE habit_days SET reward_at=? WHERE user_id=? AND day=? AND reward_at IS NULL').bind(now,userId,game.day).run();
 } else {
  if(!game.level2Reward.unlocked) throw new Error('Reach level 2 to unlock your big meal reward.');
  await db.prepare(INSERT_LEVEL2_REWARD).bind(userId,now,userId).run();
 }
}
