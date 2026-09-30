import { getChatGPTUser } from '@/app/chatgpt-auth';
import { loadGame,completeQuest,saveProfile,saveCannabisLog,claimReward } from '@/db/game';
import { bangkokDay,validateProfile,validateCannabisLog,QUESTS,type QuestId } from '@/lib/game-rules';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET() {
 const user=await getChatGPTUser();if(!user) return json({error:'Sign in again to load your world.'},401);
 try{return json(await loadGame(user.userId));}catch{console.error('Game storage unavailable');return json({error:'Your world is unavailable right now. Please retry.'},503);}
}
export async function POST(request:Request) {
 const user=await getChatGPTUser();if(!user) return json({error:'Sign in again to save your world.'},401);
 const origin=request.headers.get('origin');
 if(request.headers.get('sec-fetch-site')==='cross-site'||origin&&origin!==new URL(request.url).origin) return json({error:'This request could not be verified.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json')) return json({error:'Expected a JSON request.'},415);
 let raw:Record<string,unknown>;
 try{const text=await request.text();if(text.length>8192) return json({error:'Request too large.'},413);const body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body)) throw new Error();raw=body;}catch{return json({error:'Invalid request.'},400);}
 if(raw.day!==bangkokDay()) return json({error:'A new day has started in Bangkok. Refresh your quests.'},409);
 const {action}=raw;
 let profile,log;
 try {
  if(action==='profile') profile=validateProfile(raw.profile);
  else if(action==='checkin') log=validateCannabisLog(raw.checkin);
  else if(action==='defeat') {if(!QUESTS.some(q=>q.id===raw.questId)) throw new Error('Unknown quest.');}
  else if(action==='reward') {if(raw.reward!=='breakfast'&&raw.reward!=='level2') throw new Error('Unknown reward.');}
  else throw new Error('Unknown action.');
 }catch(e){return json({error:e instanceof Error?e.message:'Invalid request.'},400);}
 try {
  if(action==='profile') await saveProfile(user.userId,profile!);
  if(action==='checkin') await saveCannabisLog(user.userId,log!.grams,log!.trigger);
  if(action==='defeat') await completeQuest(user.userId,raw.questId as QuestId);
  if(action==='reward') await claimReward(user.userId,raw.reward as 'breakfast'|'level2');
  return json(await loadGame(user.userId));
 }catch(e){
  const message=e instanceof Error?e.message:'';
  if(/Choose a quit|check-in records|Try this quest|Cannabis use was|Read ten pages|Reach level 2/.test(message)) return json({error:message},409);
  console.error('Game save failed');
  return json({error:"Couldn't save that yet. Retry safely; you won't get duplicate EXP."},503);
 }
}
