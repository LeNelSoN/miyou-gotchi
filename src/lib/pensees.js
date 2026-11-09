import phrases from "../../config/phrases.json";
import { choisirTalent } from "./talents";

const CLE_RECENTES = "miyou-gotchi:pensees";

export const INTERVALLE_PENSEES_MS = phrases.intervalleSecondes * 1000;

// Choisit la liste de phrases d'après les seuls états qualitatifs envoyés par le serveur.
// `evenement` : `{ soin }` après une action réussie, `{ moment }` pour un moment clé.
// Sans phrase pour l'événement, on retombe sur l'état du dragon.
function phrasesPossibles(dragon, evenement) {
  const etape = phrases.etapes[dragon.etape];
  if (!etape) return [];
  if (evenement?.moment && etape.moments?.[evenement.moment]) return etape.moments[evenement.moment];
  // Après une leçon, il parle de ce qu'il vient d'apprendre (sport, lecture, musique).
  if (evenement?.lecon && etape.lecons?.[evenement.lecon]) return etape.lecons[evenement.lecon];
  if (evenement?.soin && etape.soins?.[evenement.soin]) return etape.soins[evenement.soin];
  if (dragon.dodo?.endormi) return etape.reves ?? [];

  const actifs = new Set([
    ...dragon.humeurs,
    dragon.indicateurs.feu,
    dragon.dodo?.fatigue && "fatigue",
    // Levé grognon après une nuit sans coucher : il le dit, après ses vrais besoins.
    dragon.dodo?.grognon && "grognon",
  ]);
  // Triste, il refuse de manger : il le dit plutôt que de réclamer un repas au bouton grisé.
  const repasBloque = dragon.actions?.some(({ nom, bloquee }) => nom === "nourrir" && bloquee);
  if (repasBloque && actifs.has("triste") && (actifs.has("faim") || actifs.has("petitCreux"))) actifs.add("tristeFaim");
  const cle = phrases.priorite.find((etat) => actifs.has(etat) && etape.etats[etat]);
  if (cle) return etape.etats[cle];

  // Sans besoin urgent, l'Adulte parle de temps en temps avec la voix de son archétype.
  const voix = etape.archetypes?.[dragon.archetype];
  if (voix && Math.random() < phrases.partArchetype) return voix;
  // Et, dès le Jeune, de son talent : les phrases de chaque palier atteint s'ajoutent aux précédentes.
  const talent = choisirTalent(dragon.talents);
  const paroles = talent && etape.talents?.[talent.voie]?.slice(0, talent.palier).flat();
  if (paroles?.length && Math.random() < phrases.partTalent) return paroles;
  return etape.etats.content ?? [];
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
export function penser(dragon, evenement) {
  const liste = phrasesPossibles(dragon, evenement);
  if (liste.length === 0) return null;
  const recentes = new Set(lireRecentes());
  const nouvelles = liste.filter((phrase) => !recentes.has(phrase));
  const candidates = nouvelles.length > 0 ? nouvelles : liste;
  const phrase = candidates[Math.floor(Math.random() * candidates.length)];
  memoriser(phrase);
  return phrase;
}
