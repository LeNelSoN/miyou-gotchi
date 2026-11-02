// Talent montré à un instant donné : une voie au hasard parmi celles qui ont atteint un palier,
// d'autant plus souvent qu'elle a reçu de leçons. S'il a fait un peu de tout, il montre un peu
// de tout, mais la voie la plus suivie se voit le plus. Renvoie `{ voie, palier }` ou `null`.
export function choisirTalent(talents, aleatoire = Math.random) {
  const voies = Object.entries(talents ?? {}).filter(([, { palier }]) => palier > 0);
  const total = voies.reduce((somme, [, { lecons }]) => somme + lecons, 0);
  let tirage = aleatoire() * total;
  for (const [voie, { lecons, palier }] of voies) {
    tirage -= lecons;
    if (tirage < 0) return { voie, palier };
  }
  return null;
}
