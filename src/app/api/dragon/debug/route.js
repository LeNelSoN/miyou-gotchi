import { NextResponse } from "next/server";
import { repondreDragon } from "@/lib/dragonActionRoute";
import { modeDebugActif, avancerTemps, finirEtape, ajusterCaracteristique } from "@/lib/dragonDebug";

// Corps : `{ avancerHeures: 6 }`, `{ finirEtape: true }` ou `{ ajuster: { nom: "feu", delta: -20 } }`.
export async function POST(request) {
  if (!modeDebugActif()) {
    return NextResponse.json({ erreur: "Mode debug désactivé" }, { status: 404 });
  }
  const corps = await request.json();

  if (corps.finirEtape) return repondreDragon(await finirEtape());
  if (corps.ajuster) {
    return repondreDragon(await ajusterCaracteristique(corps.ajuster.nom, Number(corps.ajuster.delta)));
  }
  const heures = Math.floor(Number(corps.avancerHeures));
  if (heures > 0) return repondreDragon(await avancerTemps(heures));

  return NextResponse.json({ erreur: "Commande debug inconnue" }, { status: 400 });
}
