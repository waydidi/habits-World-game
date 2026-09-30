import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { bangkokDay, summarize } from '../lib/habit-rules.ts';
import { INSERT_READING, CLAIM_BREAKFAST, COUNT_COMPLETED, CLAIM_LEVEL_TWO } from '../lib/habit-queries.ts';
const now = '2026-09-30T01:00:00.000Z';
function db() { const d = new DatabaseSync(':memory:'); d.exec(readFileSync(new URL('../drizzle/0000_supreme_firebird.sql', import.meta.url), 'utf8')); d.exec(readFileSync(new URL('../drizzle/0001_gray_metal_master.sql', import.meta.url), 'utf8')); return d; }
test('Bangkok midnight changes the daily quest independently of UTC', () => {
  assert.equal(bangkokDay(new Date('2026-09-30T16:59:59Z')), '2026-09-30');
  assert.equal(bangkokDay(new Date('2026-09-30T17:00:00Z')), '2026-10-01');
});
test('read first, then claim; repeated actions only award 4 XP', () => {
  const d=db(); const read=d.prepare(INSERT_READING); const claim=d.prepare(CLAIM_BREAKFAST); const count=d.prepare(COUNT_COMPLETED);
  assert.equal(claim.run(now, 'owner', '2026-09-30').changes, 0);
  for (let i=0;i<5;i++) read.run('owner','2026-09-30',now);
  assert.equal(count.get('owner').completed,0);
  for (let i=0;i<5;i++) claim.run(now,'owner','2026-09-30');
  assert.equal(count.get('owner').completed,1);
  assert.equal(summarize('2026-09-30',null,[],count.get('owner').completed).totalXp,4); d.close();
});
test('saved records are isolated by authenticated user', () => {
  const d=db(); d.prepare(INSERT_READING).run('owner','2026-09-30',now);
  d.prepare(CLAIM_BREAKFAST).run(now,'other','2026-09-30');
  assert.equal(d.prepare(COUNT_COMPLETED).get('owner').completed,0);
  d.prepare(CLAIM_BREAKFAST).run(now,'owner','2026-09-30');
  assert.equal(d.prepare(COUNT_COMPLETED).get('other').completed,0); d.close();
});
test('daily gauge reaches 100.00% only after reward claim', () => {
  const row={day:'2026-09-30',readAt:now,rewardAt:null};
  assert.equal(summarize(row.day,null,[],0).habitPercent,0);
  assert.equal(summarize(row.day,row,[row],0).habitPercent,50);
  assert.equal(summarize(row.day,{...row,rewardAt:now},[],1).habitPercent,100);
});
test('4 percent per habit, exact level boundaries, and level 10 completion', () => {
  for (const [completed, level, levelXp, levelsCompleted] of [
    [0,1,0,0], [1,1,4,0], [2,1,8,0], [24,1,96,0], [25,2,0,1],
    [26,2,4,1], [49,2,96,1], [50,3,0,2], [224,9,96,8],
    [225,10,0,9], [249,10,96,9], [250,10,100,10], [251,10,100,10],
  ]) {
    const state=summarize('2026-09-30',null,[],completed);
    assert.equal(state.totalXp,completed*4);
    assert.equal(state.level,level);
    assert.equal(state.levelXp,levelXp);
    assert.equal(state.levelsCompleted,levelsCompleted);
    assert.ok(state.stagePercent<=100);
  }
});
test('a new day resets habit progress while preserving XP', () => {
  const old={day:'2026-09-30',readAt:now,rewardAt:now};const next=summarize('2026-10-01',null,[old],1);
  assert.equal(next.habitPercent,0);assert.equal(next.totalXp,4);assert.equal(next.history.length,1);assert.equal(next.levelXp,4);
});

test('level 2 reward unlocks exactly at 25 habits and remains unlocked', () => {
  assert.equal(summarize('2026-09-30',null,[],24).level2Reward.unlocked,false);
  assert.equal(summarize('2026-09-30',null,[],25).level2Reward.unlocked,true);
  assert.equal(summarize('2026-09-30',null,[],100).level2Reward.unlocked,true);
});
test('big meal reward is gated, saved once, and does not add XP', () => {
  const d=db(); const claim=d.prepare(CLAIM_LEVEL_TWO);
  assert.equal(claim.run('owner',now,'owner',25).changes,0);
  for(let i=1;i<=25;i++) {
    const day=`2026-09-${String(i).padStart(2,'0')}`;
    d.prepare(INSERT_READING).run('owner',day,now);
    d.prepare(CLAIM_BREAKFAST).run(now,'owner',day);
  }
  assert.equal(claim.run('owner',now,'owner',25).changes,1);
  assert.equal(claim.run('owner',now,'owner',25).changes,0);
  const row=d.prepare("SELECT claimed_at FROM milestone_rewards WHERE user_id=?").get('owner');
  assert.equal(row.claimed_at,now);
  assert.equal(d.prepare(COUNT_COMPLETED).get('owner').completed,25);
  assert.equal(summarize('2026-10-01',null,[],25,row.claimed_at).level2Reward.claimedAt,now);
  assert.equal(claim.run('other',now,'other',25).changes,0);
  assert.equal(d.prepare("SELECT COUNT(*) AS total FROM milestone_rewards").get().total,1); d.close();
});
