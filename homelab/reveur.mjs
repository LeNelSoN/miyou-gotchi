// Relais homelab → jeu, lancé par cron : demande au jeu s'il faut un rêve, le fait écrire
// par Ollama en local, puis renvoie la réponse au jeu qui la valide et l'enregistre.
// Le homelab n'est jamais exposé : il ne fait que des appels sortants.
// Voir docs/homelab-ia.md.

const { JEU_URL, IA_SECRET, OLLAMA_URL = "http://localhost:11434", OLLAMA_MODELE = "gemma3:4b" } = process.env;

if (!JEU_URL || !IA_SECRET) {
  console.error("JEU_URL et IA_SECRET sont obligatoires.");
  process.exit(1);
}

const entetes = { Authorization: `Bearer ${IA_SECRET}`, "Content-Type": "application/json" };

async function appeler(url, options) {
  const res = await fetch(url, options);
  if (!res.ok && res.status !== 422) throw new Error(`${url} → ${res.status} ${await res.text()}`);
  return { statut: res.status, corps: await res.json() };
}

const { corps: contexte } = await appeler(`${JEU_URL}/api/ia/contexte`, { headers: entetes });
if (!contexte.aGenerer) {
  console.log(new Date().toISOString(), "rien à générer");
  process.exit(0);
}

const { corps: generation } = await appeler(`${OLLAMA_URL}/api/chat`, {
  method: "POST",
  body: JSON.stringify({ model: OLLAMA_MODELE, ...contexte.requete }),
});

// En cas de rejet (422), le prochain passage du cron retentera, dans la limite fixée par le jeu.
const { statut, corps } = await appeler(`${JEU_URL}/api/ia/pensees`, {
  method: "POST",
  headers: entetes,
  body: JSON.stringify({
    sommeilDebut: contexte.sommeilDebut,
    modele: OLLAMA_MODELE,
    reponse: generation.message.content,
  }),
});
console.log(new Date().toISOString(), statut === 200 ? "rêve enregistré" : `rêve rejeté : ${corps.erreur}`);
