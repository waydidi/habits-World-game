import { getChatGPTUser } from "@/app/chatgpt-auth";
import { claimBreakfast, completeReading, loadHabits, claimLevelTwoReward } from "@/db/habits";
import { bangkokDay } from "@/lib/habit-rules";
export const dynamic = "force-dynamic";
function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return json({ error: "Please sign in again to load your progress." }, 401);
  try { return json(await loadHabits(user.userId)); }
  catch { return json({ error: "Your progress is unavailable right now. Please retry." }, 503); }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: "Please sign in again to save your progress." }, 401);
  if (request.headers.get("sec-fetch-site") === "cross-site") return json({ error: "Please use your Rich World app to save progress." }, 403);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "This request could not be verified." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Expected a JSON request." }, 415);
  if (Number(request.headers.get("content-length") ?? 0) > 1024) return json({ error: "Request too large." }, 413);
  let body: unknown;
  try { const text = await request.text(); if (text.length > 1024) return json({ error: "Request too large." }, 413); body = JSON.parse(text); }
  catch { return json({ error: "Invalid request." }, 400); }
  if (!body || typeof body !== "object" || !("action" in body) || !("day" in body)) return json({ error: "Invalid request." }, 400);
  const { action, day } = body;
  if (action !== "read" && action !== "claim" && action !== "claim_level2") return json({ error: "Unknown action." }, 400);
  if (day !== bangkokDay()) return json({ error: "A new day has started in Bangkok. Refresh to begin today's habit." }, 409);
  try {
    if (action === "read") await completeReading(user.userId, day as string);
    else if (action === "claim_level2") {
      if (!await claimLevelTwoReward(user.userId)) return json({ error: "Reach level 2 to unlock your big reward." }, 409);
    }
    else if (!await claimBreakfast(user.userId, day as string)) return json({ error: "Read your 10 pages first to unlock breakfast." }, 409);
    return json(await loadHabits(user.userId));
  } catch { return json({ error: "We couldn't save that yet. Retry safely; you won't receive duplicate XP." }, 503); }
}
