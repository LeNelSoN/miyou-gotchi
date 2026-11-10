import { demarrerDragon } from "@/lib/dragonRepository";
import { repondreDragon } from "@/lib/dragonActionRoute";

// Réveille l'œuf tout neuf : le temps du jeu démarre maintenant.
export async function POST() {
  const { dragon, applique } = await demarrerDragon();
  return repondreDragon(dragon, { applique });
}
