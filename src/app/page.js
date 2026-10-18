"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DebugPanel from "./DebugPanel";
import Illustration, { ILLUSTRATIONS } from "./Illustration";
import NameModal from "./NameModal";
import CarteIdentite from "./CarteIdentite";
import { INTERVALLE_PENSEES_MS, penser } from "@/lib/pensees";

// Étapes dont les illustrations ne sont pas encore livrées.
const EMOJIS_ETAPE = { jeune: "🦖", adulte: "🐉" };
const EMOJIS_FEU = { froid: "🥶", frais: "🪵", parfait: "🔥", chaud: "🥵" };
const MESSAGES_FEU = {
  froid: "Il a froid...",
  frais: "Il commence à faire frais...",
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
const CARTE = { libelle: "Carte d'identité", court: "Carte", icone: "🪪" };
const DODO = {
  coucher: { libelle: "Coucher", court: "Dodo", icone: "🌙", route: "sleep" },
  reveiller: { libelle: "Réveiller", court: "Réveil", icone: "☀️", route: "wake" },
};

function messageSommeil(dodo) {
  const heure = new Date(dodo.reveilA).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `Zzz... (debout vers ${heure})`;
}

const CLE_ETAPE_VUE = "miyou-gotchi:etape";

// Les passages d'étape ont souvent lieu en l'absence du joueur : on retient la dernière
// étape vue sur cet appareil pour pouvoir les lui montrer à son retour.
// Renvoie "eclosion", "grandir" ou `null`.
function passageAVoir(etape) {
  try {
    const etapeVue = localStorage.getItem(CLE_ETAPE_VUE);
    localStorage.setItem(CLE_ETAPE_VUE, etape);
    if (!etapeVue || etapeVue === etape) return null;
    return etapeVue === "oeuf" && etape === "bebe" ? "eclosion" : "grandir";
  } catch {
    return null;
  }
}

// Renvoie les props de <Illustration>, ou `null` si l'étape n'est pas encore illustrée.
function choisirIllustration(dragon, toast, eclosion) {
  // « Frais » reste dans la bonne zone : mêmes illustrations que « parfait ».
  const feu = dragon.indicateurs.feu === "frais" ? "parfait" : dragon.indicateurs.feu;
  if (eclosion) return { nom: "eclosion" };
  if (dragon.etape === "oeuf") return { nom: "oeuf", variante: `${feu}-${dragon.palier}` };
  if (dragon.etape === "bebe") {
    if (toast) return { nom: "bebe-content" };
    // La faim n'a pas de message à l'écran : elle passe avant le feu, qui a le sien.
    if (dragon.humeurs.includes("faim")) return { nom: "bebe-faim" };
    if (dragon.dodo.fatigue) return { nom: "bebe-fatigue" };
    if (feu !== "parfait") return { nom: "bebe-fache", variante: feu };
    return { nom: "bebe" };
  }
  return null;
}

export default function Home() {
  const router = useRouter();
  const [dragon, setDragon] = useState(null);
  const [eclosion, setEclosion] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [toast, setToast] = useState(null);
  const [pensee, setPensee] = useState(null);
  const [carteOuverte, setCarteOuverte] = useState(false);

  useEffect(() => {
    fetch("/api/dragon").then(async (res) => {
      // Session absente ou expirée : retour à l'écran de mot de passe.
      if (res.status === 401) return router.replace("/connexion");
      const data = await res.json();
      afficher(data);
    });
  }, [router]);

  // Une nouvelle pensée de temps en temps, tant que la page reste ouverte.
  useEffect(() => {
    if (!dragon) return;
    const minuteur = setInterval(() => setPensee(penser(dragon)), INTERVALLE_PENSEES_MS);
    return () => clearInterval(minuteur);
  }, [dragon]);

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

  // Après une éclosion, le premier mot attend la fin de l'animation (l'écran de dialogue reste vide pendant).
  // Le récit du rêve de la nuit (IA), envoyé une seule fois après le réveil, passe avant le reste.
  function afficher(data, evenement) {
    const passage = passageAVoir(data.etape);
    if (passage === "eclosion") setEclosion(true);
    // Le passage à Adulte révèle son caractère.
    if (passage === "grandir" && data.archetype) setCarteOuverte(true);
    setDragon(data);
    if (passage) setPensee(penser(data, { moment: passage }));
    else setPensee(data.souvenirReve ?? penser(data, evenement));
  }

  // Renvoie le message d'erreur du serveur, ou `null` si tout s'est bien passé.
  // `evenement` (soin ou moment clé) choisit la pensée qui suit, si l'action a abouti.
  async function envoyer(route, corps, evenement) {
    setEnCours(true);
    const res = await fetch(`/api/dragon/${route}`, {
      method: "POST",
      body: corps ? JSON.stringify(corps) : undefined,
    });
    if (res.status === 401) {
      router.replace("/connexion");
      return null;
    }
    const { toasts = [], ...data } = await res.json();
    setEnCours(false);
    if (!res.ok) return data.erreur ?? "Une erreur est survenue.";

    afficher(data, data.applique === false ? undefined : evenement);
    // Nouvel objet à chaque fois pour relancer le minuteur si le message se répète.
    setToast(toasts[0] ? { ...toasts[0] } : null);
    return null;
  }

  function basculerDodo() {
    const { endormi, sommeilHeures, dureeMinHeures } = dragon.dodo;
    const question = `Le coucher ? Il dormira ${sommeilHeures} h (réveil possible après ${dureeMinHeures} h).`;
    if (!endormi && !window.confirm(question)) return;
    if (endormi) envoyer(DODO.reveiller.route, undefined, { moment: "reveil" });
    else envoyer(DODO.coucher.route);
  }

  const endormi = dragon?.dodo?.endormi;
  const fatigue = dragon?.dodo?.fatigue;
  const boutonDodo = dragon?.dodo && (endormi ? DODO.reveiller : DODO.coucher);
  const nomAttendu = dragon && dragon.etape !== "oeuf" && !dragon.named && !eclosion;
  const illustration = dragon && choisirIllustration(dragon, toast, eclosion);

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

          {/* Pendant le Dodo, l'écran s'assombrit et le dragon n'est plus visible. */}
          <div
            className={`ecran flex aspect-square w-full flex-col overflow-hidden rounded-xl p-3 font-pixel transition-colors duration-700 ${
              endormi ? "ecran-eteint" : ""
            }`}
          >
            {!dragon && (
              <p className="m-auto text-lg motion-safe:animate-pulse">Chargement...</p>
            )}

            {dragon && (
              <>
                <div className="flex items-center justify-between text-lg leading-none">
                  <h1 className="truncate">{dragon.named ? dragon.name : "???"}</h1>
                  {/* Avec une illustration, l'état du feu se lit sur le dessin et le message. */}
                  {!illustration && !endormi && <span aria-hidden="true">{EMOJIS_FEU[dragon.indicateurs.feu]}</span>}
                </div>

                {/* La clé relance l'animation d'apparition à chaque changement d'étape
                    (après l'éclosion, pour ne pas la perturber). */}
                <div
                  key={eclosion ? "oeuf" : dragon.etape}
                  className="flex min-h-0 flex-1 items-center justify-center motion-safe:animate-apparition"
                >
                  {endormi ? null : illustration ? (
                    <Illustration {...illustration} />
                  ) : (
                    <div className="text-[clamp(3rem,18vw,4.5rem)] leading-none drop-shadow-[0_6px_0_rgba(31,42,23,0.25)] motion-safe:animate-flotter">
                      {EMOJIS_ETAPE[dragon.etape]}
                    </div>
                  )}
                </div>

                <div className="flex min-h-12 flex-col justify-end text-center leading-tight" aria-live="polite">
                  {!endormi && dragon.alertes.map((message) => (
                    <p key={message} className="text-red-800 motion-safe:animate-fondu">
                      ⚠ {message}
                    </p>
                  ))}
                  {fatigue && <p className="motion-safe:animate-fondu">{dragon.dodo.messageFatigue}</p>}
                  {/* Le message ponctuel remplace temporairement l'état du feu (ou du sommeil). */}
                  <p key={toast?.message} className={toast ? "motion-safe:animate-fondu" : ""}>
                    {toast
                      ? toast.message
                      : endormi
                        ? messageSommeil(dragon.dodo)
                        : MESSAGES_FEU[dragon.indicateurs.feu]}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Second écran, de taille fixe : ce que dit le dragon. Six lignes suffisent au texte le
              plus long (récit d'un rêve de l'IA, 160 caractères) sur mobile, pour que rien ne saute. */}
          <div
            className={`ecran ecran-dialogue flex w-full items-center justify-center overflow-hidden rounded-xl px-3 py-2 text-center font-pixel transition-colors duration-700 ${
              endormi ? "ecran-eteint" : ""
            }`}
            aria-live="polite"
          >
            {pensee && !eclosion && (
              <p key={pensee} className="motion-safe:animate-fondu">
                {pensee}
              </p>
            )}
          </div>

          <div className="flex min-h-20 flex-wrap items-start justify-center gap-x-3 gap-y-2">
            {dragon?.actions.map(({ nom, bloquee }) => (
              <div key={nom} className="flex w-14 flex-col items-center gap-1.5">
                <button
                  onClick={() => envoyer(ACTIONS[nom].route, undefined, { soin: nom })}
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
            {dragon?.archetype && (
              <div className="flex w-14 flex-col items-center gap-1.5">
                <button
                  onClick={() => setCarteOuverte(true)}
                  aria-label={CARTE.libelle}
                  className="bouton-coque flex h-12 w-12 items-center justify-center rounded-full text-2xl transition"
                >
                  {CARTE.icone}
                </button>
                <span className="font-pixel text-xs text-amber-100" aria-hidden="true">
                  {CARTE.court}
                </span>
              </div>
            )}
            {boutonDodo && (
              <div className="flex w-14 flex-col items-center gap-1.5">
                <button
                  onClick={basculerDodo}
                  disabled={enCours || (!endormi && !fatigue)}
                  aria-label={boutonDodo.libelle}
                  className="bouton-coque flex h-12 w-12 items-center justify-center rounded-full text-2xl transition disabled:opacity-50 disabled:grayscale"
                >
                  {boutonDodo.icone}
                </button>
                <span className="font-pixel text-xs text-amber-100" aria-hidden="true">
                  {boutonDodo.court}
                </span>
              </div>
            )}
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

      {carteOuverte && dragon?.archetype && (
        <CarteIdentite
          nom={dragon.named ? dragon.name : "Ton dragon"}
          archetype={dragon.archetype}
          description={dragon.descriptionArchetype}
          fermer={() => setCarteOuverte(false)}
        />
      )}

      {dragon?.debug && <DebugPanel dragon={dragon} enCours={enCours} envoyer={envoyer} />}
    </div>
  );
}
