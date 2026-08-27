import { NextResponse } from "next/server";
import { recupererDragonSynchronise } from "@/lib/dragonRepository";
import { dragonPourClient } from "@/lib/dragonEngine";

export async function GET() {
  const dragon = await recupererDragonSynchronise();
  return NextResponse.json(dragonPourClient(dragon));
}
