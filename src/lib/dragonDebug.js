import { readFile, writeFile } from "fs/promises";
import path from "path";
import config from "../../config/game.json";
import { nomEtape } from "./dragonEngine";
import { recupererDragonSynchronise, sauvegarderDragon } from "./dragonRepository";

const HEURE_MS = 3600000;
const CHEMIN_CONFIG = path.join(process.cwd(), "config", "game.json");

// Activé uniquement par variable d'environnement serveur : jamais en production.
export function modeDebugActif() {
  return process.env.DEBUG_MODE === "true";
}

// Seul endroit où les valeurs brutes des jauges sortent du serveur.
export function infosDebug(dragon) {
  const valeurs = {};
  for (const [nom, carac] of Object.entries(config.caracteristiques)) {
    valeurs[nom] = {
      valeur: dragon[carac.champDb],
      active: carac.etapesActives.includes(nomEtape(dragon.stage)),
    };
  }
  return {
    valeurs,
    progression: dragon.stage_progress,
    dureeEtape: config.etapes[nomEtape(dragon.stage)]?.dureeHeures ?? null,
    adultStats: dragon.adult_stats,
    personality: dragon.personality,
    config: calibrationPossible() ? config : null,
  };
}

// La calibration réécrit `config/game.json` : possible seulement avec `next dev`
// (fichier modifiable et rechargé à chaud), jamais sur un build déployé.
export function calibrationPossible() {
  return process.env.NODE_ENV === "development";
}

// Ne modifie qu'une constante numérique déjà présente dans la config.
function definirConstante(racine, chemin, valeur) {
  let noeud = racine;
  for (const cle of chemin.slice(0, -1)) {
    if (noeud === null || typeof noeud !== "object" || !Object.hasOwn(noeud, cle)) return false;
    noeud = noeud[cle];
  }
  const derniere = chemin.at(-1);
  if (noeud === null || typeof noeud !== "object" || !Object.hasOwn(noeud, derniere)) return false;
  if (typeof noeud[derniere] !== "number") return false;
  noeud[derniere] = valeur;
  return true;
}

export async function calibrerConfig(chemin, valeur) {
  if (!Array.isArray(chemin) || !Number.isFinite(valeur)) return false;
  const configDisque = JSON.parse(await readFile(CHEMIN_CONFIG, "utf8"));
  if (!definirConstante(configDisque, chemin, valeur)) return false;
  await writeFile(CHEMIN_CONFIG, JSON.stringify(configDisque, null, 2) + "\n");
  // Met aussi à jour la config en mémoire, sans attendre le rechargement à chaud.
  definirConstante(config, chemin, valeur);
  return true;
}

// Recule `last_seen` puis laisse le moteur rejouer les heures, pour passer
// exactement par le même code que le temps réel.
export async function avancerTemps(heures) {
  const dragon = await recupererDragonSynchronise();
  const lastSeen = new Date(new Date(dragon.last_seen).getTime() - heures * HEURE_MS).toISOString();
  await sauvegarderDragon({ ...dragon, last_seen: lastSeen });
  return recupererDragonSynchronise();
}

// Amène la progression au seuil : le passage d'étape se fait à l'heure suivante.
export async function finirEtape() {
  const dragon = await recupererDragonSynchronise();
  const duree = config.etapes[nomEtape(dragon.stage)]?.dureeHeures;
  if (duree == null) return dragon;
  await sauvegarderDragon({ ...dragon, stage_progress: duree });
  return avancerTemps(1);
}

export async function ajusterCaracteristique(nom, delta) {
  const dragon = await recupererDragonSynchronise();
  const carac = config.caracteristiques[nom];
  if (!carac) return dragon;
  const valeur = Math.min(carac.max, Math.max(0, dragon[carac.champDb] + delta));
  const resultat = { ...dragon, [carac.champDb]: valeur };
  await sauvegarderDragon(resultat);
  return resultat;
}
