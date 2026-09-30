"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Check, CircleCheck, Coffee, Gem, Globe2, LockKeyhole, RefreshCw, Sparkles, Trophy, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { bangkokDay, type HabitState } from "@/lib/habit-rules";

type ModelContext = { registerTool(tool: { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean }; execute(input: unknown): Promise<unknown> }, options: { signal: AbortSignal }): void | Promise<void> };
function formatDay(day: string) { return new Date(day + "T12:00:00+07:00").toLocaleDateString("en-US", { timeZone: "Asia/Bangkok", month: "short", day: "numeric" }); }

export default function HabitGame() {
  const [state, setState] = useState<HabitState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [celebrate, setCelebrate] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const stateRef = useRef<HabitState | null>(null);
  const busyRef = useRef(false);
  const applyState = useCallback((next: HabitState) => { stateRef.current = next; setState(next); }, []);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/habits", { cache: "no-store" });
      const data = await response.json() as HabitState & { error?: string };
      if (!response.ok) throw new Error(data.error || "Couldn't load your progress.");
      applyState(data); setError(""); return data as HabitState;
    } catch (e) { setError(e instanceof Error ? e.message : "Please retry loading your progress."); return null; }
    finally { setLoading(false); }
  }, [applyState]);
  useEffect(() => {
    void refresh();
    const checkDay = () => { if (stateRef.current && stateRef.current.day !== bangkokDay()) { setCelebrate(false); void refresh(); } };
    const visible = () => { if (document.visibilityState === "visible" && !busyRef.current) { setCelebrate(false); void refresh(); } };
    const timer = window.setInterval(checkDay, 30000);
    document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [refresh]);
  const act = useCallback(async (action: "read" | "claim") => {
    if (!stateRef.current || busyRef.current) throw new Error("Please wait until your progress loads.");
    busyRef.current = true; setBusy(true); setError("");
    const previous = stateRef.current;
    try {
      const response = await fetch("/api/habits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, day: previous.day }) });
      const next = await response.json() as HabitState & { error?: string };
      if (!response.ok) throw new Error(next.error || "Couldn't save your progress.");
      applyState(next);
      if (action === "claim" && !previous.today?.rewardAt && next.today?.rewardAt) {
        setCelebrate(true); setAnnouncement("Breakfast claimed! You earned 2 XP. Your habit is 100 percent complete.");
      } else if (action === "read") setAnnouncement("Reading complete. Your breakfast reward is unlocked.");
      return next as HabitState;
    } catch (e) { const message = e instanceof Error ? e.message : "Couldn't save. Please retry."; setError(message); throw new Error(message); }
    finally { busyRef.current = false; setBusy(false); }
  }, [applyState]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools = [
      { name: "read_habit_progress", title: "Read habit progress", description: "Read the current saved habit, XP, and level progress without changing it.", annotations: { readOnlyHint: true }, execute: async () => { const result = await refresh(); if (!result) throw new Error("Progress unavailable."); return result; } },
      { name: "complete_reading_habit", title: "Complete reading habit", description: "Record that the user has actually read today's 10 pages and unlock breakfast. Only run when the user confirms reading.", annotations: { readOnlyHint: false }, execute: async () => act("read") },
      { name: "claim_breakfast_reward", title: "Claim breakfast reward", description: "Claim the unlocked breakfast reward and award 2 XP once. Only run when the user confirms claiming the reward.", annotations: { readOnlyHint: false }, execute: async () => act("claim") },
    ];
    for (const tool of tools) {
      try { void Promise.resolve(context.registerTool({ ...tool, inputSchema: { type: "object", properties: {}, additionalProperties: false }, execute: async (input) => { if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) throw new Error("Expected an empty object."); return tool.execute(); } }, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional browser capability. */ }
    }
    return () => lifecycle.abort();
  }, [act, refresh]);

  const read = Boolean(state?.today?.readAt);
  const claimed = Boolean(state?.today?.rewardAt);
  const completed = state?.completed ?? 0;
  const stageDone = completed >= 10;
  const percent = state?.habitPercent ?? 0;
  const activeDay = state?.day ?? bangkokDay();
  const dateLabel = new Date(activeDay + "T12:00:00+07:00").toLocaleDateString("en-US", { timeZone: "Asia/Bangkok", weekday: "long", month: "long", day: "numeric" });
  return (
    <div className="game-shell">
      <header className="topbar">
        <a href="/" className="wordmark" aria-label="Rich World home"><span className="brand-mark"><Globe2 size={23} strokeWidth={1.7} /></span>RICH WORLD<span className="brand-note">HABIT GAME</span></a>
        <span className="private-label"><LockKeyhole size={14} /> Your personal world</span>
      </header>
      <main>
        <div className="heading-row"><div><p className="eyebrow">A LITTLE BETTER, EVERY DAY</p><h1>Your next chapter.</h1></div><div className="date-label"><span>{dateLabel}</span><small>Resets at midnight · Bangkok</small></div></div>
        {error && <div className="error-box" role="alert"><div>{error} {error.includes("sign in") && <a href="/signin-with-chatgpt?return_to=%2F" target="_top">Sign in</a>}</div><button onClick={() => void refresh()} disabled={busy}><RefreshCw size={16} /> Refresh</button></div>}
        <div className="workspace">
          <section className="quest-panel" aria-labelledby="quest-title">
            <div className="panel-label"><span><Sparkles size={16} /> TODAY'S QUEST</span><span className="xp-badge"><Zap size={14} fill="currentColor" /> +2 XP</span></div>
            <h2 id="quest-title">A good morning<br />starts with 10 pages.</h2>
            <p className="quest-intro">A small investment in yourself. A breakfast worth looking forward to.</p>
            <div className="quest-step">
              <div className={`step-symbol ${read ? "finished" : ""}`}>{read ? <Check size={25} /> : <BookOpen size={25} />}</div>
              <div className="step-text"><span className="step-label">01 · BUILD THE HABIT</span><h3>Read 10 pages</h3><p>Any book. Your pace. Just ten pages.</p></div>
              {read && <span className="done-note">Done</span>}
            </div>
            <button className="read-button" disabled={busy || !state || read} onClick={() => { void act("read").catch(() => {}); }}>
              {busy && !read ? "Saving…" : read ? <><CircleCheck size={19} /> 10 pages completed</> : loading ? "Loading your progress…" : "I've read my 10 pages"}
            </button>
            <div className={`reward-card ${read ? "unlocked" : ""} ${claimed ? "claimed" : ""}`}>
              <div className="reward-header"><span className="reward-symbol"><Coffee size={25} /></span><span className="reward-status">{claimed ? <><Check size={14} /> CLAIMED</> : read ? <><Sparkles size={14} /> UNLOCKED</> : <><LockKeyhole size={14} /> LOCKED FOR NOW</>}</span></div>
              <span className="step-label">02 · ENJOY YOUR REWARD</span><h3>A really good breakfast</h3>
              <p>Healthy, delicious, or a little luxurious.<br />You choose what feels like a reward.</p>
              <button className="reward-button" disabled={busy || !state || !read || claimed} onClick={() => { void act("claim").catch(() => {}); }}>
                {busy && read && !claimed ? "Saving…" : claimed ? <><CircleCheck size={18} /> Enjoy your breakfast</> : read ? <><Coffee size={18} /> Claim breakfast & earn 2 XP</> : <><LockKeyhole size={16} /> Read first to unlock</>}
              </button>
            </div>
            <div className="daily-gauge"><div><span>Today's habit</span><strong>{percent.toFixed(2)}%</strong></div><Progress value={percent} aria-label="Today's habit progress" className="daily-progress" /><p>{claimed ? "One promise to yourself, kept. See you tomorrow." : read ? "Reading done. Claim your breakfast to complete the habit." : "Read, reward, repeat. One habit a day is enough."}</p></div>
          </section>
          <aside className="member-column">
            <section className="member-panel" aria-labelledby="member-title">
              <div className="member-top"><span className="eyebrow">YOUR MEMBERSHIP</span><Gem size={20} /></div>
              <div className="member-emblem"><Gem size={37} strokeWidth={1.3} /></div>
              <h2 id="member-title">New, Rich World member</h2><p className="member-description">Your world grows with every habit.</p>
              <div className="member-stats"><div><span>CURRENT LEVEL</span><strong>{state?.level ?? 1}<small> / 10</small></strong></div><div><span>TOTAL EXPERIENCE</span><strong>{state?.totalXp ?? 0}<small> XP</small></strong></div></div>
              <div className="stage-head"><span>First chapter</span><strong>{(state?.stagePercent ?? 0).toFixed(2)}%</strong></div>
              <Progress value={state?.stagePercent ?? 0} aria-label="First ten levels progress" className="stage-progress" />
              <p className="stage-note">{stageDone ? "All 10 levels complete. Keep your habit going and earn 2 XP each day." : `${Math.min(completed, 10)} of 10 levels completed · one habit per level`}</p>
            </section>
            <section className="level-panel" aria-labelledby="levels-title"><div className="section-head"><h2 id="levels-title">Your first 10 levels</h2><Trophy size={19} /></div>
              <div className="level-grid">{Array.from({ length: 10 }, (_, i) => <div key={i} className={`level-tile ${completed > i ? "complete" : completed === i ? "current" : ""}`} aria-label={`Level ${i + 1}: ${completed > i ? "completed" : completed === i ? "current" : "locked"}`}><span>{completed > i ? <Check size={18} /> : i + 1}</span><small>{completed > i ? "DONE" : completed === i ? "NEXT" : "2 XP"}</small></div>)}</div>
              <p>10 small wins. 20 XP. A stronger you.</p>
            </section>
          </aside>
        </div>
        <section className="history-panel" aria-labelledby="history-title"><div className="section-head"><h2 id="history-title">Your small wins</h2><span>{completed} habit{completed === 1 ? "" : "s"} completed</span></div>
          {!state || state.history.length === 0 ? <div className="empty-history"><BookOpen size={22} /><p>{loading ? "Loading your saved progress…" : "Your story starts with today's ten pages."}</p><span>{loading ? "" : "Each completed habit will appear here."}</span></div> : <ul className="history-list">{state.history.map((item) => <li key={item.day}><span className={`history-icon ${item.rewardAt ? "complete" : ""}`}>{item.rewardAt ? <Check size={17} /> : <BookOpen size={17} />}</span><div><strong>{item.day === activeDay ? "Today" : formatDay(item.day)}</strong><span>{item.rewardAt ? "10 pages read · Breakfast claimed" : "10 pages read · Breakfast not claimed"}</span></div><span className="history-xp">{item.rewardAt ? "+2 XP" : "0 XP"}</span></li>)}</ul>}
        </section>
        <footer>RICH WORLD <span>One habit. One reward. One step forward.</span></footer>
      </main>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
      {celebrate && <div className="celebration" role="status"><div className="celebration-icon"><Sparkles size={24} /></div><div><strong>A small win. A richer world.</strong><p>+2 XP earned · Today's habit: 100.00%</p></div><button onClick={() => setCelebrate(false)} aria-label="Dismiss celebration">×</button></div>}
    </div>
  );
}
