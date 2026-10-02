"use client";

const ETAPES = ["oeuf", "bebe", "jeune", "adulte"];
const SAUTS_HEURES = [1, 6, 24];
const PAS_AJUSTEMENT = 20;

// Liste les chemins de toutes les constantes numériques de la config.
function constantesNumeriques(noeud, chemin = []) {
  if (typeof noeud === "number") return [{ chemin, valeur: noeud }];
  if (noeud === null || typeof noeud !== "object" || Array.isArray(noeud)) return [];
  return Object.entries(noeud).flatMap(([cle, enfant]) => constantesNumeriques(enfant, [...chemin, cle]));
}

// Regroupe par caractéristique, ou par section pour le reste de la config.
function groupesDeConstantes(config) {
  const groupes = {};
  for (const constante of constantesNumeriques(config)) {
    const profondeur = constante.chemin[0] === "caracteristiques" ? 2 : 1;
    const titre = constante.chemin[profondeur - 1];
    const libelle = constante.chemin.slice(profondeur).join(".") || titre;
    (groupes[titre] ??= []).push({ ...constante, libelle });
  }
  return Object.entries(groupes);
}

const BOUTON = "rounded border border-zinc-600 px-2 py-0.5 hover:bg-zinc-700 disabled:opacity-50";

export default function DebugPanel({ dragon, enCours, envoyer }) {
  const { debug } = dragon;
  const commande = (corps) => envoyer("debug", corps);

  return (
    <aside className="fixed bottom-0 left-0 right-0 flex flex-col gap-2 bg-zinc-900 p-3 font-mono text-xs text-zinc-100 sm:left-auto sm:w-80">
      <p className="font-bold">
        DEBUG — {dragon.etape}
        {debug.dureeEtape != null && ` · ${debug.progression}/${debug.dureeEtape} h`}
      </p>

      {Object.entries(debug.valeurs).map(([nom, { valeur, active }]) => (
        <div key={nom} className={`flex items-center gap-2 ${active ? "" : "opacity-40"}`}>
          <span className="flex-1">{nom}</span>
          <span>{valeur}</span>
          <button className={BOUTON} disabled={enCours} onClick={() => commande({ ajuster: { nom, delta: -PAS_AJUSTEMENT } })}>
            −{PAS_AJUSTEMENT}
          </button>
          <button className={BOUTON} disabled={enCours} onClick={() => commande({ ajuster: { nom, delta: PAS_AJUSTEMENT } })}>
            +{PAS_AJUSTEMENT}
          </button>
        </div>
      ))}

      {debug.personality && (
        <p>
          archétype : {debug.personality} · {JSON.stringify(debug.adultStats)}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {SAUTS_HEURES.map((heures) => (
          <button key={heures} className={BOUTON} disabled={enCours} onClick={() => commande({ avancerHeures: heures })}>
            +{heures} h
          </button>
        ))}
        <button className={BOUTON} disabled={enCours || debug.dureeEtape == null} onClick={() => commande({ finirEtape: true })}>
          Finir l&apos;étape
        </button>
      </div>

      {debug.config && (
        <details>
          <summary className="cursor-pointer font-bold">Calibration (config/game.json)</summary>
          <div className="mt-2 flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
            {groupesDeConstantes(debug.config).map(([titre, constantes]) => (
              <fieldset key={titre} className="rounded border border-zinc-700 px-2 pb-2">
                <legend className="px-1">{titre}</legend>
                {constantes.map(({ chemin, valeur, libelle }) => (
                  <label key={chemin.join(".")} className="flex items-center gap-2 py-0.5">
                    <span className="flex-1">{libelle}</span>
                    {/* La clé inclut la valeur pour réinitialiser le champ après enregistrement. */}
                    <input
                      key={valeur}
                      type="number"
                      step="any"
                      defaultValue={valeur}
                      disabled={enCours}
                      className="w-20 rounded border border-zinc-600 bg-zinc-800 px-1 text-right"
                      onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                      onBlur={(e) => {
                        const saisie = e.target.value;
                        if (saisie === "" || Number(saisie) === valeur) return;
                        commande({ calibrer: { chemin, valeur: Number(saisie) } });
                      }}
                    />
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        </details>
      )}

      <div className="flex flex-wrap gap-2">
        {ETAPES.map((etape) => (
          <button key={etape} className={BOUTON} disabled={enCours} onClick={() => envoyer("reset", { etape })}>
            ↺ {etape}
          </button>
        ))}
      </div>
    </aside>
  );
}
