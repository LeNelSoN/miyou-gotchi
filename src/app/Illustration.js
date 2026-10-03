// Chaque GIF du dessinateur a son propre cadrage : `centre` et `sol` situent le
// personnage (en pixels du GIF) pour qu'il ne saute pas d'une illustration à l'autre.
export const ILLUSTRATIONS = {
  // Une variante par état du feu (échange de couleurs à partir de l'œuf "parfait").
  "oeuf-froid": { largeur: 62, centre: 29.5, sol: 5 },
  "oeuf-parfait": { largeur: 62, centre: 29.5, sol: 5 },
  "oeuf-chaud": { largeur: 62, centre: 29.5, sol: 5 },
  // Jouée une seule fois : le fichier n'a pas de boucle et reste sur sa dernière image.
  eclosion: { largeur: 62, centre: 29.5, sol: 5, dureeMs: 6000 },
  bebe: { largeur: 64, centre: 32.5, sol: 4 },
  // Échange de couleurs à partir de bebe-fache.gif (l'original du dessinateur).
  "bebe-fache-froid": { largeur: 63, centre: 31.5, sol: 4 },
  "bebe-fache-chaud": { largeur: 63, centre: 31.5, sol: 4 },
  "bebe-content": { largeur: 89, centre: 26.5, sol: 1 },
  "bebe-faim": { largeur: 94, centre: 28.5, sol: 1 },
  "bebe-fatigue": { largeur: 94, centre: 34.5, sol: 6 },
};

// Scène (en pixels de GIF) dans laquelle tient la plus grande illustration,
// personnage posé en bas au centre.
const SCENE = { largeur: 96, hauteur: 80 };

export default function Illustration({ nom }) {
  const { largeur, centre, sol } = ILLUSTRATIONS[nom];

  return (
    <div className="relative flex-1 self-stretch" style={{ containerType: "size" }}>
      {/* GIF animé : next/image ne l'optimiserait pas. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/illustrations/${nom}.gif`}
        alt=""
        className="absolute max-w-none"
        style={{
          // Arrondi à un nombre entier de pixels physiques : tous les pixels du GIF
          // gardent la même taille, donc des contours nets et réguliers.
          "--pixel": `round(down, min(100cqw / ${SCENE.largeur}, 100cqh / ${SCENE.hauteur}), var(--pixel-ecran))`,
          width: `calc(${largeur} * var(--pixel))`,
          left: `calc(50% - ${centre} * var(--pixel))`,
          bottom: `calc(${-sol} * var(--pixel))`,
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}
