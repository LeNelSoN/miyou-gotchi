import { NextResponse } from "next/server";
import { reinitialiserDragon } from "@/lib/dragonRepository";
import { dragonPourClient, numeroEtape } from "@/lib/dragonEngine";

// Corps optionnel `{ "etape": "bebe" }` pour démarrer directement à une étape (tests).
export async function POST(request) {
  const { etape } = await request.json().catch(() => ({}));
  const stage = etape == null ? 0 : numeroEtape(etape);
  if (stage < 0) {
    return NextResponse.json({ erreur: `Étape inconnue : ${etape}` }, { status: 400 });
  }
  const dragon = await reinitialiserDragon(stage);
  return NextResponse.json(dragonPourClient(dragon));
}
