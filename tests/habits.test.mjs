import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { bangkokDay, summarize } from '../lib/habit-rules.ts';
import { INSERT_READING, CLAIM_BREAKFAST, COUNT_COMPLETED } from '../lib/habit-queries.ts';
const now = '2026-09-30T01:00:00.000Z';
function db() { const d = new DatabaseSync(':memory:'); d.exec(readFileSync(new URL('../drizzle/0000_supreme_firebird.sql', import.meta.url), 'utf8')); return d; }
test('Bangkok midnight changes the daily quest independently of UTC', () => {
  assert.equal(bangkokDay(new Date('2026-09-30T16:59:59Z')), '2026-09-30');
  assert.equal(bangkokDay(new Date('2026-09-30T17:00:00Z')), '2026-10-01');
});
test('read first, then claim; repeated actions only award 2 XP', () => {
  const d=db(); const read=d.prepare(INSERT_READING); const claim=d.prepare(CLAIM_BREAKFAST); const count=d.prepare(COUNT_COMPLETED);
  assert.equal(claim.run(now, 'owner', '2026-09-30').changes, 0);
  for (let i=0;i<5;i++) read.run('owner','2026-09-30',now);
  assert.equal(count.get('owner').completed,0);
  for (let i=0;i<5;i++) claim.run(now,'owner','2026-09-30');
  assert.equal(count.get('owner').completed,1);
  assert.equal(summarize('2026-09-30',null,[],count.get('owner').completed).totalXp,2); d.close();
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
test('ten cycles complete ten levels at 20 XP; later rewards still earn XP', () => {
  const d=db();
  for(let i=1;i<=11;i++) { const day=`2026-09-${String(i).padStart(2,'0')}`;d.prepare(INSERT_READING).run('owner',day,now);d.prepare(CLAIM_BREAKFAST).run(now,'owner',day); }
  const chapter=summarize('2026-09-30',null,[],10); assert.equal(chapter.totalXp,20);assert.equal(chapter.stagePercent,100);assert.equal(chapter.level,10);
  const next=summarize('2026-09-30',null,[],d.prepare(COUNT_COMPLETED).get('owner').completed);assert.equal(next.totalXp,22);assert.equal(next.level,10);assert.equal(next.stagePercent,100); d.close();
});
test('a new day resets habit progress while preserving XP', () => {
  const old={day:'2026-09-30',readAt:now,rewardAt:now};const next=summarize('2026-10-01',null,[old],1);
  assert.equal(next.habitPercent,0);assert.equal(next.totalXp,2);assert.equal(next.history.length,1);assert.equal(next.stagePercent,10);
});
