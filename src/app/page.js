"use client";

import { useEffect, useState } from "react";
import DebugPanel from "./DebugPanel";

const EMOJIS_ETAPE = { oeuf: "🥚", bebe: "🐲", jeune: "🦖", adulte: "🐉" };
const EMOJIS_FEU = { froid: "🥶", parfait: "🔥", chaud: "🥵" };
const MESSAGES_FEU = {
  froid: "Il a froid...",
  parfait: "Il est bien au chaud !",
  chaud: "Il a trop chaud !",
};
const ACTIONS = {
  ajouterBois: { libelle: "Ajouter du bois", route: "add-wood" },
  nourrir: { libelle: "Nourrir", route: "feed" },
  laver: { libelle: "Laver", route: "wash" },
  jouer: { libelle: "Jouer", route: "play" },
  eduquer: { libelle: "Éduquer", route: "educate" },
};

export default function Home() {
  const [dragon, setDragon] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetch("/api/dragon")
      .then((res) => res.json())
      .then(setDragon);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const minuteur = setTimeout(() => setToast(null), toast.dureeSecondes * 1000);
    return () => clearTimeout(minuteur);
  }, [toast]);

  async function envoyer(route, corps) {
    setEnCours(true);
    const res = await fetch(`/api/dragon/${route}`, {
      method: "POST",
      body: corps ? JSON.stringify(corps) : undefined,
    });
    const { toasts = [], ...data } = await res.json();
    setDragon(data);
    // Nouvel objet à chaque fois pour relancer le minuteur si le message se répète.
    setToast(toasts[0] ? { ...toasts[0] } : null);
    setEnCours(false);
  }

  const etapeImplementee = dragon && EMOJIS_ETAPE[dragon.etape];

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-6 p-8">
        {!dragon && <p className="text-zinc-500">Chargement...</p>}

        {dragon && !etapeImplementee && (
          <p className="text-zinc-500">
            Étape « {dragon.etape} » — pas encore implémentée.
          </p>
        )}

        {etapeImplementee && (
          <>
            <div className="text-8xl">{EMOJIS_ETAPE[dragon.etape]}</div>
            <div className="text-5xl">{EMOJIS_FEU[dragon.indicateurs.feu]}</div>
            <p className="text-lg text-zinc-700 dark:text-zinc-300">
              {MESSAGES_FEU[dragon.indicateurs.feu]}
            </p>

            {dragon.alertes.map((message) => (
              <p key={message} className="font-medium text-red-600 dark:text-red-400">
                {message}
              </p>
            ))}

            <p className="h-6 font-medium text-green-600 dark:text-green-400">
              {toast?.message}
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              {dragon.actions.map(({ nom, bloquee }) => (
                <button
                  key={nom}
                  onClick={() => envoyer(ACTIONS[nom].route)}
                  disabled={enCours || bloquee}
                  className="rounded-full bg-foreground px-6 py-3 text-background font-medium transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
                >
                  {ACTIONS[nom].libelle}
                </button>
              ))}
            </div>
          </>
        )}

        {dragon?.debug && <DebugPanel dragon={dragon} enCours={enCours} envoyer={envoyer} />}
      </main>
    </div>
  );
}
