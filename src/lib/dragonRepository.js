import { getSupabaseServerClient } from "./supabaseServer";
import { avancerDragon, appliquerAction, appliquerLecon, coucher, demarrer, reveiller, validerNom } from "./dragonEngine";
import { jouerChoix } from "./quete";

export async function sauvegarderDragon(dragon) {
  const supabase = getSupabaseServerClient();
  const { id, ...champs } = dragon;
  const { error } = await supabase.from("dragon").update(champs).eq("id", id);
  if (error) throw new Error(error.message);
}

// Retient le dernier passage de la joueuse (soin, leçon, nom, coucher, réveil) : le petit mot
// du jour n'est pas envoyé si elle s'est déjà occupée de lui.
function avecActivite(dragon) {
  return { ...dragon, derniere_activite: new Date().toISOString() };
}

export async function recupererDragonSynchronise() {
  const supabase = getSupabaseServerClient();
  const { data: dragon, error } = await supabase.from("dragon").select("*").limit(1).single();
  if (error) throw new Error(error.message);

  const dragonAJour = avancerDragon(dragon);
  const champsTemps = ["last_seen", "sleeping_since", "awake_since"];
  if (champsTemps.some((champ) => dragonAJour[champ] !== dragon[champ])) {
    await sauvegarderDragon(dragonAJour);
  }
  return dragonAJour;
}

export async function appliquerActionEtSauvegarder(actionName) {
  const dragon = await recupererDragonSynchronise();
  const resultat = appliquerAction(dragon, actionName);
  if (!resultat.applique) return resultat;
  const dragonSoigne = avecActivite(resultat.dragon);
  await sauvegarderDragon(dragonSoigne);
  return { dragon: dragonSoigne, applique: true, exces: resultat.exces };
}

export async function appliquerLeconEtSauvegarder(lecon) {
  const dragon = await recupererDragonSynchronise();
  const resultat = appliquerLecon(dragon, lecon);
  if (!resultat.applique) return resultat;
  const dragonInstruit = avecActivite(resultat.dragon);
  await sauvegarderDragon(dragonInstruit);
  return { dragon: dragonInstruit, applique: true };
}

// Une étape de quête : le choix `index` de la scène en cours (Adulte).
export async function jouerChoixEtSauvegarder(index) {
  const dragon = await recupererDragonSynchronise();
  const { dragon: avance, applique, resultat } = jouerChoix(dragon, index);
  if (!applique) return { dragon, applique: false, resultat: null };
  const dragonAventurier = avecActivite(avance);
  await sauvegarderDragon(dragonAventurier);
  return { dragon: dragonAventurier, applique: true, resultat };
}

export async function nommerDragon(nom) {
  const dragon = await recupererDragonSynchronise();
  const nomValide = validerNom(dragon, nom);
  if (nomValide == null) return { dragon, applique: false };

  const resultat = avecActivite({ ...dragon, name: nomValide, named: true });
  await sauvegarderDragon(resultat);
  return { dragon: resultat, applique: true };
}

// Applique une transition du moteur (coucher, réveiller, réveiller l'œuf) ; `null` = refusée.
async function transitionner(transition) {
  const dragon = await recupererDragonSynchronise();
  const transitionne = transition(dragon);
  if (!transitionne) return { dragon, applique: false };
  const resultat = avecActivite(transitionne);
  await sauvegarderDragon(resultat);
  return { dragon: resultat, applique: true };
}

export function coucherDragon() {
  return transitionner(coucher);
}

export function reveillerDragon() {
  return transitionner(reveiller);
}

export function demarrerDragon() {
  return transitionner(demarrer);
}

// Supprime puis recrée la ligne pour repartir des valeurs par défaut du schéma
// (section 3 de la spec), sans dupliquer ces valeurs dans le code. Un œuf neuf attend d'être
// réveillé (`demarre_le` vide) ; une autre étape (debug) démarre tout de suite.
export async function reinitialiserDragon(stage = 0) {
  const supabase = getSupabaseServerClient();
  const { error: erreurSuppression } = await supabase.from("dragon").delete().not("id", "is", null);
  if (erreurSuppression) throw new Error(erreurSuppression.message);

  const { data: dragon, error } = await supabase.from("dragon").insert({ stage, demarre_le: stage === 0 ? null : new Date().toISOString() }).select("*").single();
  if (error) throw new Error(error.message);
  return dragon;
}
