// Outils partagés par les simulateurs (`scripts/vie`, `scripts/quete`).

export const HEURE = 3600e3;

// Hasard reproductible (mulberry32) : une même graine donne les mêmes chiffres.
export function hasardReproductible(graine) {
  return () => {
    graine = (graine + 0x6d2b79f5) | 0;
    let t = Math.imul(graine ^ (graine >>> 15), 1 | graine);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const moyenne = (liste) => liste.reduce((a, b) => a + b, 0) / liste.length;

// Heures de visite, heure du Maroc (UTC+1) : école en semaine, plus de temps le mercredi et le week-end.
export function visites(jour) {
  const libre = [0, 3, 6].includes(jour % 7);
  return libre ? [8.5, 11, 14.5, 17, 20] : [7.5, 17, 20];
}

// Le jour de l'éclosion, à 8 h au Maroc.
export const ECLOSION = new Date("2026-11-09T07:00:00Z");

// Un Bébé qui vient d'éclore.
export function bebe(debut = ECLOSION) {
  return {
    stage: 1, stage_progress: 0, named: true, name: "Coco", personality: null, lecons: {}, besoins: {},
    fire: 60, hunger: 100, clean: 100, joy: 100, learning: 50,
    sleeping_since: null, awake_since: debut.toISOString(), last_seen: debut.toISOString(), quete: {},
  };
}

// Instant d'une visite : `heure` (Maroc) du jour `jour` après l'éclosion, à ± 45 min.
export function instantVisite(jour, heure, hasard, debut = ECLOSION) {
  return new Date(debut.getTime() + (jour * 24 + heure - 8 + (hasard() - 0.5) * 1.5) * HEURE);
}
