"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DebugPanel from "./DebugPanel";
import Illustration, { ILLUSTRATIONS, illustrationUrl } from "./Illustration";
import NameModal from "./NameModal";
import CarteIdentite from "./CarteIdentite";
import PetitMot from "./PetitMot";
import { INTERVALLE_PENSEES_MS, penser } from "@/lib/pensees";
import config from "../../config/game.json";

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

// Animation jouée une fois après un soin réussi, pour les étapes qui l'ont.
const ANIMATIONS_SOINS = { nourrir: "mange", ajouterBois: "rechauffe", laver: "lave" };
// Moments de complicité : de l'amour après un bain (quand l'étape n'a pas d'animation de bain),
// une partie de jeu ou une leçon.
const SOINS_AMOUR = ["laver", "jouer", "eduquer"];
// Besoins vraiment en manque (pas seulement « bientôt ») : les combler le surprend.
const HUMEURS_EN_MANQUE = Object.values(config.caracteristiques)
  .map((carac) => carac.humeurSiMauvais)
  .filter(Boolean);

// Réaction jouée une fois après un soin réussi : son animation propre si l'étape l'a, sinon
// la surprise si un besoin en manque (ou le froid) vient d'être comblé, sinon l'amour après
// un jeu ou une leçon. Renvoie le nom de l'illustration, ou `null`.
function reactionAuSoin(avant, apres, soin) {
  const propre = `${apres.etape}-${ANIMATIONS_SOINS[soin]}`;
  if (ILLUSTRATIONS[propre]) return propre;
  if (avant.etape !== apres.etape) return null;
  const comble =
    HUMEURS_EN_MANQUE.some((humeur) => avant.humeurs.includes(humeur) && !apres.humeurs.includes(humeur)) ||
    (avant.indicateurs.feu !== apres.indicateurs.feu && ["froid", "chaud"].includes(avant.indicateurs.feu));
  const nom = comble ? `${apres.etape}-surprise` : SOINS_AMOUR.includes(soin) && `${apres.etape}-amour`;
  return ILLUSTRATIONS[nom] ? nom : null;
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

// Charge les images avant de les montrer, pour que le dragon ne disparaisse pas pendant le téléchargement.
function precharger(adresses) {
  return Promise.all(
    adresses.map(
      (adresse) =>
        new Promise((resolve) => {
          const image = new Image();
          image.onload = image.onerror = resolve;
          image.src = adresse;
        }),
    ),
  );
}

// Renvoie les props de <Illustration>.
function choisirIllustration(dragon, toast, eclosion, animationSoin) {
  // « Frais » reste dans la bonne zone : mêmes illustrations que « parfait ».
  const feu = dragon.indicateurs.feu === "frais" ? "parfait" : dragon.indicateurs.feu;
  if (eclosion) return { nom: "eclosion" };
  if (animationSoin) return animationSoin;
  if (dragon.etape === "oeuf") return { nom: "oeuf", variante: `${feu}-${dragon.palier}` };
  if (toast) return { nom: `${dragon.etape}-content` };
  // La faim et la tristesse n'ont pas de message à l'écran : elles passent avant le feu, qui a le sien.
  if (dragon.humeurs.includes("faim")) return { nom: `${dragon.etape}-faim` };
  if (dragon.dodo.fatigue) return { nom: `${dragon.etape}-fatigue` };
  if (dragon.humeurs.includes("triste")) return { nom: `${dragon.etape}-triste` };
  if (feu !== "parfait") return { nom: `${dragon.etape}-fache`, variante: feu };
  return { nom: dragon.etape };
}

export default function Home() {
  const router = useRouter();
  const [dragon, setDragon] = useState(null);
  const [eclosion, setEclosion] = useState(false);
  const [animationSoin, setAnimationSoin] = useState(null);
  const [rebond, setRebond] = useState(0);
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
    if (!animationSoin) return;
    const minuteur = setTimeout(() => {
      setAnimationSoin(null);
      setRebond((numero) => numero + 1);
    }, ILLUSTRATIONS[animationSoin.nom].dureeMs);
    return () => clearTimeout(minuteur);
  }, [animationSoin]);

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
    if (!res.ok) {
      setEnCours(false);
      return data.erreur ?? "Une erreur est survenue.";
    }

    const nomSoin = evenement?.soin && data.applique !== false && reactionAuSoin(dragon, data, evenement.soin);
    if (nomSoin) {
      const lecture = Date.now();
      // « Content » est préchargé aussi : il suit l'animation si un message s'affiche encore.
      await precharger([illustrationUrl(nomSoin, undefined, lecture), illustrationUrl(`${data.etape}-content`)]);
      setAnimationSoin({ nom: nomSoin, lecture });
      setRebond((numero) => numero + 1);
    }
    // Relâché seulement maintenant : les boutons restent bloqués pendant le préchargement de l'animation.
    setEnCours(false);

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

  // Pas de soin pendant une animation : elle irait trop vite ou serait coupée par la suivante.
  const occupe = enCours || eclosion || Boolean(animationSoin);
  const endormi = dragon?.dodo?.endormi;
  const fatigue = dragon?.dodo?.fatigue;
  const boutonDodo = dragon?.dodo && (endormi ? DODO.reveiller : DODO.coucher);
  const nomAttendu = dragon && dragon.etape !== "oeuf" && !dragon.named && !eclosion;
  const illustration = dragon && choisirIllustration(dragon, toast, eclosion, animationSoin);

  return (
    <div
      className={`antre relative flex flex-1 items-center justify-center overflow-hidden ${
        dragon?.debug ? "pb-[50dvh] sm:pb-0" : ""
      }`}
    >
      <div className="lueur-braise pointer-events-none absolute inset-x-0 bottom-0 h-1/2 motion-safe:animate-braise" />

      <main className="relative w-full max-w-sm px-3 py-3 sm:max-w-md sm:px-5 sm:py-10">
        <div className="coque flex flex-col items-center gap-5 px-[9%] pb-[9%] pt-[8%] sm:gap-5 sm:px-[18%] sm:pb-[20%] sm:pt-[20%]">
          <p className="font-pixel text-xs tracking-[0.3em] sm:text-sm text-amber-200 drop-shadow-[0_2px_0_rgba(0,0,0,0.6)]">
            MIYOU-GOTCHI
          </p>

          {/* Pendant le Dodo, l'écran s'assombrit et le dragon n'est plus visible. */}
          <div
            className={`ecran flex aspect-[6/5] w-full flex-col overflow-hidden rounded-xl p-3 font-pixel transition-colors duration-700 ${
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
                </div>

                {/* La clé relance l'animation d'apparition à chaque changement d'étape
                    (après l'éclosion, pour ne pas la perturber). */}
                <div
                  key={eclosion ? "oeuf" : dragon.etape}
                  className="flex min-h-0 flex-1 items-center justify-center motion-safe:animate-apparition"
                >
                  {!endormi && <Illustration {...illustration} rebond={rebond} />}
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

          {/* Second écran, de taille fixe : ce que dit le dragon. Ses lignes suffisent au texte le
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

          <div className="flex min-h-16 flex-wrap items-start justify-center gap-x-3 gap-y-1.5 sm:min-h-20 sm:gap-y-2">
            {dragon?.actions.map(({ nom, bloquee }) => (
              <div key={nom} className="flex w-12 flex-col items-center gap-1 sm:w-14 sm:gap-1.5">
                <button
                  onClick={() => envoyer(ACTIONS[nom].route, undefined, { soin: nom })}
                  disabled={occupe || bloquee}
                  aria-label={ACTIONS[nom].libelle}
                  className="bouton-coque flex h-10 w-10 items-center justify-center rounded-full text-xl sm:h-12 sm:w-12 sm:text-2xl transition disabled:opacity-50 disabled:grayscale"
                >
                  {ACTIONS[nom].icone}
                </button>
                <span className="font-pixel text-xs text-amber-100" aria-hidden="true">
                  {ACTIONS[nom].court}
                </span>
              </div>
            ))}
            {dragon?.archetype && (
              <div className="flex w-12 flex-col items-center gap-1 sm:w-14 sm:gap-1.5">
                <button
                  onClick={() => setCarteOuverte(true)}
                  aria-label={CARTE.libelle}
                  className="bouton-coque flex h-10 w-10 items-center justify-center rounded-full text-xl sm:h-12 sm:w-12 sm:text-2xl transition"
                >
                  {CARTE.icone}
                </button>
                <span className="font-pixel text-xs text-amber-100" aria-hidden="true">
                  {CARTE.court}
                </span>
              </div>
            )}
            {boutonDodo && (
              <div className="flex w-12 flex-col items-center gap-1 sm:w-14 sm:gap-1.5">
                <button
                  onClick={basculerDodo}
                  disabled={occupe || (!endormi && !fatigue)}
                  aria-label={boutonDodo.libelle}
                  className="bouton-coque flex h-10 w-10 items-center justify-center rounded-full text-xl sm:h-12 sm:w-12 sm:text-2xl transition disabled:opacity-50 disabled:grayscale"
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
        <div className="mt-4 flex justify-center text-center">
          <PetitMot />
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
