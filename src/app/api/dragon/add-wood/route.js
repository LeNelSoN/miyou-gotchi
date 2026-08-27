import { NextResponse } from "next/server";
import { appliquerActionEtSauvegarder } from "@/lib/dragonRepository";
import { dragonPourClient } from "@/lib/dragonEngine";

export async function POST() {
  const { dragon, applique } = await appliquerActionEtSauvegarder("ajouterBois");
  return NextResponse.json({ ...dragonPourClient(dragon), applique });
}
