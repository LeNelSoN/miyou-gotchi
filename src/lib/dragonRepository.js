import { getSupabaseServerClient } from "./supabaseServer";
import { avancerDragon, appliquerAction, validerNom } from "./dragonEngine";

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

export async function nommerDragon(nom) {
  const dragon = await recupererDragonSynchronise();
  const nomValide = validerNom(dragon, nom);
  if (nomValide == null) return { dragon, applique: false };

  const resultat = { ...dragon, name: nomValide, named: true };
  await sauvegarderDragon(resultat);
  return { dragon: resultat, applique: true };
}

// Supprime puis recrée la ligne pour repartir des valeurs par défaut du schéma
// (section 3 de la spec), sans dupliquer ces valeurs dans le code.
export async function reinitialiserDragon(stage = 0) {
  const supabase = getSupabaseServerClient();
  const { error: erreurSuppression } = await supabase.from("dragon").delete().not("id", "is", null);
  if (erreurSuppression) throw new Error(erreurSuppression.message);

  const { data: dragon, error } = await supabase.from("dragon").insert({ stage }).select("*").single();
  if (error) throw new Error(error.message);
  return dragon;
}
