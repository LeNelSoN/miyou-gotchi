import { reveillerDragon } from "@/lib/dragonRepository";
import { messagesRefusReveil } from "@/lib/dragonEngine";
import { repondreDragon } from "@/lib/dragonActionRoute";

export async function POST() {
  const { dragon, applique } = await reveillerDragon();
  return repondreDragon(dragon, { applique, toasts: applique ? [] : messagesRefusReveil(dragon) });
}
