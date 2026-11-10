// Simule le rythme de sommeil du Bébé à l'Adulte, avec une enfant qui couche le dragon le soir ou qui
// n'y touche jamais. Mesure les visites où il dort, son heure de lever, les levers grognons et le passage à l'Adulte.
// Compare sans et avec le lever au plus tard (`dodo.reveilAuPlusTard`).
// Usage : pnpm simuler-dodo [vies par cas]
import config from "../../config/game.json";
import { ECLOSION, HEURE, bebe, hasardReproductible, instantVisite, moyenne, visites } from "../commun.mjs";
import { appliquerAction, appliquerLecon, avancerDragon, coucher, nomEtape } from "../../src/lib/dragonEngine.js";

const VIES = Number(process.argv[2] ?? 200);
const JOURS_MESURES = 60; // l'Adulte est mesuré aussi, jusqu'à ce jour

let hasard;


// Heure locale (Maroc, UTC+1) d'un instant, en heures décimales.
const heureLocale = (t) => (((t.getTime() / HEURE + 1) % 24) + 24) % 24;

function vie(utiliseDodo) {
  let d = bebe();
  const stats = { adulte: null, visites: 0, endormi: 0, endormiSoir: 0, visitesSoir: 0, levers: [], grognons: 0 };
  let dormait = false;
  for (let jour = 0; jour < JOURS_MESURES; jour++) {
    for (const heure of visites(jour)) {
      const t = instantVisite(jour, heure, hasard);
      d = avancerDragon(d, t);
      // Heure de lever : le réveil survenu depuis la dernière visite.
      if (dormait && !d.sleeping_since) {
        stats.levers.push(heureLocale(new Date(d.awake_since)));
        if (d.grognon) stats.grognons++;
      }
      stats.visites++;
      if (heure >= 17) stats.visitesSoir++;
      if (d.sleeping_since) {
        stats.endormi++;
        if (heure >= 17) stats.endormiSoir++;
        dormait = true;
        continue;
      }
      dormait = false;
      const agir = (action) => {
        const r = appliquerAction(d, action, t);
        if (r.applique) d = r.dragon;
      };
      for (let i = 0; i < 2 && d.fire < 60; i++) agir("ajouterBois");
      for (let i = 0; i < 3 && d.hunger < config.caracteristiques.nourriture.anticipation.seuil; i++) agir("nourrir");
      agir("laver");
      const etape = nomEtape(d.stage);
      if (etape !== "bebe" && d.joy < 70) agir("jouer");
      if (etape === "jeune") {
        for (let i = 0; i < 2; i++) {
          const r = appliquerLecon(d, config.lecons.types[Math.floor(hasard() * 3)], t);
          if (!r.applique) break;
          d = r.dragon;
        }
      }
      if (utiliseDodo && heure >= 20) {
        const couche = coucher(d, t);
        if (couche) {
          d = couche;
          dormait = true;
        }
      }
      if (d.stage >= 3 && stats.adulte == null) stats.adulte = (t - ECLOSION) / (24 * HEURE);
    }
  }
  return stats;
}

console.log(`${VIES} vies par cas, ${JOURS_MESURES} jours · visites vers 7 h 30, 17 h et 20 h (5 les jours libres), à ± 45 min\n`);
console.log("cas                                             Adulte  visites où il dort  dont le soir (17h, 20h)  levés 6h-10h  levers grognons");
const { reveilAuPlusTard: PLAFOND, grognon: GROGNON } = config.dodo;
const CAS = [
  [null, 0, true],
  [null, 0, false],
  [PLAFOND, 0, true],
  [PLAFOND, 0, false],
  [PLAFOND, GROGNON.fatigueHeures, true],
  [PLAFOND, GROGNON.fatigueHeures, false],
];
for (const [plafond, fatigueGrognon, utiliseDodo] of CAS) {
  config.dodo.reveilAuPlusTard = plafond;
  config.dodo.grognon = { ...GROGNON, fatigueHeures: fatigueGrognon };
  hasard = hasardReproductible(7);
  const vies = Array.from({ length: VIES }, () => vie(utiliseDodo));
  const pct = (a, b) => `${((100 * moyenne(vies.map((v) => v[a] / v[b])))).toFixed(0)} %`;
  const levers = vies.flatMap((v) => v.levers);
  console.log(
    [
      plafond == null ? "sans plafond" : `levé à ${plafond}h max`,
      fatigueGrognon ? `grognon −${fatigueGrognon}h` : "grognon sans effet",
      utiliseDodo ? "couche" : "sans Dodo",
    ].join(" · ").padEnd(47),
    `j${moyenne(vies.map((v) => v.adulte ?? 99)).toFixed(1)}`.padStart(7),
    pct("endormi", "visites").padStart(19),
    pct("endormiSoir", "visitesSoir").padStart(24),
    `${((100 * levers.filter((h) => h >= 6 && h <= 10).length) / levers.length).toFixed(0)} %`.padStart(13),
    `${((100 * moyenne(vies.map((v) => v.grognons / v.levers.length)))).toFixed(0)} %`.padStart(16)
  );
}
