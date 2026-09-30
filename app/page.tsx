import { requireChatGPTUser } from "./chatgpt-auth";
import HabitGame from "./habit-game";
export const dynamic = "force-dynamic";
export default async function Home() {
  await requireChatGPTUser("/");
  return <HabitGame />;
}
