"use client";

import { useEffect, useState } from "react";

const EMOJIS_FEU = { froid: "🥶", parfait: "🔥", chaud: "🥵" };
const MESSAGES_FEU = {
  froid: "Il a froid...",
  parfait: "Il est bien au chaud !",
  chaud: "Il a trop chaud !",
};

export default function Home() {
  const [dragon, setDragon] = useState(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    fetch("/api/dragon")
      .then((res) => res.json())
      .then(setDragon);
  }, []);

  async function ajouterDuBois() {
    setEnCours(true);
    const res = await fetch("/api/dragon/add-wood", { method: "POST" });
    const data = await res.json();
    setDragon(data);
    setEnCours(false);
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-6 p-8">
        {!dragon && <p className="text-zinc-500">Chargement...</p>}

        {dragon && dragon.etape !== "oeuf" && (
          <p className="text-zinc-500">
            Étape « {dragon.etape} » — pas encore implémentée.
          </p>
        )}

        {dragon && dragon.etape === "oeuf" && (
          <>
            <div className="text-8xl">🥚</div>
            <div className="text-5xl">{EMOJIS_FEU[dragon.indicateurs.feu]}</div>
            <p className="text-lg text-zinc-700 dark:text-zinc-300">
              {MESSAGES_FEU[dragon.indicateurs.feu]}
            </p>
            <button
              onClick={ajouterDuBois}
              disabled={enCours}
              className="rounded-full bg-foreground px-6 py-3 text-background font-medium transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
            >
              Ajouter du bois
            </button>
          </>
        )}
      </main>
    </div>
  );
}
