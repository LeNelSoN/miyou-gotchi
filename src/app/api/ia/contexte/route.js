import { NextResponse } from "next/server";
import { secretValide } from "@/lib/secretRoute";
import { contexteReve } from "@/lib/revesRepository";

// Interrogée régulièrement par le homelab : `{ aGenerer: false }`, ou la requête
// Ollama à exécuter pour le rêve de la nuit en cours (avec `sommeilDebut` à renvoyer).
export async function GET(request) {
  if (!secretValide(request, "IA_SECRET")) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }
  return NextResponse.json(await contexteReve());
}
