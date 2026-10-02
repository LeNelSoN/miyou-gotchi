import { NextResponse } from "next/server";
import { reinitialiserDragon } from "@/lib/dragonRepository";
import { numeroEtape } from "@/lib/dragonEngine";
import { repondreDragon } from "@/lib/dragonActionRoute";
import { modeDebugActif } from "@/lib/dragonDebug";

// Réservé au mode debug : efface le dragon. Corps optionnel `{ "etape": "bebe" }`
// pour démarrer directement à une étape.
export async function POST(request) {
  if (!modeDebugActif()) {
    return NextResponse.json({ erreur: "Mode debug désactivé" }, { status: 404 });
  }
  const { etape } = await request.json().catch(() => ({}));
  const stage = etape == null ? 0 : numeroEtape(etape);
  if (stage < 0) {
    return NextResponse.json({ erreur: `Étape inconnue : ${etape}` }, { status: 400 });
  }
  const dragon = await reinitialiserDragon(stage);
  return repondreDragon(dragon);
}
