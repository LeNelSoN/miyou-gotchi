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
  // Joué une fois à chaque repas, comme le Bébé : trois bouchées puis un sourire.
  "jeune-mange": { largeur: 128, centre: 70, sol: 13, scene: GRANDE_SCENE, dureeMs: 6400 },
  // Joué une fois à chaque bûche, comme le Bébé. Le feu de camp dépasse sous ses pieds.
  "jeune-rechauffe": { largeur: 128, centre: 69, sol: 14, scene: GRANDE_SCENE, dureeMs: 6400 },
  // Joué une fois à chaque bain, comme le Bébé. Dessiné assis par l'IA, à la même échelle.
  "jeune-lave": { largeur: 128, centre: 69, sol: 14, scene: GRANDE_SCENE, dureeMs: 6400 },
  // Leçons, jouées une fois comme les soins. Planches PixelLab plus petites (96 pixels) :
  // `echelle` lui rend la taille du Jeune.
  "jeune-sport": { largeur: 96, centre: 51.5, sol: 10, echelle: 1.4, scene: GRANDE_SCENE, dureeMs: 6400 },
  // Assis, de trois quarts : centré sur la tête, comme les autres dessins.
  "jeune-lecture": { largeur: 96, centre: 52, sol: 12, echelle: 1.4, scene: GRANDE_SCENE, dureeMs: 6400 },
  "jeune-musique": { largeur: 96, centre: 51.5, sol: 10, echelle: 1.4, scene: GRANDE_SCENE, dureeMs: 6400 },
  "jeune-amour": { largeur: 82, centre: 39, sol: 6, scene: GRANDE_SCENE, dureeMs: 4200 },
  "jeune-surprise": { largeur: 82, centre: 39, sol: 6, scene: GRANDE_SCENE, dureeMs: 3000 },
  // Nouveau dessin (docs/animations-adulte.md) : respiration et clignement, 4 images de 0,4 s.
  adulte: { largeur: 78, centre: 45, sol: 0, scene: GRANDE_SCENE },
  // Variantes `froid` et `chaud`, comme le Bébé.
  // Nouveau dessin : bras croisés de trois quarts, fumée, 4 images de 0,4 s. Variantes recolorées.
  "adulte-fache": { largeur: 78, centre: 48, sol: 1, scene: GRANDE_SCENE },
  // Nouveau dessin (docs/animations-adulte.md) : 4 poses enchaînées, 0,3 s chacune.
  "adulte-content": { largeur: 80, centre: 46, sol: 0, scene: GRANDE_SCENE },
  // Nouveau dessin : se frotte le ventre, bulle de pensée avec un morceau de viande (dessinée à part).
  "adulte-faim": { largeur: 92, centre: 46, sol: 0, scene: GRANDE_SCENE },
  // Nouveau dessin : paupières lourdes, bâillement, 4 images de 0,5 s.
  "adulte-fatigue": { largeur: 76, centre: 45, sol: 0, scene: GRANDE_SCENE },
  // Nouveau dessin : tête basse, larme, 4 images de 0,5 s (un peu plus petit, tête baissée).
  "adulte-triste": { largeur: 72, centre: 42.5, sol: 1, scene: GRANDE_SCENE },
  // Soins joués une fois, comme le Jeune. Planches PixelLab de 96 pixels : `echelle` lui rend
  // la taille de l'Adulte.
  // Nouveau dessin, à la taille du dragon (plus d'échelle) : trois bouchées (3 × 3 images de 0,55 s) puis l'os. La viande
  // levée dépasse un peu la scène en haut (116 px de haut).
  "adulte-mange": { largeur: 97, centre: 53.5, sol: 0, scene: GRANDE_SCENE, dureeMs: 6400 },
  // Nouveau dessin, recalé sur les bûches : il se frotte les pattes 3 fois devant le feu puis rayonne (6,4 s).
  "adulte-rechauffe": { largeur: 79, centre: 46, sol: 0, scene: GRANDE_SCENE, dureeMs: 6400 },
  // Nouveau dessin, recalé sur la mousse : il se savonne 3 fois puis finit tout propre (6,4 s).
  "adulte-lave": { largeur: 90, centre: 46.5, sol: 0, scene: GRANDE_SCENE, dureeMs: 6400 },
  // Nouveau dessin, de face : marche sur place avec son baluchon, 4 images de 0,25 s, en boucle tant que
  // la page d'aventure est ouverte. Centre sur le ventre (le baluchon dépasse à gauche).
  "adulte-quete": { largeur: 76, centre: 45, sol: 1, scene: GRANDE_SCENE },
  // Nouveau dessin, recalé sur les pieds : lance le ballon, rebond sur le museau, rattrape (3 fois),
  // puis le serre en riant (6,4 s). Le ballon au plus haut dépasse la scène de 2 px.
  "adulte-joue": { largeur: 76, centre: 45, sol: 0, scene: GRANDE_SCENE, dureeMs: 6400 },
  // Nouveau dessin, recalé sur les pieds : il se serre dans ses bras deux fois, les cœurs montent (5,4 s).
  // Le cœur le plus haut dépasse la scène de 2 px.
  "adulte-amour": { largeur: 76, centre: 45, sol: 0, scene: GRANDE_SCENE, dureeMs: 5400 },
  // Nouveau dessin : « oh ! », ailes qui s'ouvrent avec un petit saut (image 2), puis grand sourire (3 s).
  "adulte-surprise": { largeur: 92, centre: 47, sol: 0, scene: GRANDE_SCENE, dureeMs: 3000 },
  // En grève (variable d'environnement GREVE), à toutes les étapes : le Bébé au repos, avec une
  // pancarte « GRÈVE » devant le ventre.
  "bebe-greve": { largeur: 64, centre: 32.5, sol: 4 },
};

// Effets de talent (fumée, idées, notes), dessinés sur 32 pixels et posés à côté du dragon, à la
// même échelle. Joués une fois, sans boucle (la dernière image est vide).
export const EFFETS_TALENT = {
  "talent-sport-1": { dureeMs: 1010 },
  "talent-sport-2": { dureeMs: 1140 },
  "talent-sport-3": { dureeMs: 2500 },
  "talent-lecture-1": { dureeMs: 1220 },
  "talent-lecture-2": { dureeMs: 1220 },
  "talent-lecture-3": { dureeMs: 1540 },
  "talent-musique-1": { dureeMs: 1300 },
  "talent-musique-2": { dureeMs: 1660 },
  "talent-musique-3": { dureeMs: 1970 },
};

// Repères de la tête, en pixels de GIF depuis le point d'ancrage du dragon (`centre` en x, `sol` en y,
// vers le haut) : narine droite et coin haut droit de la tête. Les mêmes dans tous les dessins d'une étape.
const REPERES = {
  jeune: { museau: [-2, 61], tete: [11, 92] },
  // Mesurés sur le nouveau adulte.gif (narine droite à x 47, ligne 26, abaissée de 3 px pour dégager l'œil ; coin de la tête à x 54, ligne 13).
  adulte: { museau: [2, 76], tete: [9, 92] },
};

// Où poser le coin bas gauche de l'effet, depuis un repère : la fumée et la flamme sortent du museau,
// les idées et les notes flottent à côté de la tête.
const POSES = {
  // Au ras du museau ; la grosse fumée un peu plus loin, pour ne pas cacher l'œil.
  "talent-sport-1": ["museau", -1, -6],
  "talent-sport-2": ["museau", 2, -6],
  "talent-sport-3": ["museau", -1, -16],
  lecture: ["tete", -3, -18],
  musique: ["tete", -3, -18],
};

function poseEffet(etape, nom) {
  const reperes = REPERES[etape];
  const pose = POSES[nom] ?? POSES[nom.split("-")[1]];
  if (!reperes || !pose) return null;
  const [repere, dx, dy] = pose;
  const [x, y] = reperes[repere];
  return { x: x + dx, y: y + dy };
}

// `lecture` : une adresse différente à chaque fois fait repartir un GIF sans boucle du début.
export function illustrationUrl(nom, variante, lecture) {
  return `/illustrations/${variante ? `${nom}-${variante}` : nom}.gif${lecture ? `?lecture=${lecture}` : ""}`;
}

// `rebond` : numéro qui change à chaque petit bond à jouer (0 = aucun). Le bond masque le passage
// entre deux dessins de finesse différente.
// `effet` : `{ nom, etape, lecture }`, effet de talent posé à côté du dragon (voir `EFFETS_TALENT`).
export default function Illustration({ nom, variante, lecture, rebond = 0, effet }) {
  const { largeur, centre, sol, scene = SCENE, echelle = 1 } = ILLUSTRATIONS[nom];

  const fichier = illustrationUrl(nom, variante, lecture);
  const pose = effet && poseEffet(effet.etape, effet.nom);
  // Même taille de pixel que le dragon, arrondie de la même façon.
  const pixel = `round(down, min(100cqw / ${scene.largeur}, 100cqh / ${scene.hauteur}), var(--pixel-ecran))`;

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
          "--pixel": pixel,
          // Sans arrondi : le dragon garde exactement sa taille, quitte à des pixels un peu moins réguliers.
          "--pixel-dessin": `calc(var(--pixel) * ${echelle})`,
          width: `calc(${largeur} * var(--pixel-dessin))`,
          left: `calc(50% - ${centre} * var(--pixel-dessin))`,
          bottom: `calc(${-sol} * var(--pixel-dessin))`,
          imageRendering: "pixelated",
        }}
      />
      {pose && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={effet.lecture}
          src={illustrationUrl(effet.nom, undefined, effet.lecture)}
          alt=""
          className="pointer-events-none absolute max-w-none"
          style={{
            "--pixel": pixel,
            width: "calc(32 * var(--pixel))",
            left: `calc(50% + ${pose.x} * var(--pixel))`,
            bottom: `calc(${pose.y} * var(--pixel))`,
            imageRendering: "pixelated",
          }}
        />
      )}
    </div>
  );
}
