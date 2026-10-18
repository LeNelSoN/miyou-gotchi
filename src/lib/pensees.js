import phrases from "../../config/phrases.json";

const CLE_RECENTES = "miyou-gotchi:pensees";

export const INTERVALLE_PENSEES_MS = phrases.intervalleSecondes * 1000;

// Choisit la liste de phrases d'après les seuls états qualitatifs envoyés par le serveur.
// `evenement` : `{ soin }` après une action réussie, `{ moment }` pour un moment clé.
// Sans phrase pour l'événement, on retombe sur l'état du dragon.
function phrasesPossibles(dragon, evenement) {
  const etape = phrases.etapes[dragon.etape];
  if (!etape) return [];
  if (evenement?.moment && etape.moments?.[evenement.moment]) return etape.moments[evenement.moment];
  if (evenement?.soin && etape.soins?.[evenement.soin]) return etape.soins[evenement.soin];
  if (dragon.dodo?.endormi) return etape.reves ?? [];

  const actifs = new Set([...dragon.humeurs, dragon.indicateurs.feu, dragon.dodo?.fatigue && "fatigue"]);
  const cle = phrases.priorite.find((etat) => actifs.has(etat) && etape.etats[etat]) ?? "content";
  return etape.etats[cle] ?? [];
}

// Les phrases déjà vues sur cet appareil sont écartées tant qu'il en reste d'autres.
function lireRecentes() {
  try {
    return JSON.parse(localStorage.getItem(CLE_RECENTES)) ?? [];
  } catch {
    return [];
  }
}

function memoriser(phrase) {
  const recentes = [phrase, ...lireRecentes().filter((p) => p !== phrase)].slice(0, phrases.antiRepetition);
  try {
    localStorage.setItem(CLE_RECENTES, JSON.stringify(recentes));
  } catch {
    // Stockage indisponible : les répétitions sont simplement plus fréquentes.
  }
}

// Renvoie une phrase au hasard, ou `null` si l'étape n'a pas encore de phrases.
// Le rêve de la nuit généré par l'IA, s'il existe, remplace ceux de la banque.
export function penser(dragon, evenement) {
  if (dragon.dodo?.endormi && dragon.reve && !evenement) return dragon.reve;
  const liste = phrasesPossibles(dragon, evenement);
  if (liste.length === 0) return null;
  const recentes = new Set(lireRecentes());
  const nouvelles = liste.filter((phrase) => !recentes.has(phrase));
  const candidates = nouvelles.length > 0 ? nouvelles : liste;
  const phrase = candidates[Math.floor(Math.random() * candidates.length)];
  memoriser(phrase);
  return phrase;
}
