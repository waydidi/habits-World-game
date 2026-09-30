import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync,readdirSync } from 'node:fs';
import { EMPTY_PROFILE } from './game-rules.bundle.mjs';
class Statement {
 constructor(db,sql,args=[]){this.db=db;this.sql=sql;this.args=args;}
 bind(...args){return new Statement(this.db,this.sql,args);}
 async all(){const results=this.db.prepare(this.sql).all(...this.args);return {success:true,results,meta:{changes:0}};}
 async first(){return this.db.prepare(this.sql).get(...this.args)??null;}
 async run(){const row=this.db.prepare(this.sql).run(...this.args);return {success:true,results:[],meta:{changes:Number(row.changes)}};}
}
class D1 {
 constructor(){this.db=new DatabaseSync(':memory:');for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(v=>v.endsWith('.sql')).sort())this.db.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));}
 prepare(sql){return new Statement(this.db,sql);}
 async batch(statements){this.db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(/^\s*SELECT/i.test(s.sql)?await s.all():await s.run());this.db.exec('COMMIT');return results;}catch(e){this.db.exec('ROLLBACK');throw e;}}
}
globalThis.__GAME_TEST_ENV__={};
const {loadGame,completeQuest,saveProfile,saveCannabisLog,claimReward}=await import('./game-server.bundle.mjs');
test('real server flow initializes private profile, saves quests, gates rewards, and preserves EXP on a lapse',async()=>{
 const d1=new D1();globalThis.__GAME_TEST_ENV__.DB=d1;globalThis.__GAME_TEST_ENV__.PERSONAL_SETUP=JSON.stringify({...EMPTY_PROFILE,debtMonthly:1000,debtMonths:12,recurringBusinessCost:100});
 let game=await loadGame('owner');assert.equal(game.finances.debtRemaining,12000);assert.equal(game.progress.level,1);
 await assert.rejects(()=>completeQuest('owner','cannabis'),/Choose a quit/);
 await saveProfile('owner',{...game.profile,quitDate:game.day});
 await completeQuest('owner','cannabis');await completeQuest('owner','sleep');await completeQuest('owner','waydidi');
 game=await loadGame('owner');assert.equal(game.totalXp,9);assert.equal(game.progress.level,2);assert.equal(game.cleanDays,1);assert.equal(game.level2Reward.unlocked,true);
 await claimReward('owner','level2');await claimReward('owner','level2');
 await assert.rejects(()=>claimReward('owner','breakfast'),/Read ten pages/);
 await completeQuest('owner','reading');await completeQuest('owner','reading');await claimReward('owner','breakfast');
 game=await loadGame('owner');assert.equal(game.totalXp,11);assert.equal(game.today.length,4);assert.ok(game.breakfast.claimedAt);assert.ok(game.level2Reward.claimedAt);
 await saveCannabisLog('owner',1,'evening');game=await loadGame('owner');assert.equal(game.totalXp,11);assert.equal(game.cleanDays,0);assert.equal(game.cannabisLog.grams,1);
 await saveProfile('owner',{...game.profile,debtPaymentsMade:1,bankBalance:123});game=await loadGame('owner');assert.equal(game.finances.debtRemaining,11000);assert.equal(game.profile.bankBalance,123);
 const other=await loadGame('other');assert.equal(other.totalXp,0);assert.equal(other.profile.bankBalance,0);assert.equal(other.today.length,0);d1.db.close();
});
