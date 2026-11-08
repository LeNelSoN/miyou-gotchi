"use client";

const RUBRIQUES_CARNET = [
  ["titres", "Ses titres"],
  ["amis", "Ses amis"],
  ["objets", "Ses trésors"],
  ["lieux", "Les lieux traversés"],
];

// Révèle l'archétype figé au passage à Adulte ; rouvrable ensuite depuis la coque.
// En dessous, le carnet de voyage de sa quête : ce qu'il a rencontré, trouvé et traversé. Son dernier
// titre de quête (`titre`) s'affiche sous son archétype.
export default function CarteIdentite({ nom, archetype, titre, description, carnet = {}, fermer }) {
  const rubriques = RUBRIQUES_CARNET.filter(([cle]) => carnet[cle]?.length);
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4 motion-safe:animate-fondu">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-carte"
        className="flex max-h-full w-full max-w-sm flex-col gap-4 overflow-y-auto rounded-2xl border-4 border-amber-500 bg-stone-900 p-6 text-center font-pixel text-amber-50 shadow-[0_0_40px_rgba(234,88,12,0.4)]"
      >
        <p className="text-sm tracking-[0.3em] text-amber-300">CARTE D&apos;IDENTITÉ</p>
        <div className="ecran flex flex-col gap-2 rounded-lg px-4 py-4">
          <h2 id="titre-carte" className="text-2xl">
            {nom}
          </h2>
          <p className="text-lg">🐉 {archetype}</p>
          {titre && (
            <p className="text-lg text-orange-800">
              {titre.icone} {titre.titre}
            </p>
          )}
        </div>
        <p className="leading-snug">{description}</p>
        {rubriques.length > 0 && (
          <div className="flex flex-col gap-3 border-t-2 border-amber-500/40 pt-4 text-left">
            <p className="text-center text-sm tracking-[0.3em] text-amber-300">CARNET DE VOYAGE</p>
            {rubriques.map(([cle, titre]) => (
              <div key={cle}>
                <p className="text-amber-300">{titre}</p>
                <ul className="leading-snug">
                  {carnet[cle].map((element) => (
                    <li key={element}>{element}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
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
