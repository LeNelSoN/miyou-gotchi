"use client";

import { useState } from "react";

export default function NameModal({ longueurMax, enCours, nommer }) {
  const [nom, setNom] = useState("");
  const [erreur, setErreur] = useState(null);

  async function valider(e) {
    e.preventDefault();
    setErreur(await nommer(nom));
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4 motion-safe:animate-fondu">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-nom"
        onSubmit={valider}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border-4 border-amber-500 bg-stone-900 p-6 text-center font-pixel text-amber-50 shadow-[0_0_40px_rgba(234,88,12,0.4)]"
      >
        <h2 id="titre-nom" className="text-xl">
          Il a éclos ! Comment s&apos;appelle-t-il ?
        </h2>
        <input
          autoFocus
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          maxLength={longueurMax}
          placeholder="Son nom"
          aria-label="Nom du dragon"
          className="ecran rounded-lg px-4 py-3 text-center text-xl placeholder:text-[#1f2a17]/50"
        />
        {erreur && <p className="text-sm text-red-400">{erreur}</p>}
        <button
          type="submit"
          disabled={enCours || nom.trim().length === 0}
          className="rounded-full bg-amber-500 px-6 py-3 text-lg text-stone-900 transition active:scale-95 disabled:opacity-50"
        >
          Valider
        </button>
      </form>
    </div>
  );
}
