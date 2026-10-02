import { recupererDragonSynchronise } from "@/lib/dragonRepository";
import { repondreDragon } from "@/lib/dragonActionRoute";

export async function GET() {
  const dragon = await recupererDragonSynchronise();
  return repondreDragon(dragon);
}
