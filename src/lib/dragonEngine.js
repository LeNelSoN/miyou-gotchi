import config from "../../config/game.json";

const NOMS_ETAPES = ["oeuf", "bebe", "jeune", "adulte"];
const HEURE_MS = 3600000;

export function nomEtape(stage) {
  return NOMS_ETAPES[stage];
}

export function numeroEtape(nom) {
  return NOMS_ETAPES.indexOf(nom);
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

// `anticipation` : encore en bonne zone, mais sous ce seuil le besoin approche. Le dragon
// l'annonce (humeur « bientôt »), et un soin donné à ce moment prévient le besoin.
// Pour le feu, c'est aussi le signal qu'on peut ajouter du bois sans risquer la surchauffe.
function besoinApproche(carac, valeur) {
  return carac.anticipation != null && estDansBonneZone(carac, valeur) && valeur < carac.anticipation.seuil;
}

export function etatQualitatif(carac, valeur) {
  const [froid, parfait, chaud] = carac.indicateur.etats;
  if (carac.seuilMin != null && valeur < carac.seuilMin) return froid;
  if (carac.seuilMax != null && valeur > carac.seuilMax) return chaud;
  if (besoinApproche(carac, valeur)) return carac.anticipation.humeur;
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

function declencheurAtteint(carac, valeur) {
  const dansBonneZone = estDansBonneZone(carac, valeur);
  return carac.indicateur.declencheur === "bon" ? dansBonneZone : !dansBonneZone;
}

// Indicateurs "persistant" : affichés tant que la condition reste vraie.
function alertesActives(dragon, nomEtapeCourante) {
  return caracteristiquesActives(nomEtapeCourante)
    .filter((carac) => carac.indicateur?.type === "persistant")
    .filter((carac) => declencheurAtteint(carac, dragon[carac.champDb]))
    .map((carac) => carac.indicateur.message);
}

// Humeurs tant que la caractéristique est hors de sa bonne zone (illustrées, et dites dans
// les pensées), puis humeurs « bientôt » quand le besoin approche (dites dans les pensées).
function humeursActives(dragon, nomEtapeCourante) {
  const actives = caracteristiquesActives(nomEtapeCourante);
  const enManque = actives
    .filter((carac) => carac.humeurSiMauvais && !estDansBonneZone(carac, dragon[carac.champDb]))
    .map((carac) => carac.humeurSiMauvais);
  const bientot = actives
    .filter((carac) => besoinApproche(carac, dragon[carac.champDb]))
    .map((carac) => carac.anticipation.humeur);
  return [...enManque, ...bientot];
}

// Avancement de l'étape, réduit à un numéro de palier (0 = tout début) pour ne pas
// exposer la progression brute. `null` si l'étape n'a pas de paliers.
function palierProgression(dragon, nomEtapeCourante) {
  const { dureeHeures, paliers } = config.etapes[nomEtapeCourante] ?? {};
  if (!paliers) return null;
  return Math.min(paliers - 1, Math.floor((dragon.stage_progress / dureeHeures) * paliers));
}

// Indicateurs "ponctuel" : émis uniquement en réponse à une action qui touche
// la caractéristique, puis masqués par le client après `dureeSecondes`.
export function messagesPonctuels(dragon, actionName) {
  return caracteristiquesActives(nomEtape(dragon.stage))
    .filter((carac) => carac.indicateur?.type === "ponctuel" && carac.actions?.[actionName])
    .filter((carac) => declencheurAtteint(carac, dragon[carac.champDb]))
    .map((carac) => ({
      message: carac.indicateur.message,
      dureeSecondes: carac.indicateur.dureeSecondes,
    }));
}

export function estEndormi(dragon) {
  return dragon.sleeping_since != null;
}

function decaler(horodatage, heures) {
  return new Date(new Date(horodatage).getTime() + heures * HEURE_MS);
}

// Rythme veille/sommeil de l'étape, `undefined` aux étapes où le dragon ne dort pas.
function rythme(dragon) {
  return config.dodo.etapes[nomEtape(dragon.stage)];
}

function heureReveilPossible(dragon) {
  return decaler(dragon.sleeping_since, config.dodo.dureeMinHeures);
}

function heureReveilNaturel(dragon) {
  return decaler(dragon.sleeping_since, rythme(dragon).sommeilHeures);
}

function heureFatigue(dragon) {
  return decaler(dragon.awake_since, rythme(dragon).eveilHeures);
}

function heureEndormissement(dragon) {
  return decaler(heureFatigue(dragon), config.dodo.endormissementHeures);
}

function estFatigue(dragon, maintenant) {
  return Boolean(rythme(dragon)) && !estEndormi(dragon) && maintenant >= heureFatigue(dragon);
}

// Réveil naturel au bout de son temps de sommeil, endormissement seul quand il est
// resté fatigué trop longtemps. Les horodatages sont ceux du rythme, pas `instant`,
// pour ne pas dépendre de l'heure à laquelle le joueur revient.
function appliquerRythme(dragon, instant) {
  if (!rythme(dragon)) return;
  if (estEndormi(dragon)) {
    const reveil = heureReveilNaturel(dragon);
    if (instant >= reveil) {
      dragon.sleeping_since = null;
      dragon.awake_since = reveil.toISOString();
    }
  } else {
    const endormissement = heureEndormissement(dragon);
    if (instant >= endormissement) dragon.sleeping_since = endormissement.toISOString();
  }
}

// `null` aux étapes où le dragon ne peut pas dormir.
function etatDodo(dragon, maintenant) {
  if (!rythme(dragon)) return null;
  const endormi = estEndormi(dragon);
  return {
    endormi,
    fatigue: estFatigue(dragon, maintenant),
    messageFatigue: config.dodo.fatigue.message,
    dureeMinHeures: config.dodo.dureeMinHeures,
    sommeilHeures: rythme(dragon).sommeilHeures,
    reveilA: endormi ? heureReveilNaturel(dragon).toISOString() : null,
  };
}

// Renvoie le dragon endormi, ou `null` s'il ne peut pas être couché (pas encore fatigué).
export function coucher(dragon, maintenant = new Date()) {
  if (!estFatigue(dragon, maintenant)) return null;
  return { ...dragon, sleeping_since: maintenant.toISOString() };
}

// Message ponctuel affiché quand un réveil est refusé parce qu'il dort depuis trop peu de temps.
export function messagesRefusReveil(dragon) {
  return estEndormi(dragon) ? [config.dodo.refusReveil] : [];
}

// Renvoie le dragon réveillé, ou `null` s'il ne dort pas ou pas depuis assez longtemps.
export function reveiller(dragon, maintenant = new Date()) {
  if (!estEndormi(dragon) || maintenant < heureReveilPossible(dragon)) return null;
  return { ...dragon, sleeping_since: null, awake_since: maintenant.toISOString() };
}

// Un dragon endormi ne peut rien faire : toutes ses actions sont bloquées.
function estActionBloquee(dragon, actives, actionName) {
  if (estEndormi(dragon)) return true;
  return actives.some((carac) => {
    const condition = carac.bloque?.[actionName];
    if (!condition) return false;
    const valeur = dragon[carac.champDb];
    if (condition === "siMauvais") return !estDansBonneZone(carac, valeur);
    if (condition === "siVide") return valeur <= 0;
    return false;
  });
}

function actionsDisponibles(dragon, nomEtapeCourante) {
  const actives = caracteristiquesActives(nomEtapeCourante);
  const noms = new Set(actives.flatMap((carac) => Object.keys(carac.actions ?? {})));
  return [...noms].map((nom) => ({ nom, bloquee: estActionBloquee(dragon, actives, nom) }));
}

export function dragonPourClient(dragon, maintenant = new Date()) {
  const etapeCourante = nomEtape(dragon.stage);
  return {
    stage: dragon.stage,
    etape: etapeCourante,
    named: dragon.named,
    name: dragon.name,
    // Archétype figé au passage à Adulte (`null` avant) : il donne sa voix aux pensées
    // et s'affiche sur la carte d'identité.
    archetype: dragon.personality ?? null,
    descriptionArchetype: config.personnalite.descriptions[dragon.personality] ?? null,
    indicateurs: indicateursActifs(dragon, etapeCourante),
    alertes: alertesActives(dragon, etapeCourante),
    humeurs: humeursActives(dragon, etapeCourante),
    palier: palierProgression(dragon, etapeCourante),
    dodo: etatDodo(dragon, maintenant),
    actions: actionsDisponibles(dragon, etapeCourante),
    nomLongueurMax: config.nom.longueurMax,
  };
}

// Le dragon se nomme une seule fois, après l'éclosion. Renvoie le nom nettoyé,
// ou `null` s'il est refusé.
export function validerNom(dragon, nom) {
  if (dragon.named || nomEtape(dragon.stage) === "oeuf") return null;
  if (typeof nom !== "string") return null;
  const nomNettoye = nom.trim();
  if (nomNettoye.length === 0 || nomNettoye.length > config.nom.longueurMax) return null;
  return nomNettoye;
}

function clamp(valeur, max) {
  return Math.min(max, Math.max(0, valeur));
}

function appliquerDecroissanceHoraire(dragon, nomEtapeCourante) {
  for (const carac of caracteristiquesActives(nomEtapeCourante)) {
    if (!carac.variationParHeure) continue;
    let variation = carac.variationParHeure;
    // Le sommeil ralentit les pertes et accélère les gains (régénération de l'énergie).
    if (estEndormi(dragon)) {
      variation *= variation < 0 ? config.dodo.multiplicateurPerte : config.dodo.multiplicateurGain;
    }
    dragon[carac.champDb] = clamp(dragon[carac.champDb] + variation, carac.max);
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
    if (nomEtape(dragon.stage) === "adulte") figerPersonnalite(dragon);
  }
}

// Les traits de personnalité sont ceux listés dans `personnalite.ordrePriorite`
// (l'énergie n'en fait pas partie). Pendant les étapes `personnalite.suivi.etapes`,
// chaque fois qu'un trait sort de sa bonne zone, un besoin s'ouvre ; il se ferme quand
// la jauge y revient, avec une note de rapidité. `besoins` garde, par trait :
// `{ notes, nombre, ouvert }`, `ouvert` comptant les heures éveillé depuis l'ouverture.
function traitsSuivis(dragon) {
  const etape = nomEtape(dragon.stage);
  if (!config.personnalite.suivi.etapes.includes(etape)) return [];
  return config.personnalite.ordrePriorite.filter((trait) =>
    config.caracteristiques[trait].etapesActives.includes(etape)
  );
}

// 100 si le besoin est comblé dans le délai parfait, puis moitié moins à chaque demi-vie.
function noteReponse(heures) {
  const { delaiParfaitHeures, demiVieHeures } = config.personnalite.suivi;
  return 100 * 0.5 ** (Math.max(0, heures - delaiParfaitHeures) / demiVieHeures);
}

// `heureEcoulee` : appel du tick horaire (le temps d'attente avance), et non d'une action.
// Les heures de sommeil ne comptent pas : la joueuse ne peut rien faire pendant ce temps.
function suivreBesoins(dragon, heureEcoulee) {
  const traits = traitsSuivis(dragon);
  if (traits.length === 0) return;
  const besoins = { ...dragon.besoins };
  for (const trait of traits) {
    const carac = config.caracteristiques[trait];
    const suivi = { notes: 0, nombre: 0, ouvert: null, ...besoins[trait] };
    if (suivi.ouvert != null && heureEcoulee && !estEndormi(dragon)) suivi.ouvert += 1;
    const enManque = !estDansBonneZone(carac, dragon[carac.champDb]);
    if (enManque && suivi.ouvert == null) suivi.ouvert = 0;
    if (!enManque && suivi.ouvert != null) {
      suivi.notes += noteReponse(suivi.ouvert);
      suivi.nombre += 1;
      suivi.ouvert = null;
    }
    besoins[trait] = suivi;
  }
  dragon.besoins = besoins;
}

// Un soin qui fait monter un trait dont le besoin approche (`anticipation`) prévient ce
// besoin : il compte comme un besoin comblé avec `notePrevention`. Un soin donné jauge
// déjà haute (ou répété) ne compte pas.
function suivrePreventions(dragon, actionName) {
  const { notePrevention } = config.personnalite.suivi;
  const besoins = { ...dragon.besoins };
  for (const trait of traitsSuivis(dragon)) {
    const carac = config.caracteristiques[trait];
    if (!(carac.actions?.[actionName]?.effet > 0)) continue;
    if (!besoinApproche(carac, dragon[carac.champDb])) continue;
    const suivi = { notes: 0, nombre: 0, ouvert: null, ...besoins[trait] };
    besoins[trait] = { ...suivi, notes: suivi.notes + notePrevention, nombre: suivi.nombre + 1 };
  }
  dragon.besoins = besoins;
}

// Score de 0 à 100 par trait : moyenne des notes (besoins comblés et besoins prévenus), besoin encore ouvert compris, tirée
// vers `noteNeutre` quand il y a eu peu de besoins (un trait jamais en manque ne gagne pas).
export function scoresBesoins(dragon) {
  const { noteNeutre, poidsNeutre } = config.personnalite.suivi;
  const scores = {};
  for (const trait of config.personnalite.ordrePriorite) {
    const { notes = 0, nombre = 0, ouvert = null } = dragon.besoins?.[trait] ?? {};
    const total = notes + (ouvert != null ? noteReponse(ouvert) : 0) + noteNeutre * poidsNeutre;
    const compte = nombre + (ouvert != null ? 1 : 0) + poidsNeutre;
    scores[trait] = Math.round((total / compte) * 10) / 10;
  }
  return scores;
}

// Un meilleur score → archétype de base ; deux à moins de `margeEgalite` → hybride ;
// trois ou plus → deux tirés au hasard parmi eux. Les clés d'hybrides suivent
// l'ordre de `ordrePriorite`, jointes par "+".
export function determinerArchetype(scores, aleatoire = Math.random) {
  const { margeEgalite, ordrePriorite, archetypes } = config.personnalite;
  const maximum = Math.max(...ordrePriorite.map((trait) => scores[trait]));
  const retenus = ordrePriorite.filter((trait) => maximum - scores[trait] <= margeEgalite);
  while (retenus.length > 2) retenus.splice(Math.floor(aleatoire() * retenus.length), 1);
  return archetypes[retenus.join("+")];
}

function figerPersonnalite(dragon) {
  const scores = scoresBesoins(dragon);
  dragon.adult_stats = scores;
  dragon.personality = determinerArchetype(scores);
}

// Simule heure par heure (et non en un seul calcul) car les caractéristiques actives
// changent selon l'étape : un passage d'étape en cours d'intervalle doit faire basculer
// la décroissance/progression sur les nouvelles caractéristiques dès l'heure suivante.
export function avancerDragon(dragon, maintenant = new Date()) {
  const dernierPassage = new Date(dragon.last_seen);
  const heuresEcoulees = Math.max(0, Math.floor((maintenant.getTime() - dernierPassage.getTime()) / HEURE_MS));

  const resultat = { ...dragon };

  for (let i = 0; i < heuresEcoulees; i++) {
    appliquerRythme(resultat, decaler(dernierPassage, i));
    const etapeCourante = nomEtape(resultat.stage);
    appliquerDecroissanceHoraire(resultat, etapeCourante);
    suivreBesoins(resultat, true);

    const dureeEtape = config.etapes[etapeCourante]?.dureeHeures;
    if (dureeEtape != null) {
      avancerProgressionEtape(resultat, etapeCourante);
      tenterPassageEtapeSuivante(resultat, etapeCourante);
      // L'éclosion ouvre le premier cycle de veille.
      if (!config.dodo.etapes[etapeCourante] && rythme(resultat)) {
        resultat.awake_since = decaler(dernierPassage, i + 1).toISOString();
      }
    }
  }

  // Le réveil ou l'endormissement survenu depuis la dernière heure pleine est visible tout de suite.
  appliquerRythme(resultat, maintenant);

  // Les minutes restantes (heures fractionnaires) sont conservées pour le prochain appel.
  resultat.last_seen = decaler(dernierPassage, heuresEcoulees).toISOString();
  return resultat;
}

export function appliquerAction(dragon, actionName) {
  const etapeCourante = nomEtape(dragon.stage);
  const actives = caracteristiquesActives(etapeCourante);

  const estBloquee = estActionBloquee(dragon, actives, actionName);

  const concernees = actives.filter((carac) => carac.actions?.[actionName]);

  if (estBloquee || concernees.length === 0) {
    return { dragon, applique: false };
  }

  const resultat = { ...dragon };
  suivrePreventions(resultat, actionName);
  for (const carac of concernees) {
    let effet = carac.actions[actionName].effet;
    const multiplicateur = carac.multiplicateurActionSiMauvais?.[actionName];
    if (multiplicateur != null && !estDansBonneZone(carac, resultat[carac.champDb])) {
      effet *= multiplicateur;
    }
    resultat[carac.champDb] = clamp(resultat[carac.champDb] + effet, carac.max);
  }
  // Un soin peut combler un besoin (ou en créer un : trop de bois, une leçon qui attriste).
  suivreBesoins(resultat, false);

  return { dragon: resultat, applique: true };
}
