import { NextResponse } from "next/server";
import { nommerDragon } from "@/lib/dragonRepository";
import { repondreDragon } from "@/lib/dragonActionRoute";

// Corps : `{ "name": "Miyou" }`.
export async function POST(request) {
  const { name } = await request.json().catch(() => ({}));
  const { dragon, applique } = await nommerDragon(name);
  if (!applique) {
    return NextResponse.json({ erreur: "Ce nom ne peut pas être donné." }, { status: 400 });
  }
  return repondreDragon(dragon);
}
