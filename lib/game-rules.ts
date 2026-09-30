import { progression, CLASSIC_EXP } from './classic-exp';
export type QuestId = 'cannabis'|'sleep'|'waydidi'|'reading'|'walk'|'ledger'|'relationships';
export const QUESTS: { id: QuestId; monster: string; title: string; description: string; baseXp: number; sprite: number; core: boolean; category: string }[] = [
 {id:'cannabis',monster:'Craving Shadow',title:'Complete a cannabis-free day',description:'After your chosen quit date, honestly record a full day without cannabis.',baseXp:5,sprite:3,core:true,category:'Health'},
 {id:'sleep',monster:'Restless Slime',title:'Complete your wind-down routine',description:'Spend 15 minutes winding down for bed. Earn EXP for the routine, even if sleep is difficult.',baseXp:2,sprite:4,core:true,category:'Sleep'},
 {id:'waydidi',monster:'Empty-Coin Goblin',title:'Take one Waydidi sales action',description:'Follow up with a customer, contact a partner, or complete a concrete sales action using your own method.',baseXp:2,sprite:5,core:true,category:'Business'},
 {id:'reading',monster:'Unread Poring',title:'Read 10 pages',description:'Any book. Finish ten pages to unlock your breakfast reward.',baseXp:2,sprite:2,core:false,category:'Reading'},
 {id:'walk',monster:'Heavy-Foot Slime',title:'Take a 15-minute walk',description:'A manageable walk at your own pace.',baseXp:2,sprite:6,core:false,category:'Energy'},
 {id:'ledger',monster:'Ledger Goblin',title:'Record your money',description:'Review and record your income, spending, and debt payments.',baseXp:1,sprite:7,core:false,category:'Money'},
 {id:'relationships',monster:'Distance Ghost',title:'Give someone your attention',description:'Have a thoughtful check-in or a focused conversation with someone important.',baseXp:1,sprite:8,core:false,category:'Relationships'},
];
export function bangkokDay(now=new Date()) {
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const value=(name:string)=>parts.find(p=>p.type===name)!.value;
 return `${value('year')}-${value('month')}-${value('day')}`;
}
export function questXp(id: QuestId, totalXp: number) {
 const quest=QUESTS.find(q=>q.id===id); if(!quest) throw new Error('Unknown quest.');
 const {level,requiredXp}=progression(totalXp);
 // Tier 1 preserves the proposed small awards; later tiers scale to remain playable.
 return level<=10 ? quest.baseXp : Math.max(quest.baseXp,Math.round((requiredXp || CLASSIC_EXP[97])*quest.baseXp/100));
}
export type Profile = {
 quitDate:string|null; cannabisBaseline:number; revenueGoal:number; savingsGoal:number; savingsDeadline:string;
 monthlyRevenue:number; recurringBusinessCost:number; otherBusinessCosts:number; personalExpenses:number;
 bankBalance:number; debtMonthly:number; debtMonths:number; debtPaymentsMade:number; booksGoal:number; booksRead:number;
};
export const EMPTY_PROFILE: Profile = {quitDate:null,cannabisBaseline:0,revenueGoal:0,savingsGoal:0,savingsDeadline:'',monthlyRevenue:0,recurringBusinessCost:0,otherBusinessCosts:0,personalExpenses:0,bankBalance:0,debtMonthly:0,debtMonths:0,debtPaymentsMade:0,booksGoal:3,booksRead:0};
const moneyKeys=['revenueGoal','savingsGoal','monthlyRevenue','recurringBusinessCost','otherBusinessCosts','personalExpenses','bankBalance','debtMonthly'] as const;
export function validateProfile(input:unknown): Profile {
 if(!input || typeof input!=='object' || Array.isArray(input)) throw new Error('Invalid profile.');
 const raw=input as Record<string,unknown>;
 const p={...EMPTY_PROFILE,...raw} as Profile;
 const allowed=new Set(Object.keys(EMPTY_PROFILE));
 if(Object.keys(raw).some(key=>!allowed.has(key))) throw new Error('Unknown profile field.');
 for(const key of moneyKeys) if(typeof p[key]!=='number' || !Number.isFinite(p[key]) || p[key]<0 || p[key]>1e12) throw new Error('Use a valid non-negative money amount.');
 for(const key of ['debtMonths','debtPaymentsMade','booksGoal','booksRead'] as const) if(!Number.isInteger(p[key]) || p[key]<0 || p[key]>1000) throw new Error('Use a valid whole-number count.');
 if(p.debtPaymentsMade>p.debtMonths) throw new Error('Paid installments cannot exceed scheduled installments.');
 if(typeof p.cannabisBaseline!=='number'||!Number.isFinite(p.cannabisBaseline)||p.cannabisBaseline<0||p.cannabisBaseline>100) throw new Error('Invalid baseline.');
 const validDate=(value:unknown,empty:boolean)=> {
  if(empty && (value===null||value==='')) return true;
  return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
 };
 if(!validDate(p.quitDate,true)||!validDate(p.savingsDeadline,true)) throw new Error('Use a valid date.');
 return p;
}
export function finances(profile: Profile) {
 const businessProfit=profile.monthlyRevenue-profile.recurringBusinessCost-profile.otherBusinessCosts;
 const debtRemaining=profile.debtMonthly*(profile.debtMonths-profile.debtPaymentsMade);
 return {businessProfit,debtRemaining,remainingPayments:profile.debtMonths-profile.debtPaymentsMade,
  cashAfterCosts:businessProfit-profile.personalExpenses-(debtRemaining>0?profile.debtMonthly:0),
  savingsPercent:profile.savingsGoal?Math.min(100,profile.bankBalance/profile.savingsGoal*100):0,
  revenuePercent:profile.revenueGoal?Math.min(100,profile.monthlyRevenue/profile.revenueGoal*100):0};
}
export function validateCannabisLog(input: unknown) {
 if(!input || typeof input!=='object') throw new Error('Invalid check-in.');
 const {grams,trigger} = input as {grams:unknown;trigger:unknown};
 if(typeof grams!=='number'||!Number.isFinite(grams)||grams<0||grams>100) throw new Error('Enter a valid amount between 0 and 100 grams.');
 if(typeof trigger!=='string'||trigger.length>240) throw new Error('Keep your note under 240 characters.');
 return {grams,trigger:trigger.trim()};
}
export type Completion = {day:string;questId:QuestId;xp:number;completedAt:string};
export type GameState = {
 day:string;profile:Profile;progress:ReturnType<typeof progression>;finances:ReturnType<typeof finances>;
 totalXp:number;today:Completion[];history:Completion[];defeated:number;booksPages:number;
 cannabisLog:{grams:number;trigger:string}|null;cleanDays:number;
 breakfast:{unlocked:boolean;claimedAt:string|null};level2Reward:{unlocked:boolean;claimedAt:string|null};
};
