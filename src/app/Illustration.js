// Scène (en pixels de GIF) dans laquelle tient la plus grande illustration de l'étape,
// personnage posé en bas au centre.
const SCENE = { largeur: 96, hauteur: 80 };
const GRANDE_SCENE = { largeur: 96, hauteur: 110 };

// Chaque GIF du dessinateur a son propre cadrage : `centre` et `sol` situent le
// personnage (en pixels du GIF) pour qu'il ne saute pas d'une illustration à l'autre.
export const ILLUSTRATIONS = {
  // Variantes `<feu>-<palier>` : couleur selon le feu, fissures selon l'avancement de l'étape
  // (dérivées du GIF d'éclosion du dessinateur).
  oeuf: { largeur: 62, centre: 29.5, sol: 5 },
  // Jouée une seule fois : le fichier n'a pas de boucle et reste sur sa dernière image.
  eclosion: { largeur: 62, centre: 29.5, sol: 5, dureeMs: 6000 },
  bebe: { largeur: 64, centre: 32.5, sol: 4 },
  // Variantes `froid` et `chaud` : échange de couleurs à partir de l'original du dessinateur.
  "bebe-fache": { largeur: 63, centre: 31.5, sol: 4 },
  "bebe-content": { largeur: 89, centre: 26.5, sol: 1 },
  "bebe-faim": { largeur: 94, centre: 28.5, sol: 1 },
  "bebe-fatigue": { largeur: 63, centre: 31.5, sol: 4 },
  // Joué une fois à chaque repas, sans boucle. Dessiné plus finement que le reste (128 pixels
  // de côté) : `echelle` lui rend la taille du Bébé.
  "bebe-mange": { largeur: 128, centre: 66, sol: 18, echelle: 0.75, dureeMs: 6400 },
  // Joué une fois à chaque bûche, sans boucle. Le feu de camp dépasse sous ses pieds.
  "bebe-rechauffe": { largeur: 96, centre: 48.5, sol: 14, dureeMs: 6400 },
  // Joué une fois à chaque bain, sans boucle : savonnage répété trois fois, puis tout propre.
  "bebe-lave": { largeur: 96, centre: 48.5, sol: 11, dureeMs: 6400 },
  "bebe-triste": { largeur: 94, centre: 34.5, sol: 6 },
  // Réactions jouées une fois après un soin, sans boucle : amour après un jeu ou une leçon,
  // surprise quand un besoin en manque vient d'être comblé.
  "bebe-amour": { largeur: 87, centre: 27.5, sol: 4, dureeMs: 4200 },
  "bebe-surprise": { largeur: 94, centre: 34.5, sol: 6, dureeMs: 3000 },
  jeune: { largeur: 80, centre: 33, sol: 6, scene: GRANDE_SCENE },
  // Variantes `froid` et `chaud`, comme le Bébé.
  "jeune-fache": { largeur: 71, centre: 35, sol: 5, scene: GRANDE_SCENE },
  "jeune-content": { largeur: 82, centre: 39, sol: 6, scene: GRANDE_SCENE },
  "jeune-faim": { largeur: 86, centre: 34, sol: 3, scene: GRANDE_SCENE },
  "jeune-fatigue": { largeur: 80, centre: 33, sol: 6, scene: GRANDE_SCENE },
  "jeune-triste": { largeur: 80, centre: 33, sol: 6, scene: GRANDE_SCENE },
  "jeune-amour": { largeur: 82, centre: 39, sol: 6, scene: GRANDE_SCENE, dureeMs: 4200 },
  "jeune-surprise": { largeur: 82, centre: 39, sol: 6, scene: GRANDE_SCENE, dureeMs: 3000 },
  adulte: { largeur: 72, centre: 37, sol: 1, scene: GRANDE_SCENE },
  // Variantes `froid` et `chaud`, comme le Bébé.
  "adulte-fache": { largeur: 82, centre: 38, sol: 1, scene: GRANDE_SCENE },
  "adulte-content": { largeur: 80, centre: 38, sol: 3, scene: GRANDE_SCENE },
  "adulte-faim": { largeur: 94, centre: 40, sol: 2, scene: GRANDE_SCENE },
  "adulte-fatigue": { largeur: 82, centre: 38, sol: 1, scene: GRANDE_SCENE },
  "adulte-triste": { largeur: 91, centre: 36, sol: 3, scene: GRANDE_SCENE },
  "adulte-amour": { largeur: 91, centre: 36, sol: 3, scene: GRANDE_SCENE, dureeMs: 5400 },
  "adulte-surprise": { largeur: 82, centre: 38, sol: 1, scene: GRANDE_SCENE, dureeMs: 3000 },
};

// `lecture` : une adresse différente à chaque fois fait repartir un GIF sans boucle du début.
export function illustrationUrl(nom, variante, lecture) {
  return `/illustrations/${variante ? `${nom}-${variante}` : nom}.gif${lecture ? `?lecture=${lecture}` : ""}`;
}

// `rebond` : numéro qui change à chaque petit bond à jouer (0 = aucun). Le bond masque le passage
// entre deux dessins de finesse différente.
export default function Illustration({ nom, variante, lecture, rebond = 0 }) {
  const { largeur, centre, sol, scene = SCENE, echelle = 1 } = ILLUSTRATIONS[nom];

  const fichier = illustrationUrl(nom, variante, lecture);

  return (
    <div className="relative flex-1 self-stretch" style={{ containerType: "size" }}>
      {/* GIF animé : next/image ne l'optimiserait pas. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={rebond}
        src={fichier}
        alt=""
        className={`absolute max-w-none origin-bottom ${rebond ? "motion-safe:animate-rebond" : ""}`}
        style={{
          // Arrondi à un nombre entier de pixels physiques : tous les pixels du GIF
          // gardent la même taille, donc des contours nets et réguliers.
          "--pixel": `round(down, min(100cqw / ${scene.largeur}, 100cqh / ${scene.hauteur}), var(--pixel-ecran))`,
          // Sans arrondi : le dragon garde exactement sa taille, quitte à des pixels un peu moins réguliers.
          "--pixel-dessin": `calc(var(--pixel) * ${echelle})`,
          width: `calc(${largeur} * var(--pixel-dessin))`,
          left: `calc(50% - ${centre} * var(--pixel-dessin))`,
          bottom: `calc(${-sol} * var(--pixel-dessin))`,
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}
