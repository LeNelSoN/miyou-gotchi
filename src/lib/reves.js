import ia from "../../config/ia.json";

const { reve: CONFIG } = ia;

const NOMS_ETAPES = { bebe: "Bébé", jeune: "Jeune", adulte: "Adulte" };
const LIBELLES_SOINS = {
  nourrir: "nourri",
  laver: "lavé",
  ajouterBois: "réchauffé avec du bois",
  jouer: "a joué",
  eduquer: "a pris une leçon",
};

const FORMAT_REPONSE = {
  type: "object",
  properties: { pendant: { type: "string" }, reveil: { type: "string" } },
  required: ["pendant", "reveil"],
};

function decrireJournee(soins) {
  const faits = Object.entries(soins).map(([soin, fois]) => `${LIBELLES_SOINS[soin] ?? soin} ${fois} fois`);
  return faits.length > 0 ? faits.join(", ") : "une journée calme";
}

// Requête prête pour l'API chat d'Ollama : le homelab n'y ajoute que le nom du modèle.
// `contexte` : { nom, etape, archetype, heureCoucher, coucheParEnfant, soins, revesPrecedents, theme }
export function construireRequeteReve(contexte) {
  const langage = CONFIG.langage[contexte.etape];
  const systeme = CONFIG.systeme.join("\n").replace("{langage}", langage);

  const lignes = [
    `Le dragon : ${contexte.nom || "un petit dragon qui n'a pas encore de nom"}, étape ${NOMS_ETAPES[contexte.etape]}` +
      (contexte.archetype ? `, caractère « ${contexte.archetype} ».` : "."),
    `Sa journée avant de dormir : ${decrireJournee(contexte.soins)}.`,
    contexte.coucheParEnfant
      ? `L'enfant l'a couché à ${contexte.heureCoucher}.`
      : `Il s'est endormi tout seul de fatigue, à ${contexte.heureCoucher}.`,
    `Thème du rêve : ${contexte.theme}.`,
  ];
  if (contexte.revesPrecedents.length > 0) {
    lignes.push(`Ses derniers rêves, à ne pas répéter : ${contexte.revesPrecedents.map((r) => `« ${r} »`).join(" ; ")}.`);
  }
  lignes.push("Écris son rêve de cette nuit.");

  return {
    messages: [
      { role: "system", content: systeme },
      { role: "user", content: lignes.join("\n") },
    ],
    format: FORMAT_REPONSE,
    options: CONFIG.options,
    stream: false,
  };
}

export function themeAuHasard() {
  return CONFIG.themes[Math.floor(Math.random() * CONFIG.themes.length)];
}

function sansAccents(texte) {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Un mot interdit est repéré en début de mot ("bless" écarte "blessé", "blessure"...).
function motInterdit(texte) {
  const mots = sansAccents(texte).split(/[^a-z]+/);
  return ia.motsInterdits.find((interdit) => mots.some((mot) => mot.startsWith(interdit)));
}

function nettoyer(texte) {
  return typeof texte === "string" ? texte.replace(/\s+/g, " ").replace(/^["«\s]+|["»\s]+$/g, "").trim() : "";
}

function verifier(texte, { longueurMin, longueurMax }, champ) {
  if (texte.length < longueurMin) return `${champ} trop court`;
  if (texte.length > longueurMax) return `${champ} trop long`;
  if (/\p{Extended_Pictographic}/u.test(texte)) return `${champ} contient un emoji`;
  const interdit = motInterdit(texte);
  if (interdit) return `${champ} contient un mot interdit (${interdit})`;
  return null;
}

// Renvoie `{ pendant, reveil }` prêts à afficher, ou `{ rejet }` avec la raison.
// L'accord au féminin pour l'enfant n'est pas vérifiable ici : il repose sur le prompt
// et sur la relecture des rêves enregistrés.
export function validerReve(reponseBrute) {
  let reponse;
  try {
    reponse = JSON.parse(reponseBrute);
  } catch {
    return { rejet: "réponse qui n'est pas du JSON" };
  }

  let pendant = nettoyer(reponse?.pendant);
  const reveil = nettoyer(reponse?.reveil);
  const { prefixe } = CONFIG.pendant;
  if (pendant && !pendant.toLowerCase().startsWith(prefixe.slice(0, 3).toLowerCase())) {
    pendant = `${prefixe} ${pendant}`;
  }

  const rejet = verifier(pendant, CONFIG.pendant, "pendant") ?? verifier(reveil, CONFIG.reveil, "reveil");
  return rejet ? { rejet } : { pendant, reveil };
}

export const TENTATIVES_MAX = CONFIG.tentativesMax;
export const NOMBRE_REVES_PRECEDENTS = CONFIG.revesPrecedents;
