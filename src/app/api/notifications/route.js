import { NextResponse } from "next/server";
import { enregistrerAbonnement, supprimerAbonnement } from "@/lib/notificationsRepository";

// Abonne cet appareil au petit mot quotidien. Corps : l'abonnement push du navigateur.
export async function POST(request) {
  const valide = await enregistrerAbonnement(await request.json());
  if (!valide) return NextResponse.json({ erreur: "Abonnement invalide." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// Corps : `{ endpoint }`.
export async function DELETE(request) {
  const { endpoint } = await request.json();
  if (typeof endpoint !== "string") return NextResponse.json({ erreur: "Abonnement invalide." }, { status: 400 });
  await supprimerAbonnement(endpoint);
  return NextResponse.json({ ok: true });
}
