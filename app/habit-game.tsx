"use client";
import { useCallback,useEffect,useRef,useState } from 'react';
import { BookOpen,Check,Coffee,Coins,Gem,Heart,LockKeyhole,RefreshCw,Settings2,Shield,Sparkles,Swords,Target,Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tabs,TabsList,TabsTrigger,TabsContent } from '@/components/ui/tabs';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { bangkokDay,QUESTS,questXp,type GameState,type QuestId,type Profile } from '@/lib/game-rules';
const money=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(n);
const number=(n:number)=>new Intl.NumberFormat('en-US').format(n);
function Sprite({cell,className=''}:{cell:number;className?:string}) {return <span aria-hidden="true" className={`sprite ${className}`} style={{backgroundPosition:`${(cell%3)*50}% ${Math.floor(cell/3)*50}%`}}/>;}
type ModelContext={registerTool(tool:{name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean};execute(input:unknown):Promise<unknown>},options:{signal:AbortSignal}):void|Promise<void>};
export default function HabitGame() {
 const [game,setGame]=useState<GameState|null>(null);const gameRef=useRef<GameState|null>(null);
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const busyRef=useRef(false);
 const [error,setError]=useState('');const [message,setMessage]=useState('');
 const [selected,setSelected]=useState<QuestId>('reading');const [battleOpen,setBattleOpen]=useState(false);
 const [attack,setAttack]=useState(false);const [victory,setVictory]=useState<{xp:number;levelUp:boolean}|null>(null);
 const [profileOpen,setProfileOpen]=useState(false);const [draft,setDraft]=useState<Profile|null>(null);
 const [checkinOpen,setCheckinOpen]=useState(false);const [grams,setGrams]=useState('');const [trigger,setTrigger]=useState('');
 const [tab,setTab]=useState('quests');const refreshSequence=useRef(0);
 const apply=useCallback((value:GameState)=>{gameRef.current=value;setGame(value);},[]);
 const refresh=useCallback(async()=>{
  const sequence=++refreshSequence.current;
  try{const r=await fetch('/api/game',{cache:'no-store'});const data=await r.json() as GameState&{error?:string};if(!r.ok) throw new Error(data.error||'Could not load your world.');if(sequence===refreshSequence.current&&!busyRef.current){apply(data);setError('');}return data;}
  catch(e){setError(e instanceof Error?e.message:'Please retry.');return null;}finally{setLoading(false);}
 },[apply]);
 useEffect(()=>{
  void refresh();const check=()=>{if(!busyRef.current&&gameRef.current?.day!==bangkokDay()){setVictory(null);void refresh();}};
  const visible=()=>{if(document.visibilityState==='visible'&&!busyRef.current) void refresh();};
  const timer=setInterval(check,30000);document.addEventListener('visibilitychange',visible);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
 },[refresh]);
 const mutate=useCallback(async(payload:Record<string,unknown>)=>{
  if(!gameRef.current||busyRef.current) throw new Error('Wait until your world finishes loading.');
  busyRef.current=true;setBusy(true);setError('');refreshSequence.current++;
  try{const r=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,day:gameRef.current.day})});
   const data=await r.json() as GameState&{error?:string};if(!r.ok) throw new Error(data.error||'Could not save.');apply(data);return data;
  }catch(e){const text=e instanceof Error?e.message:'Could not save. Please retry.';setError(text);throw new Error(text);}
  finally{busyRef.current=false;setBusy(false);}
 },[apply]);
 const defeat=useCallback(async(id:QuestId)=>{
  const before=gameRef.current;if(!before) throw new Error('Progress unavailable.');
  const next=await mutate({action:'defeat',questId:id});
  const awarded=before.today.some(q=>q.questId===id)?0:next.today.find(q=>q.questId===id)?.xp??0;
  setSelected(id);setAttack(true);setVictory({xp:awarded,levelUp:next.progress.level>before.progress.level});
  setMessage(next.progress.level>before.progress.level?`Level up! You reached level ${next.progress.level}.`:`Monster defeated. ${awarded} EXP earned.`);
  return {questId:id,awardedXp:awarded,level:next.progress.level,totalXp:next.totalXp};
 },[mutate]);
 useEffect(()=>{if(!attack)return;const timer=setTimeout(()=>setAttack(false),900);return()=>clearTimeout(timer);},[attack]);
 useEffect(()=>{
  const context=(document as Document&{modelContext?:ModelContext}).modelContext;if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  const tools=[
   {name:'read_habit_world',description:'Read saved quests, character EXP, goals, and reward status.',annotations:{readOnlyHint:true},inputSchema:{type:'object',properties:{},additionalProperties:false},execute:async(input:unknown)=>{if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('Expected an empty object.');const result=await refresh();if(!result)throw new Error('World unavailable.');return result;}},
   {name:'defeat_habit_monster',description:'Record a completed real-life habit and defeat its monster. Only run after the user confirms completing that habit. Server determines EXP and eligibility.',annotations:{readOnlyHint:false},inputSchema:{type:'object',properties:{questId:{type:'string',enum:QUESTS.map(q=>q.id)}},required:['questId'],additionalProperties:false},execute:async(input:unknown)=>{if(!input||typeof input!=='object'||Object.keys(input).some(k=>k!=='questId'))throw new Error('Invalid input.');const id=(input as {questId:QuestId}).questId;if(!QUESTS.some(q=>q.id===id))throw new Error('Unknown quest.');return defeat(id);}},
   {name:'claim_habit_reward',description:'Record that the user enjoyed an unlocked breakfast or level-2 meal. Only run on user confirmation; no extra EXP is awarded.',annotations:{readOnlyHint:false},inputSchema:{type:'object',properties:{reward:{type:'string',enum:['breakfast','level2']}},required:['reward'],additionalProperties:false},execute:async(input:unknown)=>{if(!input||typeof input!=='object'||Object.keys(input).some(k=>k!=='reward'))throw new Error('Invalid input.');const reward=(input as {reward:string}).reward;if(!['breakfast','level2'].includes(reward))throw new Error('Unknown reward.');const next=await mutate({action:'reward',reward});setMessage('Reward claimed. Enjoy your celebration!');return {reward,claimed:true,level:next.progress.level};}},
  ];
  for(const tool of tools)try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
  return()=>lifecycle.abort();
 },[defeat,refresh,mutate]);
 const enemy=QUESTS.find(q=>q.id===selected)!;const done=game?.today.some(q=>q.questId===selected)??false;
 const quitReady=Boolean(game?.profile.quitDate&&game.profile.quitDate<=game.day);
 const cannabisBlocked=selected==='cannabis'&&(!quitReady||Boolean(game?.cannabisLog&&game.cannabisLog.grams>0));
 const coreWins=game?.today.filter(q=>QUESTS.find(p=>p.id===q.questId)?.core).length??0;
 const openBattle=(id:QuestId)=>{setSelected(id);setVictory(null);setBattleOpen(true);setError('');};
 const openProfile=()=>{if(!game)return;setDraft({...game.profile});setProfileOpen(true);setError('');};
 const openCheckin=()=>{if(!game)return;setGrams(String(game.cannabisLog?.grams??game.profile.cannabisBaseline));setTrigger(game.cannabisLog?.trigger??'');setCheckinOpen(true);setError('');};
 const questCard=(q:typeof QUESTS[number])=>{
  const finished=game?.today.find(v=>v.questId===q.id);const locked=q.id==='cannabis'&&!quitReady;
  return <article className={`quest-card ${finished?'defeated':''}`} key={q.id}>
   <div className="monster-portrait"><Sprite cell={q.sprite}/>{finished&&<span className="kill-check"><Check size={16}/></span>}</div>
   <div className="quest-card-text"><span className="tiny-label">{q.category} · {q.monster}</span><h3>{q.title}</h3><span className="quest-exp">{finished?`+${number(finished.xp)} EXP earned`:`+${number(questXp(q.id,game?.totalXp??0))} EXP`}</span></div>
   <button className={`button ${finished?'ghost':'small'}`} disabled={busy||!game||Boolean(finished)||locked} onClick={()=>openBattle(q.id)}>{finished?'Defeated':locked?'Set quit date':'Battle'}</button>
  </article>;
 };
 const rewardCard=(type:'breakfast'|'level2')=>{
  const reward=type==='breakfast'?game?.breakfast:game?.level2Reward;
  return <article className={`reward-panel ${reward?.unlocked?'unlocked':''}`}>
   <div className="reward-title"><span className="reward-icon">{type==='breakfast'?<Coffee size={25}/>:<Trophy size={25}/>}</span><span className="tiny-label">{reward?.claimedAt?'CLAIMED':reward?.unlocked?'UNLOCKED':type==='breakfast'?'READ 10 PAGES':'REACH LEVEL 2'}</span></div>
   <h3>{type==='breakfast'?'A really good breakfast':'Your level 2 feast'}</h3>
   <p>{type==='breakfast'?'Healthy, delicious, or a little luxurious. Your choice.':'MK buffet, Korean BBQ, Mookrata, pizza, KFC, or McDonald’s. Pick your celebration.'}</p>
   <button className="button gold" disabled={busy||!reward?.unlocked||Boolean(reward?.claimedAt)} onClick={()=>{void mutate({action:'reward',reward:type}).then(()=>setMessage('Reward claimed. Enjoy!')).catch(()=>{});}}>{reward?.claimedAt?<><Check size={16}/> Enjoyed</>:reward?.unlocked?'I enjoyed my reward':<><LockKeyhole size={15}/> Locked</>}</button>
   <small>Arrange your meal personally, within your chosen budget.</small>
  </article>;
 };
 return <div className="world-app">
  <header className="topbar"><a href="/" className="wordmark"><Gem size={24}/><span>RICH WORLD<small>A HABIT ADVENTURE</small></span></a><span className="private-label"><LockKeyhole size={13}/> Your private world</span><button className="icon-button" aria-label="Edit goals and quit date" disabled={!game||busy} onClick={openProfile}><Settings2 size={20}/></button></header>
  <main className="world-main">
   <div className="page-heading"><div><p className="tiny-label">{game?.day??bangkokDay()} · BANGKOK TIME</p><h1>Your daily adventure.</h1></div><span className="chapter-label"><Swords size={16}/> Classic · Lv. 1–99</span></div>
   {error&&<div className="error-box" role="alert"><span>{error} {error.includes('Sign in')&&<a href="/signin-with-chatgpt?return_to=%2F" target="_top">Sign in</a>}</span><button disabled={busy} onClick={()=>void refresh()}><RefreshCw size={16}/> Retry</button></div>}
   {message&&<div className="notice" role="status"><Sparkles size={17}/><span>{message}</span><button aria-label="Dismiss message" onClick={()=>setMessage('')}>×</button></div>}
   <div className="adventure-layout">
    <div className="play-column">
     <section className="battle-arena" aria-label="Habit battle arena">
      <div className="arena-header"><span className="tiny-label">TRAINING GROUNDS · TIER {Math.ceil((game?.progress.level??1)/10)}</span><span className="arena-status">{game?`${game.today.length} monsters defeated today`:'Loading your world…'}</span></div>
      <div className={`arena-stage ${attack?'attacking':''} ${victory?'won':''}`}>
       <div className="fighter"><span className="fighter-label">YOU · NOVICE</span><Sprite cell={attack?1:0} className="hero-sprite"/></div>
       <div className="battle-vs">{victory?<span className="exp-popup">+{number(victory.xp)}<small>EXP</small></span>:<Swords size={28}/>}</div>
       <div className="enemy"><span className="fighter-label">{enemy.monster}</span><Sprite cell={enemy.sprite} className="enemy-sprite"/></div>
      </div>
      <div className="arena-bottom"><div><h2>{victory?(victory.levelUp?'Level up! A new chapter.':'Monster defeated!'):enemy.title}</h2><p>{victory?`Your effort earned ${number(victory.xp)} EXP. Keep building your world.`:enemy.description}</p></div><button className="button gold" disabled={busy||!game||done||cannabisBlocked} onClick={()=>openBattle(selected)}>{done?<><Check size={17}/> Defeated</>:<><Swords size={17}/> Battle</>}</button></div>
     </section>
     <Tabs value={tab} onValueChange={setTab} className="game-tabs">
      <TabsList className="tab-bar" aria-label="World views"><TabsTrigger value="quests">Quests</TabsTrigger><TabsTrigger value="rewards">Rewards</TabsTrigger><TabsTrigger value="goals">My goals</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList>
      <TabsContent value="quests">
       <div className="section-heading"><h2>Three core quests</h2><span>{coreWins} / 3 today</span></div><p className="section-note">Finish the real-life action first. Then battle its monster.</p>
       <div className="quest-list">{QUESTS.filter(q=>q.core).map(questCard)}</div>
       {!quitReady&&<div className="quit-prompt"><Shield size={19}/><div><strong>Your quit quest starts on your terms.</strong><p>Choose a quit date and plan what you’ll do when a craving arrives.</p></div><button className="text-button" disabled={!game||busy} onClick={openProfile}>Set date</button></div>}
       <div className="section-heading optional-heading"><h2>Optional adventures</h2><span>Every small win counts</span></div><div className="quest-list">{QUESTS.filter(q=>!q.core).map(questCard)}</div>
       <div className="checkin-strip"><span><Shield size={17}/> Cannabis check-in</span><span>{game?.cannabisLog?`${game.cannabisLog.grams} g recorded today`:'Record honestly. Your earned EXP stays safe.'}</span><button className="text-button" disabled={!game||busy} onClick={openCheckin}>Record</button></div>
      </TabsContent>
      <TabsContent value="rewards"><div className="section-heading"><h2>Rewards worth working for</h2></div><div className="rewards-grid">{rewardCard('breakfast')}{rewardCard('level2')}</div></TabsContent>
      <TabsContent value="goals">
       <div className="section-heading"><h2>Your real-world goals</h2><button className="text-button" disabled={!game||busy} onClick={openProfile}>Update figures</button></div>
       <section className="goal-card"><div className="goal-title"><Target size={20}/><h3>Your savings dream</h3></div><strong className="goal-value">฿{money(game?.profile.bankBalance??0)} <small>/ ฿{money(game?.profile.savingsGoal??0)}</small></strong><Progress value={game?.finances.savingsPercent??0} aria-label="Savings target progress"/><p>{(game?.finances.savingsPercent??0).toFixed(2)}% saved · Target date: {game?.profile.savingsDeadline||'Choose a date'}</p></section>
       <div className="goal-grid"><section className="goal-card"><div className="goal-title"><Coins size={19}/><h3>Waydidi revenue</h3></div><strong className="goal-value">฿{money(game?.profile.monthlyRevenue??0)}</strong><p>Monthly target: ฿{money(game?.profile.revenueGoal??0)}</p><Progress value={game?.finances.revenuePercent??0} aria-label="Monthly revenue progress"/></section><section className="goal-card"><div className="goal-title"><BookOpen size={19}/><h3>Finish your books</h3></div><strong className="goal-value">{game?.profile.booksRead??0}<small> / {game?.profile.booksGoal??3} books</small></strong><p>{number(game?.booksPages??0)} pages recorded through quests</p><button className="text-button" disabled={!game||busy} onClick={()=>{if(game)void mutate({action:'profile',profile:{...game.profile,booksRead:game.profile.booksRead+1}}).then(()=>setMessage('One more book finished. Well done!')).catch(()=>{});}}>I finished a book</button></section></div>
       <section className="goal-card"><div className="goal-title"><Coins size={19}/><h3>Monthly money snapshot</h3></div><dl className="money-rows"><div><dt>Revenue</dt><dd>฿{money(game?.profile.monthlyRevenue??0)}</dd></div><div><dt>Recurring business cost</dt><dd>฿{money(game?.profile.recurringBusinessCost??0)}</dd></div><div><dt>Other business costs</dt><dd>฿{money(game?.profile.otherBusinessCosts??0)}</dd></div><div className="subtotal"><dt>Business profit</dt><dd>฿{money(game?.finances.businessProfit??0)}</dd></div><div><dt>Personal expenses</dt><dd>฿{money(game?.profile.personalExpenses??0)}</dd></div><div><dt>Monthly debt payment</dt><dd>฿{money((game?.finances.remainingPayments??0)>0?game?.profile.debtMonthly??0:0)}</dd></div><div className="subtotal"><dt>Cash after recorded costs</dt><dd>฿{money(game?.finances.cashAfterCosts??0)}</dd></div></dl><p>Based on your recorded figures. Update costs as you learn them.</p></section>
       <section className="goal-card"><div className="goal-title"><Shield size={19}/><h3>Your debt schedule</h3></div><strong className="goal-value">฿{money(game?.finances.debtRemaining??0)}</strong><p>{game?.finances.remainingPayments??0} scheduled payments remaining · ฿{money(game?.profile.debtMonthly??0)} each</p><Progress value={game?.profile.debtMonths?game.profile.debtPaymentsMade/game.profile.debtMonths*100:100} aria-label="Debt installments paid"/><button className="button small" disabled={!game||busy||!game.finances.remainingPayments} onClick={()=>{if(game)void mutate({action:'profile',profile:{...game.profile,debtPaymentsMade:game.profile.debtPaymentsMade+1}}).then(()=>setMessage('One debt payment recorded.')).catch(()=>{});}}>Record one paid installment</button></section>
       <section className="goal-card wellbeing"><div className="goal-title"><Heart size={19}/><h3>Energy, sleep & quitting cannabis</h3></div><p>Starting baseline: {game?.profile.cannabisBaseline??0} g/day · Quit date: {game?.profile.quitDate||'Not chosen yet'}</p><strong>{game?.cleanDays??0} cannabis-free days completed</strong><p>A lapse does not remove EXP. Sleep can feel harder after stopping regular cannabis. A clinician or addiction service can help if symptoms are difficult.</p><button className="button small" disabled={!game||busy} onClick={openCheckin}>Record today's check-in</button></section>
      </TabsContent>
      <TabsContent value="history"><div className="section-heading"><h2>Your adventure log</h2><span>{number(game?.defeated??0)} monsters defeated</span></div>{!game?.history.length?<div className="empty-state"><Swords size={27}/><p>{loading?'Loading saved adventures…':'Your first defeated monster will appear here.'}</p></div>:<ul className="history-list">{game.history.map(q=>{const info=QUESTS.find(v=>v.id===q.questId)!;return <li key={`${q.day}-${q.questId}`}><Sprite cell={info.sprite}/><div><strong>{info.monster}</strong><span>{q.day===game.day?'Today':q.day} · {info.title}</span></div><b>+{number(q.xp)} EXP</b></li>;})}</ul>}</TabsContent>
     </Tabs>
    </div>
    <aside className="character-column">
     <section className="character-card"><div className="card-top"><span className="tiny-label">YOUR CHARACTER</span><Gem size={18}/></div><Sprite cell={0} className="profile-sprite"/><span className="class-badge">NOVICE</span><h2>New, Rich World member</h2><div className="character-stats"><div><span>BASE LEVEL</span><strong>{game?.progress.level??1}<small> / 99</small></strong></div><div><span>TOTAL EXP</span><strong>{number(game?.totalXp??0)}</strong></div></div><div className="exp-head"><span>{game?.progress.isMax?'MAX LEVEL':'Next level'}</span><strong>{(game?.progress.levelPercent??0).toFixed(2)} / 100.00%</strong></div><Progress value={game?.progress.levelPercent??0} aria-label="Base level experience" className="exp-progress"/><p>{game?.progress.isMax?'Level 99 reached. Your adventures continue.':`${number(game?.progress.levelXp??0)} / ${number(game?.progress.requiredXp??9)} EXP`}</p><a className="source-link" href="https://irowiki.org/classic/Base_EXP_Chart" target="_blank" rel="noreferrer">Ragnarok Classic EXP table</a></section>
     <section className="daily-card"><div className="section-heading"><h2>Today's progress</h2><span>{coreWins} / 3</span></div><Progress value={coreWins/3*100} aria-label="Daily core quests complete"/><p>{coreWins===3?'All core monsters defeated. Rest and enjoy your win.':'Three core quests. Optional adventures when you have the energy.'}</p><div className="mini-metrics"><span><Swords size={16}/>{game?.today.length??0} defeated</span><span><Sparkles size={16}/>{number(game?.today.reduce((s,q)=>s+q.xp,0)??0)} EXP today</span></div></section>
     <section className="dream-card"><Target size={23}/><span className="tiny-label">YOUR MAIN QUEST</span><h3>Build a richer life.</h3><p>Health, money, Waydidi, books, and the people you care about.</p><button className="text-button" onClick={()=>setTab('goals')}>View my goals</button></section>
    </aside>
   </div>
   <footer><span>RICH WORLD · YOUR HABIT ADVENTURE</span><span>Saved privately · A fresh quest board at midnight in Bangkok</span></footer>
  </main>
  <Dialog open={battleOpen} onOpenChange={value=>{if(!busy)setBattleOpen(value);}}><DialogContent className="game-dialog"><DialogHeader><DialogTitle>{victory?'Victory!':enemy.monster}</DialogTitle><DialogDescription>{victory?`You earned ${number(victory.xp)} EXP. ${victory.levelUp?`You are now level ${game?.progress.level}!`:''}`:enemy.description}</DialogDescription></DialogHeader><div className={`dialog-battle ${attack?'attacking':''} ${victory?'won':''}`}><Sprite cell={attack?1:0} className="hero-sprite"/><Swords size={25}/><Sprite cell={enemy.sprite} className="enemy-sprite"/></div>{error&&<p className="form-error" role="alert">{error}</p>}{victory?<button className="button" onClick={()=>setBattleOpen(false)}>Back to my quests</button>:<><p className="confirmation-note">Only defeat this monster after you have completed the real-life habit.</p><button className="button" disabled={busy||!game||done||cannabisBlocked} onClick={()=>{void defeat(selected).catch(()=>{});}}>{busy?'Saving your victory…':done?'Already defeated':cannabisBlocked?'Quest unavailable today':`I completed this habit · +${number(questXp(selected,game?.totalXp??0))} EXP`}</button></>}</DialogContent></Dialog>
  <Dialog open={profileOpen} onOpenChange={value=>{if(!busy)setProfileOpen(value);}}><DialogContent className="game-dialog profile-dialog"><DialogHeader><DialogTitle>Your goals & figures</DialogTitle><DialogDescription>Update your own records. Amounts are in Thai baht.</DialogDescription></DialogHeader>{draft&&<form onSubmit={e=>{e.preventDefault();void mutate({action:'profile',profile:draft}).then(()=>{setProfileOpen(false);setMessage('Goals and figures saved.');}).catch(()=>{});}}><div className="form-grid"><label>Quit date<Input type="date" value={draft.quitDate??''} onChange={e=>setDraft({...draft,quitDate:e.target.value||null})}/></label><label>Savings target date<Input type="date" value={draft.savingsDeadline} onChange={e=>setDraft({...draft,savingsDeadline:e.target.value})}/></label>{([
 ['monthlyRevenue','Revenue this month'],['recurringBusinessCost','Recurring business cost / month'],['otherBusinessCosts','Other business costs this month'],['personalExpenses','Personal expenses this month'],['bankBalance','Current bank savings'],['revenueGoal','Monthly revenue target'],['savingsGoal','Savings target'],['debtMonthly','Debt payment / month'],['debtMonths','Scheduled installments'],['debtPaymentsMade','Installments already paid'],['booksGoal','Books to finish'],['booksRead','Books already finished'],
 ] as [keyof Profile,string][]).map(([key,label])=><label key={key}>{label}<Input type="number" min="0" step={key.includes('books')||key.includes('debtMonths')||key.includes('Payments')?'1':'0.01'} value={String(draft[key])} onChange={e=>setDraft({...draft,[key]:e.target.value===''?0:Number(e.target.value)})}/></label>)}</div>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button" disabled={busy} type="submit">{busy?'Saving…':'Save my goals'}</button></form>}</DialogContent></Dialog>
  <Dialog open={checkinOpen} onOpenChange={value=>{if(!busy)setCheckinOpen(value);}}><DialogContent className="game-dialog"><DialogHeader><DialogTitle>Today's cannabis check-in</DialogTitle><DialogDescription>Be honest with yourself. This records use and triggers; it does not remove earned EXP.</DialogDescription></DialogHeader><form onSubmit={e=>{e.preventDefault();void mutate({action:'checkin',checkin:{grams:Number(grams),trigger}}).then(()=>{setCheckinOpen(false);setMessage('Check-in saved. A new opportunity starts tomorrow.');}).catch(()=>{});}}><label>Amount used today (grams)<Input type="number" min="0" max="100" step="0.01" required value={grams} onChange={e=>setGrams(e.target.value)}/></label><label>Trigger or what helped (optional)<Input maxLength={240} value={trigger} onChange={e=>setTrigger(e.target.value)} placeholder="For example: before bed, stress, or a helpful walk"/></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button" disabled={busy} type="submit">{busy?'Saving…':'Save my check-in'}</button></form></DialogContent></Dialog>
 </div>;
}
