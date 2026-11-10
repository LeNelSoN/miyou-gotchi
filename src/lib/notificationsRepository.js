import webpush from "web-push";
import { getSupabaseServerClient } from "./supabaseServer";
import { dragonPourClient } from "./dragonEngine";
import { recupererDragonSynchronise } from "./dragonRepository";
import { debutSilence, messageDuJour } from "./notifications";

// Le service push a oublié l'abonnement (appli désinstallée, permission retirée).
const ABONNEMENT_EXPIRE = [404, 410];

export async function enregistrerAbonnement(abonnement) {
  if (typeof abonnement?.endpoint !== "string" || !abonnement.keys) return false;
  const { error } = await getSupabaseServerClient()
    .from("abonnements_push")
    .upsert({ endpoint: abonnement.endpoint, abonnement });
  if (error) throw new Error(error.message);
  return true;
}

export async function supprimerAbonnement(endpoint) {
  const { error } = await getSupabaseServerClient().from("abonnements_push").delete().eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}

// Elle s'est déjà occupée de lui depuis le début de la période de silence (soin, leçon, coucher...).
async function activiteRecente(maintenant) {
  const { data, error } = await getSupabaseServerClient().from("dragon").select("derniere_activite").limit(1).single();
  if (error) throw new Error(error.message);
  return data.derniere_activite != null && new Date(data.derniere_activite) >= debutSilence(maintenant);
}

// Le petit mot quotidien, envoyé à chaque appareil abonné. `forcer` ignore l'activité
// récente (pour tester l'envoi).
export async function envoyerPetitMot({ forcer = false } = {}) {
  const maintenant = new Date();
  if (!forcer && (await activiteRecente(maintenant))) return { envoye: 0, raison: "activité récente" };

  const supabase = getSupabaseServerClient();
  const { data: abonnements, error } = await supabase.from("abonnements_push").select("endpoint, abonnement");
  if (error) throw new Error(error.message);
  if (abonnements.length === 0) return { envoye: 0, raison: "aucun abonnement" };

  webpush.setVapidDetails(
    process.env.VAPID_SUJET,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  const dragon = dragonPourClient(await recupererDragonSynchronise(), maintenant);
  // Cadeau pas encore ouvert : on ne gâche pas la surprise.
  if (dragon.enAttente && !forcer) return { envoye: 0, raison: "œuf pas encore réveillé" };
  const message = JSON.stringify(messageDuJour(dragon, maintenant));

  let envoye = 0;
  for (const { endpoint, abonnement } of abonnements) {
    try {
      await webpush.sendNotification(abonnement, message);
      envoye++;
    } catch (erreur) {
      if (ABONNEMENT_EXPIRE.includes(erreur.statusCode)) await supprimerAbonnement(endpoint);
      else console.error("Petit mot non envoyé :", erreur.message);
    }
  }
  return { envoye };
}
