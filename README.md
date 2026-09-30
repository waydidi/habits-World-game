# Rich World — Habit Adventure

A private, persistent habit RPG with an original pixel-art Novice and seven habit monsters. Complete real-life actions, confirm completion, defeat a monster, and earn EXP.

## Classic progression

Normal **Ragnarok Classic Base EXP** thresholds from level 1 to level 99 are stored in `lib/classic-exp.ts`. Source: https://irowiki.org/classic/Base_EXP_Chart. All 98 thresholds sum to 405,234,427 EXP. Overflow carries into the next level; level 99 displays MAX. The UI shows raw EXP and progress to two decimal places.

Habit-monster EXP is custom, not an assertion about official Ragnarok monster rewards. Levels 1–10 use the proposed small awards (5 EXP for a cannabis-free day, 2 for sleep, sales, reading, or walking, and 1 for ledger or relationships). From level 11, training tiers scale monster awards against the current Classic level requirement: `max(base, round(requiredEXP × base / 100))`. Awarded EXP is stored at completion and never retroactively changes. The level table itself remains unchanged.

## Quests and rewards

- Core: cannabis-free day after the user's chosen quit date, bedtime wind-down routine, and one concrete business sales action.
- Optional: read 10 pages, walk 15 minutes, record money, and connect with someone important.
- Each monster can be defeated once per Bangkok calendar day. Self-reported completion is required. Unique database keys prevent repeated claims and retries from duplicating EXP.
- Reading unlocks breakfast. Reaching level 2 (9 total EXP) unlocks MK buffet, Korean BBQ, Mookrata, pizza, KFC, or McDonald's. Meals are arranged personally. Claiming a meal records the reward without adding EXP.
- Cannabis check-ins record grams and an optional trigger note. Recorded use blocks a new clean-day award. A later lapse preserves earned EXP while updating the honest clean-day count. No EXP or level penalties.

## Goals and money

The user can record revenue, recurring and other business costs, personal expenses, savings, book completions, a quit date, and a debt-installment schedule. Revenue, profit, and cash after debt/personal costs are separate. Scheduled debt remaining is `monthly installment × unpaid installments`; it is not represented as a lender-verified principal balance. The game does not connect to banks or execute payments.

Personal starting figures are configured through the secret `PERSONAL_SETUP` runtime variable and copied into the authenticated user's private D1 profile on first access. They are not committed to this public source repository. UI edits are saved privately. The hosted audience remains owner-only with ChatGPT sign-in. Never commit runtime secrets, user health logs, or financial records.

## Data and compatibility

Drizzle migrations append tables for quest completions, profiles, check-ins, and milestones. Original `habit_days` records remain intact and import idempotently as reading victories worth 2 EXP each. The older `/api/habits` endpoint remains for legacy sessions; the current game uses `/api/game`. All new writes validate authentication, origin, Bangkok day, and inputs. EXP is server-authoritative.

## Development and verification

```sh
npm ci --ignore-scripts
npm test
npx tsc --noEmit
npm run build
```

Generate a new Drizzle migration after schema edits; preserve previously applied migrations. `.openai/hosting.json` retains the Site identity and logical D1 binding. Publish the exact tested source and built Worker archive.

Tests cover every Classic level boundary, cap and carryover, quest reward tiers, duplicate claims, user isolation, cannabis eligibility, legacy imports, level-2 rewards, profile validation, and debt calculations.

## Artwork

`public/habit-rpg-atlas.png` is an original transparent 3×3 pixel-art atlas generated with the built-in image-generation tool. Prompt: isolated Novice idle/attack sprites and seven friendly habit monsters, early-2000s MMORPG-inspired pixels, orange adventurer clothing, consistent scale and transparent cells. No official game sprites are included. Sprite cells are selected with CSS background positions. Reduced-motion preferences disable battle animations.

Optional browser WebMCP tools read the world, record explicitly confirmed habit completions, and claim explicitly confirmed unlocked rewards. Unsupported browsers use the normal interface.
