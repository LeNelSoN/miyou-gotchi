import { getSupabaseServerClient } from "./supabaseServer";
import { nomEtape } from "./dragonEngine";
import { recupererDragonSynchronise } from "./dragonRepository";
import {
  construireRequeteReve,
  themeAuHasard,
  validerReve,
  NOMBRE_REVES_PRECEDENTS,
  TENTATIVES_MAX,
} from "./reves";

function memeInstant(a, b) {
  return a != null && b != null && new Date(a).getTime() === new Date(b).getTime();
}

function heureLocale(horodatage) {
  return new Date(horodatage)
    .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })
    .replace(":", " h ");
}

async function soinsDepuis(depuis) {
  const { data, error } = await getSupabaseServerClient()
    .from("journal")
    .select("type, detail")
    .gte("created_at", depuis);
  if (error) throw new Error(error.message);

  const soins = {};
  for (const { detail } of data.filter((ligne) => ligne.type === "soin")) soins[detail] = (soins[detail] ?? 0) + 1;
  return { soins, coucheParEnfant: data.some((ligne) => ligne.type === "coucher") };
}

// Ce que le homelab doit générer maintenant : un rêve pour la nuit en cours, s'il n'en a
// pas déjà un valide et qu'il reste des tentatives (les rejets comptent).
export async function contexteReve() {
  const dragon = await recupererDragonSynchronise();
  if (!dragon.sleeping_since) return { aGenerer: false };

  const supabase = getSupabaseServerClient();
  const { data: tentatives, error } = await supabase
    .from("pensees_ia")
    .select("rejet")
    .eq("sommeil_debut", dragon.sleeping_since);
  if (error) throw new Error(error.message);
  if (tentatives.some((t) => t.rejet == null) || tentatives.length >= TENTATIVES_MAX) return { aGenerer: false };

  const { data: precedents, error: erreurPrecedents } = await supabase
    .from("pensees_ia")
    .select("reveil")
    .is("rejet", null)
    .order("sommeil_debut", { ascending: false })
    .limit(NOMBRE_REVES_PRECEDENTS);
  if (erreurPrecedents) throw new Error(erreurPrecedents.message);

  const { soins, coucheParEnfant } = await soinsDepuis(dragon.awake_since);
  const requete = construireRequeteReve({
    nom: dragon.named ? dragon.name : null,
    etape: nomEtape(dragon.stage),
    archetype: dragon.personality,
    heureCoucher: heureLocale(dragon.sleeping_since),
    coucheParEnfant,
    soins,
    revesPrecedents: precedents.map((p) => p.reveil),
    theme: themeAuHasard(),
  });
  return { aGenerer: true, sommeilDebut: dragon.sleeping_since, requete };
}

// Enregistre la réponse du modèle, acceptée ou rejetée (les rejets servent à ajuster le prompt).
export async function enregistrerReve({ sommeilDebut, modele, reponse }) {
  const dragon = await recupererDragonSynchronise();
  if (!memeInstant(dragon.sleeping_since, sommeilDebut)) {
    return { statut: 409, erreur: "Le dragon ne dort plus, ou ce n'est plus la même nuit." };
  }

  const resultat = validerReve(reponse);
  const { error } = await getSupabaseServerClient()
    .from("pensees_ia")
    .insert({
      sommeil_debut: dragon.sleeping_since,
      modele: typeof modele === "string" ? modele : null,
      pendant: resultat.pendant ?? null,
      reveil: resultat.reveil ?? null,
      rejet: resultat.rejet ?? null,
      brut: typeof reponse === "string" ? reponse : null,
    });
  if (error) throw new Error(error.message);

  return resultat.rejet ? { statut: 422, erreur: resultat.rejet } : { statut: 200 };
}

// Pendant le sommeil, le rêve de la nuit ; au réveil, une seule fois, son récit.
// Une erreur ici (homelab jamais branché, table absente...) ne doit jamais bloquer le jeu.
export async function revesPourClient(dragon) {
  try {
    const supabase = getSupabaseServerClient();
    if (dragon.sleeping_since) {
      const { data } = await supabase
        .from("pensees_ia")
        .select("pendant")
        .eq("sommeil_debut", dragon.sleeping_since)
        .is("rejet", null)
        .limit(1)
        .maybeSingle();
      return data ? { reve: data.pendant } : {};
    }

    const { data } = await supabase
      .from("pensees_ia")
      .select("reveil")
      .is("rejet", null)
      .eq("raconte", false)
      .lt("sommeil_debut", dragon.awake_since)
      .order("sommeil_debut", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return {};
    await supabase.from("pensees_ia").update({ raconte: true }).eq("raconte", false).lt("sommeil_debut", dragon.awake_since);
    return { souvenirReve: data.reveil };
  } catch (erreur) {
    console.error("Rêves indisponibles :", erreur);
    return {};
  }
}

// Debug : quand le temps avance, la nuit en cours garde son rêve.
export async function decalerReves(ancienDebut, nouveauDebut) {
  await getSupabaseServerClient()
    .from("pensees_ia")
    .update({ sommeil_debut: nouveauDebut })
    .eq("sommeil_debut", ancienDebut);
}
