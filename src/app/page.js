"use client";

import { useEffect, useState } from "react";
import DebugPanel from "./DebugPanel";
import Illustration, { ILLUSTRATIONS } from "./Illustration";
import NameModal from "./NameModal";

// Étapes dont les illustrations ne sont pas encore livrées.
const EMOJIS_ETAPE = { jeune: "🦖", adulte: "🐉" };
const EMOJIS_FEU = { froid: "🥶", parfait: "🔥", chaud: "🥵" };
const MESSAGES_FEU = {
  froid: "Il a froid...",
  parfait: "Il est bien au chaud !",
  chaud: "Il a trop chaud !",
};
const ACTIONS = {
  ajouterBois: { libelle: "Ajouter du bois", court: "Bois", icone: "🪵", route: "add-wood" },
  nourrir: { libelle: "Nourrir", court: "Nourrir", icone: "🍖", route: "feed" },
  laver: { libelle: "Laver", court: "Laver", icone: "🫧", route: "wash" },
  jouer: { libelle: "Jouer", court: "Jouer", icone: "🎾", route: "play" },
  eduquer: { libelle: "Éduquer", court: "Éduquer", icone: "📖", route: "educate" },
};

const CLE_ETAPE_VUE = "miyou-gotchi:etape";

// L'éclosion a souvent lieu en l'absence du joueur : on retient la dernière étape
// vue sur cet appareil pour pouvoir la lui montrer à son retour.
function eclosionAVoir(etape) {
  try {
    const etapeVue = localStorage.getItem(CLE_ETAPE_VUE);
    localStorage.setItem(CLE_ETAPE_VUE, etape);
    return etapeVue === "oeuf" && etape === "bebe";
  } catch {
    return false;
  }
}

function nomIllustration(dragon, toast, eclosion) {
  if (eclosion) return "eclosion";
  if (dragon.etape === "oeuf") return `oeuf-${dragon.indicateurs.feu}`;
  if (dragon.etape === "bebe") {
    if (toast) return "bebe-content";
    // La faim n'a pas de message à l'écran : elle passe avant le feu, qui a le sien.
    if (dragon.humeurs.includes("faim")) return "bebe-faim";
    if (dragon.indicateurs.feu !== "parfait") return `bebe-fache-${dragon.indicateurs.feu}`;
    return "bebe";
  }
  return null;
}

export default function Home() {
  const [dragon, setDragon] = useState(null);
  const [eclosion, setEclosion] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetch("/api/dragon")
      .then((res) => res.json())
      .then((data) => {
        if (eclosionAVoir(data.etape)) setEclosion(true);
        setDragon(data);
      });
  }, []);

  useEffect(() => {
    if (!eclosion) return;
    const minuteur = setTimeout(() => setEclosion(false), ILLUSTRATIONS.eclosion.dureeMs);
    return () => clearTimeout(minuteur);
  }, [eclosion]);

  useEffect(() => {
    if (!toast) return;
    const minuteur = setTimeout(() => setToast(null), toast.dureeSecondes * 1000);
    return () => clearTimeout(minuteur);
  }, [toast]);

  // Renvoie le message d'erreur du serveur, ou `null` si tout s'est bien passé.
  async function envoyer(route, corps) {
    setEnCours(true);
    const res = await fetch(`/api/dragon/${route}`, {
      method: "POST",
      body: corps ? JSON.stringify(corps) : undefined,
    });
    const { toasts = [], ...data } = await res.json();
    setEnCours(false);
    if (!res.ok) return data.erreur ?? "Une erreur est survenue.";

    if (eclosionAVoir(data.etape)) setEclosion(true);
    setDragon(data);
    // Nouvel objet à chaque fois pour relancer le minuteur si le message se répète.
    setToast(toasts[0] ? { ...toasts[0] } : null);
    return null;
  }

  const nomAttendu = dragon && dragon.etape !== "oeuf" && !dragon.named && !eclosion;
  const illustration = dragon && nomIllustration(dragon, toast, eclosion);

  return (
    <div
      className={`antre relative flex flex-1 items-center justify-center overflow-hidden ${
        dragon?.debug ? "pb-[50dvh] sm:pb-0" : ""
      }`}
    >
      <div className="lueur-braise pointer-events-none absolute inset-x-0 bottom-0 h-1/2 motion-safe:animate-braise" />

      <main className="relative w-full max-w-sm px-5 py-10 sm:max-w-md">
        <div className="coque flex flex-col items-center gap-5 px-[18%] pb-[20%] pt-[20%]">
          <p className="font-pixel text-sm tracking-[0.3em] text-amber-200 drop-shadow-[0_2px_0_rgba(0,0,0,0.6)]">
            MIYOU-GOTCHI
          </p>

          <div className="ecran flex aspect-square w-full flex-col overflow-hidden rounded-xl p-3 font-pixel">
            {!dragon && (
              <p className="m-auto text-lg motion-safe:animate-pulse">Chargement...</p>
            )}

            {dragon && (
              <>
                <div className="flex items-center justify-between text-lg leading-none">
                  <h1 className="truncate">{dragon.named ? dragon.name : "???"}</h1>
                  {/* Avec une illustration, l'état du feu se lit sur le dessin et le message. */}
                  {!illustration && <span aria-hidden="true">{EMOJIS_FEU[dragon.indicateurs.feu]}</span>}
                </div>

                {/* La clé relance l'animation d'apparition à chaque changement d'étape
                    (après l'éclosion, pour ne pas la perturber). */}
                <div
                  key={eclosion ? "oeuf" : dragon.etape}
                  className="flex min-h-0 flex-1 items-center justify-center motion-safe:animate-apparition"
                >
                  {illustration ? (
                    <Illustration nom={illustration} />
                  ) : (
                    <div className="text-[clamp(3rem,18vw,4.5rem)] leading-none drop-shadow-[0_6px_0_rgba(31,42,23,0.25)] motion-safe:animate-flotter">
                      {EMOJIS_ETAPE[dragon.etape]}
                    </div>
                  )}
                </div>

                <div className="flex min-h-12 flex-col justify-end text-center leading-tight" aria-live="polite">
                  {dragon.alertes.map((message) => (
                    <p key={message} className="text-red-800 motion-safe:animate-fondu">
                      ⚠ {message}
                    </p>
                  ))}
                  {/* Le message ponctuel remplace temporairement l'état du feu. */}
                  <p key={toast?.message} className={toast ? "motion-safe:animate-fondu" : ""}>
                    {toast ? toast.message : MESSAGES_FEU[dragon.indicateurs.feu]}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex min-h-20 flex-wrap items-start justify-center gap-x-3 gap-y-2">
            {dragon?.actions.map(({ nom, bloquee }) => (
              <div key={nom} className="flex w-14 flex-col items-center gap-1.5">
                <button
                  onClick={() => envoyer(ACTIONS[nom].route)}
                  disabled={enCours || bloquee}
                  aria-label={ACTIONS[nom].libelle}
                  className="bouton-coque flex h-12 w-12 items-center justify-center rounded-full text-2xl transition disabled:opacity-50 disabled:grayscale"
                >
                  {ACTIONS[nom].icone}
                </button>
                <span className="font-pixel text-xs text-amber-100" aria-hidden="true">
                  {ACTIONS[nom].court}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {nomAttendu && (
        <NameModal
          longueurMax={dragon.nomLongueurMax}
          enCours={enCours}
          nommer={(name) => envoyer("name", { name })}
        />
      )}

      {dragon?.debug && <DebugPanel dragon={dragon} enCours={enCours} envoyer={envoyer} />}
    </div>
  );
}
