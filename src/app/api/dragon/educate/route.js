import { repondreLecon } from "@/lib/dragonActionRoute";

// Corps : `{ lecon: "sport" }` (types dans `config/game.json`, `lecons.types`).
export async function POST(request) {
  const corps = await request.json().catch(() => ({}));
  return repondreLecon(corps.lecon);
}
