// Simule des milliers de parties de la quête de l'Adulte et mesure l'expérience de jeu.
// Usage : node --import ./scripts/quete/register.mjs scripts/quete/simuler.mjs [parties] [graine]
import config from "../../config/game.json";
import voyage from "../../config/quetes/voyage-initiatique.json";
import { jouerChoix, quetePourClient } from "../../src/lib/quete.js";

const PARTIES = Number(process.argv[2] ?? 10000);
let graine = Number(process.argv[3] ?? 42);
// Hasard reproductible (mulberry32) : deux lancers donnent les mêmes chiffres.
function hasard() {
  graine = (graine + 0x6d2b79f5) | 0;
  let t = Math.imul(graine ^ (graine >>> 15), 1 | graine);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const auHasard = (liste) => liste[Math.floor(hasard() * liste.length)];

const ARCHETYPES = Object.values(config.personnalite.archetypes);
const VOIES = config.lecons.types;

// Un Adulte plausible : 30 leçons réparties selon les goûts de la joueuse (souvent une voie préférée).
function dragonAuHasard(maintenant) {
  const poids = VOIES.map(() => hasard() ** 2);
  const total = poids.reduce((a, b) => a + b, 0);
  const lecons = Object.fromEntries(VOIES.map((voie, i) => [voie, Math.round((poids[i] / total) * 30)]));
  return {
    stage: 3, named: true, name: "Coco", personality: auHasard(ARCHETYPES), lecons,
    fire: 60, hunger: 100, clean: 100, joy: 90, learning: 60,
    sleeping_since: null, awake_since: maintenant.toISOString(), quete: {},
  };
}

// Façons de jouer : au hasard, attirée par les icônes (talent, caractère, souvenir), ou toujours le premier choix.
const JOUEUSES = {
  hasard: (choix) => auHasard(choix),
  icones: (choix) => auHasard(choix.filter((c) => c.icone).length ? choix.filter((c) => c.icone) : choix),
  premier: (choix) => choix[0],
};

const stats = {
  fins: 0, bloquees: [], jours: [], etapes: [], etapesParChapitre: {},
  vus: new Map(), // "scène#index" → nombre de fois affiché
  joues: new Map(),
  grises: 0, affiches: 0, scenesUnSeulChoix: new Map(), choixParScene: [],
  titres: {}, titreFidele: 0, egalites: 0, voiesNulles: 0, enigmesRatees: [], besoinsParJour: [],
  drapeauxOuverts: new Map(), // drapeau → parties où son choix est apparu
};
const incr = (map, cle, n = 1) => map.set(cle, (map.get(cle) ?? 0) + n);

for (let partie = 0; partie < PARTIES; partie++) {
  let maintenant = new Date("2026-11-09T16:00:00Z");
  let d = dragonAuHasard(maintenant);
  const joueuse = Object.values(JOUEUSES)[partie % 3];
  let jours = 1, etapes = 0, besoins = 0, enigmes = 0;
  const drapeauxVus = new Set();

  for (let garde = 0; garde < 2000; garde++) {
    const q = quetePourClient(d, maintenant);
    if (!q.disponible) {
      if (q.raison === config.quete.messages.suiteBientot) {
        stats.fins++;
        break;
      }
      if (q.raison.includes("beaucoup marché") || q.raison.includes("sommeil") || q.raison.includes("dort")) {
        // Elle revient le lendemain après l'école ; le dragon a mangé, dormi, été lavé.
        stats.besoinsParJour.push(besoins);
        besoins = 0;
        jours++;
        maintenant = new Date(maintenant.getTime() + 24 * 3600e3);
        d = { ...d, fire: 60, hunger: 100, clean: 100, joy: 90, sleeping_since: null, awake_since: maintenant.toISOString() };
      } else {
        // Un besoin en manque : elle s'en occupe avant de repartir.
        besoins++;
        d = { ...d, fire: 60, hunger: 100, clean: 100, joy: 90 };
      }
      continue;
    }
    const sceneId = d.quete?.scene ?? voyage.debut;
    const possibles = q.scene.choix.filter((c) => c.possible);
    stats.affiches += q.scene.choix.length;
    stats.grises += q.scene.choix.length - possibles.length;
    stats.choixParScene.push(possibles.length);
    if (possibles.length === 1 && voyage.scenes[sceneId].choix.length > 1) incr(stats.scenesUnSeulChoix, sceneId);
    for (const c of q.scene.choix) {
      incr(stats.vus, `${sceneId}#${c.index}`);
      const drapeau = voyage.scenes[sceneId].choix[c.index].condition?.drapeau;
      if (drapeau) drapeauxVus.add(drapeau);
    }
    if (possibles.length === 0) {
      stats.bloquees.push(sceneId);
      break;
    }
    const choix = joueuse(possibles);
    incr(stats.joues, `${sceneId}#${choix.index}`);
    if (voyage.scenes[sceneId].choix[choix.index].suite === sceneId) enigmes++;
    const chapitre = voyage.scenes[sceneId].chapitre;
    stats.etapesParChapitre[chapitre] ??= [];
    const r = jouerChoix(d, choix.index, maintenant);
    if (!r.applique) {
      stats.bloquees.push(`${sceneId} (refus)`);
      break;
    }
    d = r.dragon;
    etapes++;
    stats.etapesParChapitre[chapitre].push(1);
  }
  stats.jours.push(jours);
  stats.etapes.push(etapes);
  stats.enigmesRatees.push(enigmes);
  for (const drapeau of drapeauxVus) incr(stats.drapeauxOuverts, drapeau);

  // Titre de fin (phase 7d) : la voie la plus empruntée.
  const voies = d.quete.voies ?? {};
  const max = Math.max(0, ...VOIES.map((v) => voies[v] ?? 0));
  const meilleures = VOIES.filter((v) => (voies[v] ?? 0) === max);
  if (max === 0) stats.voiesNulles++;
  else if (meilleures.length > 1) stats.egalites++;
  else stats.titres[meilleures[0]] = (stats.titres[meilleures[0]] ?? 0) + 1;
  // Le titre ressemble-t-il à son enfance ? (voie où il a pris le plus de leçons)
  const prefere = VOIES.reduce((a, b) => (d.lecons[b] > d.lecons[a] ? b : a));
  if (meilleures.length === 1 && meilleures[0] === prefere) stats.titreFidele++;
}

// ───────── Rapport
const moyenne = (l) => l.reduce((a, b) => a + b, 0) / l.length;
const centile = (l, p) => [...l].sort((a, b) => a - b)[Math.floor((l.length - 1) * p)];
const pct = (n) => `${((100 * n) / PARTIES).toFixed(1)} %`;

console.log(`\n${PARTIES} parties simulées`);
console.log(`Arrivées au bout : ${pct(stats.fins)} · bloquées : ${stats.bloquees.length}`, stats.bloquees.slice(0, 5));
console.log(`Étapes jouées : moyenne ${moyenne(stats.etapes).toFixed(1)}, min ${Math.min(...stats.etapes)}, max ${Math.max(...stats.etapes)}`);
console.log(`Jours de jeu : moyenne ${moyenne(stats.jours).toFixed(1)}, médiane ${centile(stats.jours, 0.5)}, 90e centile ${centile(stats.jours, 0.9)}`);
console.log(`Étapes par chapitre (moyenne) :`, Object.fromEntries(Object.entries(stats.etapesParChapitre).map(([c, l]) => [c, +(l.length / PARTIES).toFixed(1)])));
console.log(`Interruptions « besoin » par jour : ${moyenne(stats.besoinsParJour).toFixed(2)}`);
console.log(`Énigmes ratées par partie (joueuse au hasard incluse) : ${moyenne(stats.enigmesRatees).toFixed(1)}`);
console.log(`Choix grisés : ${((100 * stats.grises) / stats.affiches).toFixed(1)} % des choix affichés`);
console.log(`Choix possibles par étape : moyenne ${moyenne(stats.choixParScene).toFixed(2)}, étapes à un seul choix : ${((100 * stats.choixParScene.filter((n) => n === 1).length) / stats.choixParScene.length).toFixed(1)} %`);
console.log(`Titres de fin : `, Object.fromEntries(Object.entries(stats.titres).map(([v, n]) => [v, pct(n)])), `égalités ${pct(stats.egalites)}, aucune voie ${pct(stats.voiesNulles)}`);
console.log(`Titre = voie la plus travaillée enfant : ${pct(stats.titreFidele)}`);

console.log(`\nScènes où il ne reste souvent qu'un choix possible (sur plusieurs écrits) :`);
for (const [id, n] of [...stats.scenesUnSeulChoix].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${id} : ${pct(n)}`);

console.log(`\nSouvenirs (drapeaux) : parties où leur choix apparaît`);
for (const [d, n] of [...stats.drapeauxOuverts].sort((a, b) => a[1] - b[1])) console.log(`  ${d} : ${pct(n)}`);

console.log(`\nChoix jamais ou rarement affichés (< 2 %) :`);
for (const [id, scene] of Object.entries(voyage.scenes)) {
  scene.choix.forEach((c, i) => {
    const vus = stats.vus.get(`${id}#${i}`) ?? 0;
    if (vus < PARTIES * 0.02) console.log(`  ${id}#${i} « ${c.texte} » : ${pct(vus)}`, JSON.stringify(c.condition ?? {}));
  });
}
console.log(`\nChoix affichés mais jamais jouables :`);
for (const [id, scene] of Object.entries(voyage.scenes)) {
  scene.choix.forEach((c, i) => {
    if ((stats.vus.get(`${id}#${i}`) ?? 0) > 0 && !stats.joues.get(`${id}#${i}`)) console.log(`  ${id}#${i} « ${c.texte} »`);
  });
}
