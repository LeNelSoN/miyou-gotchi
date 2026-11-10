// Simule la vie du dragon, du Bébé à l'Adulte, avec une enfant qui passe le matin, après l'école et le
// soir (plus souvent le mercredi et le week-end). Compare des façons de nourrir, avec et sans le
// « ventre trop plein » (`caracteristiques.nourriture.exces`).
// Usage : pnpm simuler-vie [vies par cas]
import config from "../../config/game.json";
import { ECLOSION, HEURE, bebe, hasardReproductible, instantVisite, moyenne, visites } from "../commun.mjs";
import { appliquerAction, appliquerLecon, avancerDragon, coucher, estFatigue, nomEtape } from "../../src/lib/dragonEngine.js";

const VIES = Number(process.argv[2] ?? 200);
const EXCES = config.caracteristiques.nourriture.exces;

const hasard = hasardReproductible(7);


// Façons de nourrir : à chaque visite jusqu'à remplir, ou seulement quand il a un petit creux.
const NOURRIR = {
  remplit: (d) => d.hunger < 100,
  attentive: (d) => d.hunger < config.caracteristiques.nourriture.anticipation.seuil,
};

function vie(facon) {
  let d = bebe();
  const stats = { jeune: null, adulte: null, exces: 0, repas: 0, heuresFatigue: 0, lecons: 0 };
  for (let jour = 0; jour < 80 && d.stage < 3; jour++) {
    for (const heure of visites(jour)) {
      // Elle ne passe jamais tout à fait à la même heure (± 45 min).
      const t = instantVisite(jour, heure, hasard);
      d = avancerDragon(d, t);
      if (d.sleeping_since) continue;
      if (estFatigue(d, t)) stats.heuresFatigue++;
      const agir = (action) => {
        const r = appliquerAction(d, action, t);
        if (r.applique) d = r.dragon;
        return r;
      };
      for (let i = 0; i < 2 && d.fire < 60; i++) agir("ajouterBois");
      for (let i = 0; i < 3 && NOURRIR[facon](d); i++) {
        const r = agir("nourrir");
        if (!r.applique) break;
        stats.repas++;
        if (r.exces?.length) stats.exces++;
      }
      agir("laver");
      const etape = nomEtape(d.stage);
      if (etape !== "bebe" && d.joy < 70) agir("jouer");
      if (etape === "jeune") {
        for (let i = 0; i < 2; i++) {
          const r = appliquerLecon(d, config.lecons.types[Math.floor(hasard() * 3)], t);
          if (!r.applique) break;
          d = r.dragon;
          stats.lecons++;
        }
      }
      if (heure >= 20) d = coucher(d, t) ?? d;
      const jours = (t - ECLOSION) / (24 * HEURE);
      if (d.stage >= 2 && stats.jeune == null) stats.jeune = jours;
      if (d.stage >= 3 && stats.adulte == null) stats.adulte = jours;
    }
  }
  return stats;
}

console.log(`${VIES} vies par cas · visites vers 7 h 30, 17 h et 20 h (5 visites les jours libres), à ± 45 min\n`);
console.log("cas                          Jeune   Adulte  repas  trop pleins  visites fatigué  leçons");
for (const avecExces of [false, true]) {
  if (avecExces) config.caracteristiques.nourriture.exces = EXCES;
  else delete config.caracteristiques.nourriture.exces;
  for (const facon of Object.keys(NOURRIR)) {
    const vies = Array.from({ length: VIES }, () => vie(facon));
    const m = (cle) => moyenne(vies.map((v) => v[cle] ?? 99));
    console.log(
      `${(avecExces ? "trop plein · " : "sans règle · ") + facon}`.padEnd(29),
      `j${m("jeune").toFixed(1)}`.padStart(6),
      `j${m("adulte").toFixed(1)}`.padStart(7),
      m("repas").toFixed(0).padStart(6),
      m("exces").toFixed(0).padStart(12),
      m("heuresFatigue").toFixed(1).padStart(16),
      m("lecons").toFixed(0).padStart(7)
    );
  }
}
