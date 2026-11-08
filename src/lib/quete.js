import config from "../../config/game.json";
import voyageInitiatique from "../../config/quetes/voyage-initiatique.json";
import {
  caracteristiquesActives,
  clamp,
  estDansBonneZone,
  estEndormi,
  estFatigue,
  fatiguer,
  nomEtape,
} from "./dragonEngine";

// Quêtes de l'Adulte (spec, section 5, « Étape 4 bis »), jouées dans l'ordre de `quete.ordre`.
// Ajouter une quête : son fichier dans `config/quetes/`, une ligne ici, son id dans `quete.ordre`.
const QUETES = Object.fromEntries([voyageInitiatique].map((quete) => [quete.id, quete]));

const ICONES_TALENTS = { sport: "⚽", lecture: "📖", musique: "🎵" };

// Jour de la joueuse (`quete.fuseauHoraire`), au format AAAA-MM-JJ : le compteur d'étapes repart à minuit chez elle.
function jourLocal(maintenant) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: config.quete.fuseauHoraire,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(maintenant);
}

function avecNom(texte, dragon) {
  return texte.replaceAll("{nom}", dragon.named && dragon.name ? dragon.name : "Ton dragon");
}

function ajouterAuCarnet(carnet, ajouts) {
  const resultat = { ...carnet };
  for (const [rubrique, elements] of Object.entries(ajouts ?? {})) {
    resultat[rubrique] = [...new Set([...(resultat[rubrique] ?? []), ...elements])];
  }
  return resultat;
}

// Arriver dans une scène inscrit dans le carnet ce qu'elle fait découvrir (un lieu, un ami).
function entrer(etat, sceneId) {
  const scene = QUETES[etat.id]?.scenes[sceneId];
  return { ...etat, scene: sceneId, carnet: ajouterAuCarnet(etat.carnet, scene?.carnet) };
}

// État de quête complet, même si la colonne est encore vide : la première quête pas encore
// terminée commence à sa première scène. `null` quand toutes les quêtes sont terminées.
function etatQuete(dragon) {
  const brut = dragon.quete ?? {};
  const terminees = brut.terminees ?? [];
  if (brut.id && QUETES[brut.id]) {
    return { drapeaux: [], carnet: {}, voies: {}, terminees, jour: null, etapesDuJour: 0, ...brut };
  }
  const id = config.quete.ordre.find((quete) => !terminees.some((t) => t.id === quete) && QUETES[quete]);
  if (!id) return null;
  return entrer(
    { id, drapeaux: [], carnet: brut.carnet ?? {}, voies: {}, terminees, jour: null, etapesDuJour: 0 },
    QUETES[id].debut
  );
}

function etapesFaitesAujourdhui(etat, maintenant) {
  return etat.jour === jourLocal(maintenant) ? etat.etapesDuJour : 0;
}

// Traits de caractère de l'archétype : un archétype de base en a un, un hybride deux.
function traits(dragon) {
  const cle = Object.entries(config.personnalite.archetypes).find(([, nom]) => nom === dragon.personality)?.[0];
  return cle ? cle.split("+") : [];
}

function palierTalent(dragon, voie) {
  const lecons = dragon.lecons?.[voie] ?? 0;
  return config.lecons.paliers.filter((seuil) => lecons >= seuil).length;
}

// Choix proposés : ceux d'un trait ou d'un drapeau n'apparaissent que si le dragon les a (son caractère
// et son histoire ne sont pas des manques) ; ceux d'un talent restent visibles, grisés tant qu'il n'a
// pas assez appris. `sansDrapeau` retire un choix déjà tenté (une mauvaise réponse à une énigme ne
// se propose pas deux fois). `index` reste celui du fichier de quête.
function choixVisibles(dragon, etat, scene) {
  const caractere = traits(dragon);
  return scene.choix
    .map((choix, index) => ({ ...choix, index }))
    .filter(({ condition = {} }) => !condition.trait || caractere.includes(condition.trait))
    .filter(({ condition = {} }) => !condition.drapeau || etat.drapeaux.includes(condition.drapeau))
    .filter(({ condition = {} }) => !condition.sansDrapeau || !etat.drapeaux.includes(condition.sansDrapeau))
    .map((choix) => {
      const { talent, palier = 1 } = choix.condition ?? {};
      const possible = !talent || palierTalent(dragon, talent) >= palier;
      return { ...choix, possible, raison: possible ? null : config.quete.messages.talentInsuffisant[talent] };
    });
}

// Pourquoi il ne peut pas repartir maintenant, ou `null`.
function raisonIndisponible(dragon, etat, maintenant) {
  const { messages, etapesParJour } = config.quete;
  if (!etat) return messages.plusDeQuete;
  if (!QUETES[etat.id].scenes[etat.scene]) return messages.suiteBientot;
  if (estEndormi(dragon)) return messages.endormi;
  if (estFatigue(dragon, maintenant)) return messages.fatigue;
  const enManque = caracteristiquesActives(nomEtape(dragon.stage)).some(
    (carac) => carac.affecteCroissance && !estDansBonneZone(carac, dragon[carac.champDb])
  );
  if (enManque) return messages.besoin;
  if (etapesFaitesAujourdhui(etat, maintenant) >= etapesParJour) return messages.assezPourAujourdhui;
  return null;
}

// Ce que voit la page d'aventure. `null` avant l'âge adulte.
export function quetePourClient(dragon, maintenant = new Date()) {
  if (nomEtape(dragon.stage) !== "adulte") return null;
  const etat = etatQuete(dragon);
  const raison = raisonIndisponible(dragon, etat, maintenant);
  const quete = etat && QUETES[etat.id];
  const scene = quete?.scenes[etat.scene];
  return {
    titre: quete?.titre ?? null,
    chapitre: scene ? { numero: scene.chapitre, titre: quete.chapitres[scene.chapitre] } : null,
    scene: scene && {
      lieu: scene.lieu,
      texte: avecNom(scene.texte, dragon),
      choix: choixVisibles(dragon, etat, scene).map(({ index, texte, condition, possible, raison: pourquoi }) => ({
        index,
        texte: avecNom(texte, dragon),
        icone: condition?.talent ? ICONES_TALENTS[condition.talent] : condition?.trait ? "🐉" : condition?.drapeau ? "✨" : null,
        possible,
        raison: pourquoi && avecNom(pourquoi, dragon),
      })),
    },
    disponible: raison == null,
    raison: raison && avecNom(raison, dragon),
    etapesRestantes: etat ? config.quete.etapesParJour - etapesFaitesAujourdhui(etat, maintenant) : 0,
    carnet: etat?.carnet ?? dragon.quete?.carnet ?? {},
  };
}

// Joue le choix `index` de la scène en cours. Renvoie `{ dragon, applique, resultat }`, `resultat`
// étant la phrase qui raconte ce qu'il a fait.
export function jouerChoix(dragon, index, maintenant = new Date()) {
  const refus = { dragon, applique: false, resultat: null };
  if (nomEtape(dragon.stage) !== "adulte") return refus;
  const etat = etatQuete(dragon);
  if (raisonIndisponible(dragon, etat, maintenant)) return refus;

  const scene = QUETES[etat.id].scenes[etat.scene];
  const choix = choixVisibles(dragon, etat, scene).find((c) => c.index === index);
  if (!choix?.possible) return refus;

  const jour = jourLocal(maintenant);
  const talent = choix.condition?.talent;
  const suite = entrer(
    {
      ...etat,
      drapeaux: [...new Set([...etat.drapeaux, ...(choix.drapeaux ?? [])])],
      carnet: ajouterAuCarnet(etat.carnet, choix.carnet),
      // Voies empruntées : la plus suivie donnera son titre à la fin du voyage.
      voies: talent ? { ...etat.voies, [talent]: (etat.voies[talent] ?? 0) + 1 } : etat.voies,
      jour,
      etapesDuJour: etapesFaitesAujourdhui(etat, maintenant) + 1,
    },
    choix.suite
  );

  // L'aventure le fatigue et lui creuse l'appétit (`quete.cout`).
  const resultat = { ...dragon, quete: suite };
  for (const [nom, variation] of Object.entries(config.quete.cout)) {
    const carac = config.caracteristiques[nom];
    resultat[carac.champDb] = clamp(resultat[carac.champDb] + variation, carac.max);
  }
  fatiguer(resultat, "quete", maintenant);
  return { dragon: resultat, applique: true, resultat: avecNom(choix.resultat, dragon) };
}
