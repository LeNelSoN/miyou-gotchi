import { repondreQuete } from "@/lib/dragonActionRoute";

// Corps : `{ choix: 0 }`, l'index du choix dans la scène en cours (`config/quetes/`).
export async function POST(request) {
  const corps = await request.json().catch(() => ({}));
  return repondreQuete(Number(corps.choix));
}
