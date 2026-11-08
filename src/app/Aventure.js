"use client";

import Illustration from "./Illustration";

// Page de la quête de l'Adulte, à la façon d'un livre dont on est le héros : la scène en cours et
// ses choix, puis ce qu'il a fait après un choix (`resultat`), jusqu'à « Continuer ». En haut, il
// marche avec son baluchon tant qu'il peut repartir (la page cache l'écran principal sur téléphone).
// Quête terminée : son titre et l'épilogue (`quete.fin`), jusqu'à ce qu'une nouvelle quête commence.
export default function Aventure({ nom, quete, resultat, enCours, choisir, continuer, fermer }) {
  const { scene, chapitre, fin } = quete;
  const entete = chapitre
    ? `CHAPITRE ${chapitre.numero} · ${chapitre.titre.toUpperCase()}`
    : fin
      ? `${fin.quete.toUpperCase()} · FIN`
      : "AVENTURE";

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4 motion-safe:animate-fondu">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-aventure"
        className="flex max-h-full w-full max-w-sm flex-col gap-4 overflow-y-auto rounded-2xl border-4 border-amber-500 bg-stone-900 p-5 font-pixel text-amber-50 shadow-[0_0_40px_rgba(234,88,12,0.4)]"
      >
        <p id="titre-aventure" className="text-center text-sm tracking-[0.2em] text-amber-300">
          {entete}
        </p>

        {quete.disponible && (
          <div className="flex h-28 shrink-0">
            <Illustration nom="adulte-quete" />
          </div>
        )}

        {resultat ? (
          <>
            <p className="ecran rounded-lg px-4 py-4 text-center leading-snug motion-safe:animate-fondu">{resultat}</p>
            <button
              onClick={continuer}
              autoFocus
              className="rounded-full bg-amber-500 px-6 py-3 text-lg text-stone-900 transition active:scale-95"
            >
              Continuer
            </button>
          </>
        ) : (
          <>
            {scene ? (
              <div className="ecran flex flex-col gap-2 rounded-lg px-4 py-4">
                <p className="text-center text-4xl leading-none" aria-hidden="true">
                  {scene.lieu}
                </p>
                <p className="leading-snug">{scene.texte}</p>
              </div>
            ) : null}

            {!scene && fin && (
              <>
                <div className="ecran flex flex-col items-center gap-2 rounded-lg px-4 py-4 text-center motion-safe:animate-fondu">
                  <p className="text-5xl leading-none" aria-hidden="true">
                    {fin.icone}
                  </p>
                  <p className="text-sm">{nom},</p>
                  <h2 className="text-2xl leading-tight">{fin.titre}</h2>
                </div>
                <p className="leading-snug">{fin.epilogue}</p>
              </>
            )}

            {quete.raison && <p className="text-center leading-snug text-amber-300">{quete.raison}</p>}

            {scene && quete.disponible && (
              <div className="flex flex-col gap-2">
                <p className="text-center">Que doit faire {nom} ?</p>
                {scene.choix.map(({ index, texte, icone, possible, raison }) => (
                  <button
                    key={index}
                    onClick={() => choisir(index)}
                    disabled={enCours || !possible}
                    className="flex flex-col rounded-xl border-2 border-amber-500 px-3 py-2 text-left leading-snug transition active:scale-[0.98] disabled:border-stone-600 disabled:text-stone-400"
                  >
                    <span>
                      {icone && <span aria-hidden="true">{icone} </span>}
                      {texte}
                    </span>
                    {raison && <span className="text-xs text-stone-400">{raison}</span>}
                  </button>
                ))}
              </div>
            )}

            {quete.disponible && quete.etapesRestantes > 0 && (
              <p className="text-center text-xs text-amber-300">
                Encore {quete.etapesRestantes} étape{quete.etapesRestantes > 1 ? "s" : ""} possible
                {quete.etapesRestantes > 1 ? "s" : ""} aujourd&apos;hui
              </p>
            )}

            <button
              onClick={fermer}
              autoFocus={!quete.disponible}
              className="rounded-full border-2 border-amber-500 px-6 py-2 text-amber-200 transition active:scale-95"
            >
              Fermer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
