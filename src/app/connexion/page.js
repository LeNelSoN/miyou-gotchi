"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Connexion() {
  const router = useRouter();
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  async function valider(e) {
    e.preventDefault();
    setEnCours(true);
    const res = await fetch("/api/connexion", {
      method: "POST",
      body: JSON.stringify({ password: motDePasse }),
    });
    if (res.ok) {
      router.replace("/");
      return;
    }
    const { erreur } = await res.json();
    setErreur(erreur ?? "Une erreur est survenue.");
    setEnCours(false);
  }

  return (
    <div className="antre relative flex flex-1 items-center justify-center overflow-hidden p-4">
      <div className="lueur-braise pointer-events-none absolute inset-x-0 bottom-0 h-1/2 motion-safe:animate-braise" />

      <form
        onSubmit={valider}
        className="relative flex w-full max-w-sm flex-col gap-4 rounded-2xl border-4 border-amber-500 bg-stone-900 p-6 text-center font-pixel text-amber-50 shadow-[0_0_40px_rgba(234,88,12,0.4)]"
      >
        <h1 className="text-sm tracking-[0.3em] text-amber-200">MIYOU-GOTCHI</h1>
        <input
          autoFocus
          type="password"
          autoComplete="current-password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          placeholder="Mot de passe"
          aria-label="Mot de passe"
          className="ecran rounded-lg px-4 py-3 text-center text-xl placeholder:text-[#1f2a17]/50"
        />
        {erreur && <p className="text-sm text-red-400">{erreur}</p>}
        <button
          type="submit"
          disabled={enCours || motDePasse.length === 0}
          className="rounded-full bg-amber-500 px-6 py-3 text-lg text-stone-900 transition active:scale-95 disabled:opacity-50"
        >
          Entrer
        </button>
      </form>
    </div>
  );
}
