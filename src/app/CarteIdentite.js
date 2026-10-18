"use client";

// Révèle l'archétype figé au passage à Adulte ; rouvrable ensuite depuis la coque.
export default function CarteIdentite({ nom, archetype, description, fermer }) {
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4 motion-safe:animate-fondu">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-carte"
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border-4 border-amber-500 bg-stone-900 p-6 text-center font-pixel text-amber-50 shadow-[0_0_40px_rgba(234,88,12,0.4)]"
      >
        <p className="text-sm tracking-[0.3em] text-amber-300">CARTE D&apos;IDENTITÉ</p>
        <div className="ecran flex flex-col gap-2 rounded-lg px-4 py-4">
          <h2 id="titre-carte" className="text-2xl">
            {nom}
          </h2>
          <p className="text-lg">🐉 {archetype}</p>
        </div>
        <p className="leading-snug">{description}</p>
        <button
          onClick={fermer}
          autoFocus
          className="rounded-full bg-amber-500 px-6 py-3 text-lg text-stone-900 transition active:scale-95"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
