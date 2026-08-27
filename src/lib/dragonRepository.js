import { getSupabaseServerClient } from "./supabaseServer";
import { avancerDragon, appliquerAction } from "./dragonEngine";

export async function sauvegarderDragon(dragon) {
  const supabase = getSupabaseServerClient();
  const { id, ...champs } = dragon;
  const { error } = await supabase.from("dragon").update(champs).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function recupererDragonSynchronise() {
  const supabase = getSupabaseServerClient();
  const { data: dragon, error } = await supabase.from("dragon").select("*").limit(1).single();
  if (error) throw new Error(error.message);

  const dragonAJour = avancerDragon(dragon);
  if (dragonAJour.last_seen !== dragon.last_seen) {
    await sauvegarderDragon(dragonAJour);
  }

  return dragonAJour;
}

export async function appliquerActionEtSauvegarder(actionName) {
  const dragon = await recupererDragonSynchronise();
  const resultat = appliquerAction(dragon, actionName);
  if (resultat.applique) {
    await sauvegarderDragon(resultat.dragon);
  }
  return resultat;
}
