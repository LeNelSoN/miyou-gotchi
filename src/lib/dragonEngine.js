import config from "../../config/game.json";

const NOMS_ETAPES = ["oeuf", "bebe", "jeune", "adulte"];
const HEURE_MS = 3600000;

export function nomEtape(stage) {
  return NOMS_ETAPES[stage];
}

function caracteristiquesActives(nomEtapeCourante) {
  return Object.values(config.caracteristiques).filter((carac) =>
    carac.etapesActives.includes(nomEtapeCourante)
  );
}

export function estDansBonneZone(carac, valeur) {
  if (carac.seuilMin != null && carac.seuilMax != null) {
    return valeur >= carac.seuilMin && valeur <= carac.seuilMax;
  }
  if (carac.seuilMin != null) return valeur >= carac.seuilMin;
  if (carac.seuilMax != null) return valeur <= carac.seuilMax;
  return true;
}

export function etatQualitatif(carac, valeur) {
  const [froid, parfait, chaud] = carac.indicateur.etats;
  if (carac.seuilMin != null && valeur < carac.seuilMin) return froid;
  if (carac.seuilMax != null && valeur > carac.seuilMax) return chaud;
  return parfait;
}

// Ne renvoie jamais les valeurs brutes des jauges au client, seulement
// l'état qualitatif calculé (cohérent avec la section 4 de la spec).
function indicateursActifs(dragon, nomEtapeCourante) {
  const indicateurs = {};
  for (const [nom, carac] of Object.entries(config.caracteristiques)) {
    if (!carac.etapesActives.includes(nomEtapeCourante)) continue;
    if (carac.indicateur?.type === "qualitatifPermanent") {
      indicateurs[nom] = etatQualitatif(carac, dragon[carac.champDb]);
    }
  }
  return indicateurs;
}

export function dragonPourClient(dragon) {
  const etapeCourante = nomEtape(dragon.stage);
  return {
    stage: dragon.stage,
    etape: etapeCourante,
    named: dragon.named,
    name: dragon.name,
    indicateurs: indicateursActifs(dragon, etapeCourante),
  };
}

function clamp(valeur, max) {
  return Math.min(max, Math.max(0, valeur));
}

function appliquerDecroissanceHoraire(dragon, nomEtapeCourante) {
  for (const carac of caracteristiquesActives(nomEtapeCourante)) {
    if (!carac.variationParHeure) continue;
    dragon[carac.champDb] = clamp(dragon[carac.champDb] + carac.variationParHeure, carac.max);
  }
}

function avancerProgressionEtape(dragon, nomEtapeCourante) {
  const concernees = caracteristiquesActives(nomEtapeCourante).filter(
    (carac) => carac.affecteCroissance
  );
  const toutesBonnes = concernees.every((carac) => estDansBonneZone(carac, dragon[carac.champDb]));
  dragon.stage_progress += toutesBonnes ? 1 : config.multiplicateurRalentissement;
}

function tenterPassageEtapeSuivante(dragon, nomEtapeCourante) {
  const duree = config.etapes[nomEtapeCourante]?.dureeHeures;
  if (duree == null) return;
  if (dragon.stage_progress >= duree) {
    dragon.stage += 1;
    dragon.stage_progress = 0;
  }
}

// Simule heure par heure (et non en un seul calcul) car les caractéristiques actives
// changent selon l'étape : un passage d'étape en cours d'intervalle doit faire basculer
// la décroissance/progression sur les nouvelles caractéristiques dès l'heure suivante.
export function avancerDragon(dragon, maintenant = new Date()) {
  const dernierPassage = new Date(dragon.last_seen);
  const heuresEcoulees = Math.floor((maintenant.getTime() - dernierPassage.getTime()) / HEURE_MS);

  if (heuresEcoulees <= 0) return dragon;

  const resultat = { ...dragon };

  for (let i = 0; i < heuresEcoulees; i++) {
    const etapeCourante = nomEtape(resultat.stage);
    appliquerDecroissanceHoraire(resultat, etapeCourante);

    const dureeEtape = config.etapes[etapeCourante]?.dureeHeures;
    if (dureeEtape != null) {
      avancerProgressionEtape(resultat, etapeCourante);
      tenterPassageEtapeSuivante(resultat, etapeCourante);
    }
  }

  // Les minutes restantes (heures fractionnaires) sont conservées pour le prochain appel.
  resultat.last_seen = new Date(dernierPassage.getTime() + heuresEcoulees * HEURE_MS).toISOString();
  return resultat;
}

export function appliquerAction(dragon, actionName) {
  const etapeCourante = nomEtape(dragon.stage);
  const actives = caracteristiquesActives(etapeCourante);

  const estBloquee = actives.some((carac) => {
    const condition = carac.bloque?.[actionName];
    if (!condition) return false;
    const valeur = dragon[carac.champDb];
    if (condition === "siMauvais") return !estDansBonneZone(carac, valeur);
    if (condition === "siVide") return valeur <= 0;
    return false;
  });

  const concernees = actives.filter((carac) => carac.actions?.[actionName]);

  if (estBloquee || concernees.length === 0) {
    return { dragon, applique: false };
  }

  const resultat = { ...dragon };
  for (const carac of concernees) {
    let effet = carac.actions[actionName].effet;
    const multiplicateur = carac.multiplicateurActionSiMauvais?.[actionName];
    if (multiplicateur != null && !estDansBonneZone(carac, resultat[carac.champDb])) {
      effet *= multiplicateur;
    }
    resultat[carac.champDb] = clamp(resultat[carac.champDb] + effet, carac.max);
  }

  return { dragon: resultat, applique: true };
}
