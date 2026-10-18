import { NextResponse } from "next/server";
import { secretValide } from "@/lib/secretRoute";
import { enregistrerReve } from "@/lib/revesRepository";

// Corps : `{ sommeilDebut, modele, reponse }`, `reponse` étant le texte JSON produit par le modèle.
// 422 si le rêve est rejeté par les garde-fous (le homelab pourra retenter), 409 si la nuit est finie.
export async function POST(request) {
  if (!secretValide(request, "IA_SECRET")) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }
  const { statut, erreur } = await enregistrerReve(await request.json());
  return NextResponse.json(erreur ? { erreur } : { ok: true }, { status: statut });
}
