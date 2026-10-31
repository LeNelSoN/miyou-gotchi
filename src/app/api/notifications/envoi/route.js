import { NextResponse } from "next/server";
import { secretValide } from "@/lib/secretRoute";
import { envoyerPetitMot } from "@/lib/notificationsRepository";

// Appelée chaque jour par le cron Vercel (vercel.json) à 16 h UTC, soit 17 h au Maroc
// (16 h pendant le Ramadan). `?forcer=1` envoie même si elle vient de jouer, pour tester.
export async function GET(request) {
  if (!secretValide(request, "CRON_SECRET")) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }
  const forcer = request.nextUrl.searchParams.get("forcer") === "1";
  return NextResponse.json(await envoyerPetitMot({ forcer }));
}
