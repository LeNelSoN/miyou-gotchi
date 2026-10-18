import { coucherDragon } from "@/lib/dragonRepository";
import { repondreDragon } from "@/lib/dragonActionRoute";

export async function POST() {
  const { dragon, applique } = await coucherDragon();
  return repondreDragon(dragon, { applique });
}
