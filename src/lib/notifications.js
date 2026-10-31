import notifications from "../../config/notifications.json";

const JOUR_MS = 24 * 60 * 60 * 1000;

// Ordre des besoins si plusieurs sont présents : le plus simple à combler d'abord.
const BESOINS = [
  ["faim", (dragon) => dragon.humeurs.includes("faim")],
  ["froid", (dragon) => dragon.indicateurs.feu === "froid"],
  ["fatigue", (dragon) => dragon.dodo?.fatigue],
  ["triste", (dragon) => dragon.humeurs.includes("triste")],
  ["sale", (dragon) => dragon.humeurs.includes("sale")],
];

function listePour(dragon) {
  const { phrases } = notifications;
  if (dragon.etape === "oeuf") return phrases.oeuf;
  if (!dragon.named) return phrases.sansNom;
  if (dragon.dodo?.endormi) return phrases.endormi;
  const besoin = BESOINS.find(([, present]) => present(dragon));
  return besoin ? phrases.besoins[besoin[0]] : phrases.content;
}

// Une phrase par jour, qui tourne dans la liste : jamais la même deux jours de suite
// pour un même état, sans rien avoir à mémoriser.
export function messageDuJour(dragon, maintenant = new Date()) {
  const liste = listePour(dragon);
  const jour = Math.floor(maintenant.getTime() / JOUR_MS);
  return {
    titre: notifications.titre,
    corps: liste[jour % liste.length].replaceAll("{nom}", dragon.name),
  };
}

// Pas de petit mot si elle s'est déjà occupée du dragon peu avant : il sert à rappeler,
// pas à insister.
export function debutSilence(maintenant = new Date()) {
  return new Date(maintenant.getTime() - notifications.silenceSiActiviteHeures * 60 * 60 * 1000);
}
