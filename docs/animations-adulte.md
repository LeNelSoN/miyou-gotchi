# Nouvel Adulte : animations à générer

Le nouveau dessin de l'Adulte remplace les 15 GIF `public/illustrations/adulte*.gif`.
Référence de personnage pour toutes les générations : `docs/references/adulte-repos.png`
(vue de face, 72 × 100 px sur un canevas 128 × 128). Toutes les animations sont de face.

Ordre : faire valider le n° 1 avant le reste. Les n° 1 à 6 doivent avoir **exactement la même
taille et la tête au même endroit** (sinon le dragon saute d'un état à l'autre et les effets de
talent tombent à côté de sa tête).

## Texte commun (au début de chaque prompt)

```
Same orange dragon as the reference, full body, same proportions and colors, grey horns,
yellow ring around the left eye, cream segmented belly. Clean 1-pixel black outline,
limited palette, transparent background. Canvas 128x128, character about 100 pixels tall,
centered horizontally, feet on the bottom edge.
```

## Prompt négatif (le même pour tous)

```
background, text, realistic, scary, aggressive, extra limbs, different colors, missing horns,
missing eye ring, blurry, anti-aliasing
```

## Liste

« Boucle » : le GIF tourne en continu. « Une fois » : il est joué une seule fois et reste sur sa
dernière image (pas de boucle dans le fichier). Les durées sont celles des animations actuelles,
le code sera recalé sur les nouveaux fichiers.

| # | Fichier | Type | Fait | Ligne à ajouter au texte commun |
|---|---|---|---|---|
| 1 | `adulte.gif` | boucle | ☑ | `Front view, standing calmly, wings folded behind, gentle smile, slow idle breathing.` (prompt complet ci-dessous) |
| 2 | `adulte-content.gif` | boucle | ☑ | `Front view, wings folded, big happy smile, eyes closed, small happy bounce.` |
| 3 | `adulte-faim.gif` | boucle | ☑ | `Front view, wings folded, holding its belly with both paws, pleading eyes, mouth slightly open, stomach rumbling.` |
| 4 | `adulte-fatigue.gif` | boucle | ☑ | `Front view, drooping shoulders and wings, half-closed sleepy eyes, slow big yawn.` |
| 5 | `adulte-triste.gif` | boucle | ☑ | `Front view, head down, wings drooping, teary eyes, small sniffle.` |
| 6 | `adulte-fache.gif` | boucle | ☑ | `Front view, wings folded, arms crossed, frowning, puffed cheeks, small puffs of smoke from the nostrils.` |
| 7 | `adulte-mange.gif` | une fois, ~6 s | ☑ | `Sitting, holding a big piece of roasted meat on the bone, takes three big bites while chewing happily, then a satisfied smile.` |
| 8 | `adulte-rechauffe.gif` | une fois, ~6 s | ☑ | `Sitting in front of a small campfire with logs at its feet, warming its paws over the flames, relaxed happy expression.` |
| 9 | `adulte-lave.gif` | une fois, ~6 s | ☑ | `Sitting in a pile of soap foam and bubbles, scrubbing itself three times, then shakes off and sparkles clean.` |
| 10 | `adulte-joue.gif` | une fois, ~6 s | ☑ | `Standing, tosses a small ball up, bounces it on its snout and catches it, three times, then hugs the ball laughing.` |
| 11 | `adulte-quete.gif` | boucle | ☑ | `Front view, walking in place toward the viewer, carrying a bindle (small red cloth bundle on a stick) over its shoulder, wings folded, cheerful walk cycle.` |
| 12 | `adulte-amour.gif` | une fois, ~5 s | ☑ | `Front view, eyes closed with a blissful smile, hugging itself, small pink hearts floating up around its head.` |
| 13 | `adulte-surprise.gif` | une fois, ~3 s | ☑ | `Front view, wings slightly spread, eyes wide open, mouth open in a happy "oh!", small jump of surprise.` |
| 14 | `adulte-fache-froid.gif` | — | ☑ | Pas de prompt : échange de couleurs à partir du n° 6, fait par Claude. |
| 15 | `adulte-fache-chaud.gif` | — | ☑ | Pas de prompt : échange de couleurs à partir du n° 6, fait par Claude. |

## Prompt complet du n° 1 (animation au repos)

```
Pixel art idle animation, looping, of the same orange dragon as the reference.
Front view, standing calmly on both feet, wings folded behind its back, gentle smile.
Subtle slow breathing: the chest and belly rise and fall slightly, the shoulders and folded wings
move up and down by 1 pixel, the tail tip sways gently, one slow eye blink.
The character stays in place: feet fixed on the ground, same position, same size and same
proportions on every frame, no camera movement. The last frame flows smoothly into the first.
Same proportions and colors, grey horns, yellow ring around the left eye, cream segmented belly.
Clean 1-pixel black outline, limited palette, transparent background.
Canvas 128x128, character about 100 pixels tall, centered horizontally, feet on the bottom edge.
4 to 6 frames.
```

## Après chaque génération

Déposer le GIF dans `public/illustrations/` avec le nom du tableau (ou l'envoyer à Claude) :
Claude vérifie l'alignement avec les autres, recale `src/app/Illustration.js` (largeur, centre,
sol, échelle, durée) et, une fois la tête fixée, les repères des talents (`REPERES.adulte`).
