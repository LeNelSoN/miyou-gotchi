import { NextResponse } from "next/server";
import { repondreDragon } from "@/lib/dragonActionRoute";
import { recupererDragonSynchronise } from "@/lib/dragonRepository";
import {
  modeDebugActif,
  avancerTemps,
  finirEtape,
  ajusterCaracteristique,
  calibrationPossible,
  calibrerConfig,
} from "@/lib/dragonDebug";

// Corps : `{ avancerHeures: 6 }`, `{ finirEtape: true }`, `{ ajuster: { nom: "feu", delta: -20 } }`
// ou `{ calibrer: { chemin: ["caracteristiques", "feu", "seuilMin"], valeur: 45 } }`.
export async function POST(request) {
  if (!modeDebugActif()) {
    return NextResponse.json({ erreur: "Mode debug désactivé" }, { status: 404 });
  }
  const corps = await request.json();

  if (corps.calibrer) {
    const calibre =
      calibrationPossible() && (await calibrerConfig(corps.calibrer.chemin, Number(corps.calibrer.valeur)));
    if (!calibre) {
      return NextResponse.json({ erreur: "Calibration impossible" }, { status: 400 });
    }
    return repondreDragon(await recupererDragonSynchronise());
  }
  if (corps.finirEtape) return repondreDragon(await finirEtape());
  if (corps.ajuster) {
    return repondreDragon(await ajusterCaracteristique(corps.ajuster.nom, Number(corps.ajuster.delta)));
  }
  const heures = Math.floor(Number(corps.avancerHeures));
  if (heures > 0) return repondreDragon(await avancerTemps(heures));

  return NextResponse.json({ erreur: "Commande debug inconnue" }, { status: 400 });
}
