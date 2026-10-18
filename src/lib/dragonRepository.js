import { getSupabaseServerClient } from "./supabaseServer";
import { avancerDragon, appliquerAction, coucher, reveiller, validerNom, nomEtape } from "./dragonEngine";

export async function sauvegarderDragon(dragon) {
  const supabase = getSupabaseServerClient();
  const { id, ...champs } = dragon;
  const { error } = await supabase.from("dragon").update(champs).eq("id", id);
  if (error) throw new Error(error.message);
}

// Mémoire de la journée du dragon, lue pour contextualiser ses rêves. Un échec
// d'écriture est seulement signalé : il ne doit jamais bloquer le jeu.
async function journaliser(type, detail = null) {
  const { error } = await getSupabaseServerClient().from("journal").insert({ type, detail });
  if (error) console.error("Journal indisponible :", error.message);
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
  if (dragonAJour.stage !== dragon.stage) await journaliser("etape", nomEtape(dragonAJour.stage));

  return dragonAJour;
}

export async function appliquerActionEtSauvegarder(actionName) {
  const dragon = await recupererDragonSynchronise();
  const resultat = appliquerAction(dragon, actionName);
  if (resultat.applique) {
    await sauvegarderDragon(resultat.dragon);
    await journaliser("soin", actionName);
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

async function basculerDodo(transition, typeJournal) {
  const dragon = await recupererDragonSynchronise();
  const resultat = transition(dragon);
  if (!resultat) return { dragon, applique: false };
  await sauvegarderDragon(resultat);
  await journaliser(typeJournal);
  return { dragon: resultat, applique: true };
}

export function coucherDragon() {
  return basculerDodo(coucher, "coucher");
}

export function reveillerDragon() {
  return basculerDodo(reveiller, "reveil");
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
