"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import DebugPanel from "./DebugPanel";
import Illustration, { EFFETS_TALENT, ILLUSTRATIONS, illustrationUrl } from "./Illustration";
import NameModal from "./NameModal";
import CarteIdentite from "./CarteIdentite";
import Aventure from "./Aventure";
import PetitMot from "./PetitMot";
import { INTERVALLE_PENSEES_MS, penser } from "@/lib/pensees";
import { abonnerSon, basculerSon, jouerSon, sonActive } from "@/lib/sons";
import { choisirTalent } from "@/lib/talents";

// Toutes les 12 s, le dragon montre un peu de son talent (fumée, idée, notes), s'il en a un.
const INTERVALLE_TALENT_MS = 12000;
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
  eduquer: { libelle: "Éduquer", court: "Éduquer", icone: "🎓", route: "educate" },
};
// Choix proposé par « Éduquer » : chaque leçon le fait grandir pareil, mais façonne un talent différent.
const LECONS = {
  sport: { libelle: "Sport", icone: "⚽" },
  lecture: { libelle: "Lecture", icone: "📖" },
  musique: { libelle: "Musique", icone: "🎵" },
};
// Son joué quand le serveur accepte une action, selon la route (soin par défaut).
function sonAction(route, corps) {
  if (route === "sleep") return "dodo";
  if (route === "wake") return "reveil";
  if (route === "educate") return corps?.lecon === "musique" ? "musique" : "lecon";
  if (route === "quest") return "lecon";
  if (route === "debug" || route === "reset") return null;
  return "soin";
}

const CARTE = { libelle: "Carte d'identité", court: "Carte", icone: "🪪" };
const AVENTURE = { libelle: "Aventure", court: "Aventure", icone: "🧭", route: "quest" };
const DODO = {
  coucher: { libelle: "Coucher", court: "Dodo", icone: "🌙", route: "sleep" },
  reveiller: { libelle: "Réveiller", court: "Réveil", icone: "☀️", route: "wake" },
};

function messageSommeil(dodo) {
  const heure = new Date(dodo.reveilA).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `Zzz... (debout vers ${heure})`;
}

// Animation jouée une fois après un soin réussi, pour les étapes qui l'ont. Une leçon a la sienne
// selon son type (`<étape>-sport`, `<étape>-lecture`, `<étape>-musique`). Une étape sans `<étape>-joue`
// garde la réaction « amour » après une partie de jeu.
const ANIMATIONS_SOINS = { nourrir: "mange", ajouterBois: "rechauffe", laver: "lave", jouer: "joue" };
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
function reactionAuSoin(avant, apres, { soin, lecon }) {
  const propre = `${apres.etape}-${soin === "eduquer" ? lecon : ANIMATIONS_SOINS[soin]}`;
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
function choisirIllustration(dragon, toast, eclosion, animationSoin, enAventure) {
  // « Frais » reste dans la bonne zone : mêmes illustrations que « parfait ».
  const feu = dragon.indicateurs.feu === "frais" ? "parfait" : dragon.indicateurs.feu;
  if (eclosion) return { nom: "eclosion" };
  if (animationSoin) return animationSoin;
  // Page d'aventure ouverte et rien ne le retient : il marche avec son baluchon.
  if (enAventure && dragon.quete?.disponible) return { nom: `${dragon.etape}-quete` };
  if (dragon.etape === "oeuf") return { nom: "oeuf", variante: `${feu}-${dragon.palier}` };
  if (toast) return { nom: `${dragon.etape}-content` };
  // La faim et la tristesse n'ont pas de message à l'écran : elles passent avant le feu, qui a le sien.
  if (dragon.humeurs.includes("faim")) return { nom: `${dragon.etape}-faim` };
  if (dragon.dodo.fatigue) return { nom: `${dragon.etape}-fatigue` };
  if (dragon.humeurs.includes("triste")) return { nom: `${dragon.etape}-triste` };
  if (feu !== "parfait") return { nom: `${dragon.etape}-fache`, variante: feu };
  return { nom: dragon.etape };
}

// Chaque appui fait un petit bip : retour immédiat, et premier geste qui autorise le son sur iPhone.
function BoutonCoque({ icone, libelle, court, disabled = false, onClick }) {
  return (
    <div className="flex w-12 flex-col items-center gap-1 sm:w-14 sm:gap-1.5">
      <button
        onClick={() => {
          jouerSon("bip");
          onClick();
        }}
        disabled={disabled}
        aria-label={libelle}
        className="bouton-coque flex h-10 w-10 items-center justify-center rounded-full text-xl transition disabled:opacity-50 disabled:grayscale sm:h-12 sm:w-12 sm:text-2xl"
      >
        {icone}
      </button>
      <span className="font-pixel text-xs text-amber-100" aria-hidden="true">
        {court}
      </span>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [dragon, setDragon] = useState(null);
  const [eclosion, setEclosion] = useState(false);
  const [animationSoin, setAnimationSoin] = useState(null);
  const [effetTalent, setEffetTalent] = useState(null);
  const [rebond, setRebond] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const [toast, setToast] = useState(null);
  const [pensee, setPensee] = useState(null);
  const [carteOuverte, setCarteOuverte] = useState(false);
  const [choixLecon, setChoixLecon] = useState(false);
  const [aventureOuverte, setAventureOuverte] = useState(false);
  // Ce qu'il vient de faire dans sa quête, affiché jusqu'à « Continuer ».
  const [resultatQuete, setResultatQuete] = useState(null);
  // Côté serveur, le son est supposé actif ; le réglage de l'appareil est lu à l'hydratation.
  const son = useSyncExternalStore(abonnerSon, sonActive, () => true);

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

  // Pas d'effet de talent pendant une animation, l'éclosion ou le sommeil.
  useEffect(() => {
    if (!dragon?.talents || dragon.dodo?.endormi || eclosion || animationSoin) return;
    const minuteur = setInterval(() => {
      const talent = choisirTalent(dragon.talents);
      if (!talent) return;
      setEffetTalent({ nom: `talent-${talent.voie}-${talent.palier}`, etape: dragon.etape, lecture: Date.now() });
      if (talent.voie === "musique") jouerSon("fredonne");
    }, INTERVALLE_TALENT_MS);
    return () => clearInterval(minuteur);
  }, [dragon, eclosion, animationSoin]);

  useEffect(() => {
    if (!effetTalent) return;
    const minuteur = setTimeout(() => setEffetTalent(null), EFFETS_TALENT[effetTalent.nom].dureeMs);
    return () => clearTimeout(minuteur);
  }, [effetTalent]);

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
  function afficher(data, evenement) {
    const passage = passageAVoir(data.etape);
    if (passage === "eclosion") setEclosion(true);
    // Le passage à Adulte révèle son caractère.
    if (passage === "grandir" && data.archetype) setCarteOuverte(true);
    setDragon(data);
    if (passage) setPensee(penser(data, { moment: passage }));
    else setPensee(penser(data, evenement));
    return passage;
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
    const { toasts = [], resultatQuete: resultat, ...data } = await res.json();
    if (!res.ok) {
      setEnCours(false);
      return data.erreur ?? "Une erreur est survenue.";
    }

    const nomSoin = evenement?.soin && data.applique !== false && reactionAuSoin(dragon, data, evenement);
    if (nomSoin) {
      const lecture = Date.now();
      // « Content » est préchargé aussi : il suit l'animation si un message s'affiche encore.
      await precharger([illustrationUrl(nomSoin, undefined, lecture), illustrationUrl(`${data.etape}-content`)]);
      setAnimationSoin({ nom: nomSoin, lecture });
      setRebond((numero) => numero + 1);
    }
    // Relâché seulement maintenant : les boutons restent bloqués pendant le préchargement de l'animation.
    setEnCours(false);
    if (resultat) setResultatQuete(resultat);

    const passage = afficher(data, data.applique === false ? undefined : evenement);
    // Un passage d'étape (la 30e leçon le fait devenir adulte) ou la fin d'une quête mérite sa fanfare.
    const finDeQuete = Boolean(data.quete?.fin) && !dragon.quete?.fin;
    jouerSon(passage || finDeQuete ? "fanfare" : data.applique === false ? "refus" : sonAction(route, corps));
    // Nouvel objet à chaque fois pour relancer le minuteur si le message se répète.
    setToast(toasts[0] ? { ...toasts[0] } : null);
    return null;
  }

  function donnerLecon(lecon) {
    setChoixLecon(false);
    envoyer(ACTIONS.eduquer.route, { lecon }, { soin: "eduquer", lecon });
  }

  function choisirDansQuete(index) {
    envoyer(AVENTURE.route, { choix: index }, { soin: "quete" });
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
  const illustration = dragon && choisirIllustration(dragon, toast, eclosion, animationSoin, aventureOuverte);

  return (
    <div
      className={`antre relative flex flex-1 items-center justify-center overflow-hidden ${
        dragon?.debug ? "pb-[50dvh] sm:pb-0" : ""
      }`}
    >
      <div className="lueur-braise pointer-events-none absolute inset-x-0 bottom-0 h-1/2 motion-safe:animate-braise" />

      <main className="relative w-full max-w-sm px-3 py-3 sm:max-w-md sm:px-5 sm:py-10">
        <div className="coque flex flex-col items-center gap-5 px-[9%] pb-[9%] pt-[8%] sm:gap-5 sm:px-[18%] sm:pb-[20%] sm:pt-[20%]">
          {/* Le bouton du son est posé à droite du titre, sans décaler le boîtier. */}
          <div className="relative flex w-full justify-center">
            <p className="font-pixel text-xs tracking-[0.3em] sm:text-sm text-amber-200 drop-shadow-[0_2px_0_rgba(0,0,0,0.6)]">
              MIYOU-GOTCHI
            </p>
            <button
              onClick={() => {
                basculerSon();
                jouerSon("bip");
              }}
              aria-label={son ? "Couper le son" : "Remettre le son"}
              aria-pressed={!son}
              className="absolute -right-2 top-1/2 -translate-y-1/2 p-2 text-sm leading-none opacity-80 transition hover:opacity-100"
            >
              {son ? "🔊" : "🔇"}
            </button>
          </div>

          {/* Pendant le Dodo, l'écran s'assombrit et le dragon n'est plus visible. */}
          <div
            className={`ecran flex aspect-[6/5] w-full flex-col overflow-hidden rounded-xl p-2 font-pixel sm:p-3 transition-colors duration-700 ${
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
                  {/* Le Jeune grandit en apprenant : leçons faites sur l'objectif (demi-leçons possibles). */}
                  {dragon.croissance && (
                    <span
                      className="shrink-0 text-sm"
                      aria-label={`${dragon.croissance.faites.toLocaleString("fr-FR")} leçons sur ${dragon.croissance.objectif}`}
                    >
                      🎓 {dragon.croissance.faites.toLocaleString("fr-FR")}/{dragon.croissance.objectif}
                    </span>
                  )}
                </div>

                {/* La clé relance l'animation d'apparition à chaque changement d'étape
                    (après l'éclosion, pour ne pas la perturber). */}
                <div
                  key={eclosion ? "oeuf" : dragon.etape}
                  className="flex min-h-0 flex-1 items-center justify-center motion-safe:animate-apparition"
                >
                  {!endormi && (
                    <Illustration
                      {...illustration}
                      rebond={rebond}
                      effet={!animationSoin && !eclosion ? effetTalent : null}
                    />
                  )}
                </div>

                {/* Hauteur fixe de trois lignes (saleté, fatigue, feu ou soin) : si la zone grandissait avec
                    les messages, le dragon rétrécirait d'un coup au-dessus. */}
                <div className="flex h-[3.75em] shrink-0 flex-col justify-end text-center text-[13px] leading-tight sm:text-base" aria-live="polite">
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

          {/* Second écran, de taille fixe : ce que dit le dragon. Ses lignes suffisent à la phrase la
              plus longue (81 caractères) sur mobile, pour que rien ne saute. */}
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

          {/* Soins et choix de leçon superposés : la zone garde la hauteur de la plus grande des deux
              (deux rangées de soins contre une de leçons), pour que le boîtier ne bouge pas. */}
          <div className="grid min-h-16 sm:min-h-20">
            <div
              inert={choixLecon}
              className={`col-start-1 row-start-1 flex flex-wrap items-start justify-center gap-x-3 gap-y-1.5 sm:gap-y-2 ${
                choixLecon ? "invisible" : ""
              }`}
            >
              {dragon?.actions.map(({ nom, bloquee }) => (
                <BoutonCoque
                  key={nom}
                  {...ACTIONS[nom]}
                  disabled={occupe || bloquee}
                  onClick={() =>
                    nom === "eduquer" ? setChoixLecon(true) : envoyer(ACTIONS[nom].route, undefined, { soin: nom })
                  }
                />
              ))}
              {dragon?.quete && <BoutonCoque {...AVENTURE} disabled={occupe} onClick={() => setAventureOuverte(true)} />}
              {dragon?.archetype && <BoutonCoque {...CARTE} onClick={() => setCarteOuverte(true)} />}
              {boutonDodo && (
                <BoutonCoque {...boutonDodo} disabled={occupe || (!endormi && !fatigue)} onClick={basculerDodo} />
              )}
            </div>
            <div
              inert={!choixLecon}
              className={`col-start-1 row-start-1 flex flex-wrap items-start justify-center gap-x-3 gap-y-1.5 sm:gap-y-2 ${
                choixLecon ? "" : "invisible"
              }`}
            >
              {Object.entries(LECONS).map(([lecon, { libelle, icone }]) => (
                <BoutonCoque
                  key={lecon}
                  icone={icone}
                  libelle={`Leçon de ${libelle.toLowerCase()}`}
                  court={libelle}
                  disabled={occupe}
                  onClick={() => donnerLecon(lecon)}
                />
              ))}
              <BoutonCoque icone="↩️" libelle="Retour" court="Retour" onClick={() => setChoixLecon(false)} />
            </div>
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
          titre={dragon.quete?.titres.at(-1)}
          carnet={dragon.quete?.carnet}
          fermer={() => setCarteOuverte(false)}
        />
      )}

      {aventureOuverte && dragon?.quete && (
        <Aventure
          nom={dragon.named ? dragon.name : "ton dragon"}
          quete={dragon.quete}
          resultat={resultatQuete}
          enCours={enCours}
          choisir={choisirDansQuete}
          continuer={() => setResultatQuete(null)}
          fermer={() => setAventureOuverte(false)}
        />
      )}

      {dragon?.debug && <DebugPanel dragon={dragon} enCours={enCours} envoyer={envoyer} />}
    </div>
  );
}
