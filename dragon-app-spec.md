# Dragon Tamagotchi — Spec & Roadmap (Next.js)

## 1. Concept

Animal virtuel en forme de dragon, cadeau d'anniversaire. L'œuf éclot, on s'occupe du dragon pour le faire grandir en plusieurs stades, et on lui apprend des tours. Le dragon ne "meurt" jamais — au pire il est mal en point, jamais perdu.

Illustrations : fournies par un dessinateur ; animations de soins complétées par génération IA (PixelLab), à partir de ses dessins. Un seul projet Next.js (front + API).

Les règles ci-dessous sont définies **étape de développement par étape de développement**, avec l'auteur du projet — rien n'est présumé à l'avance.

## 2. Stack technique

- **Next.js** (App Router)
- **Supabase** (Postgres + `@supabase/supabase-js`), avec RLS activé sur la table
- **Tailwind CSS**
- Déploiement : Vercel

## 3. Modèle de données (Supabase / Postgres)

```sql
create table dragon (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null default '',
  named               boolean not null default false,
  stage               int not null default 0,       -- 0=œuf, 1=bébé, 2=jeune, 3=adulte
  fire                numeric not null default 80,   -- jauge de chaleur, active à chaque étape (l'œuf arrive bien au chaud)
  stage_progress      numeric not null default 0,    -- progression vers l'étape suivante (remise à 0 à chaque avancement) : heures (œuf, Bébé) ou leçons (Jeune)
  hunger              numeric not null default 100,  -- nourriture, active à partir de l'étape Bébé
  clean               numeric not null default 100,  -- hygiène, active à partir de l'étape Bébé
  joy                 numeric not null default 100,  -- joie, active à partir de l'étape Jeune
  learning            numeric not null default 0,    -- apprentissage, actif à partir de l'étape Jeune
  energy              numeric not null default 100,  -- inutilisée : l'énergie est remplacée par la fatigue du Dodo (section 4)
  adult_stats         jsonb,                          -- scores de rapidité {feu, nourriture, hygiene, joie, apprentissage} figés au passage à Adulte
  personality         text,                           -- archétype dérivé de adult_stats (section 5)
  besoins             jsonb not null default '{}',    -- suivi des besoins pendant la croissance, par trait : {notes, nombre, ouvert}
  lecons              jsonb not null default '{}',    -- leçons données, par type : {sport, lecture, musique} (base du talent de l'Adulte)
  derniere_activite   timestamptz,                    -- dernier soin, leçon, nom, coucher ou réveil de la joueuse (silence du petit mot du jour)
  quete               jsonb not null default '{}',    -- quête de l'Adulte : {id, scene, drapeaux, carnet, voies, terminees, fin, jour, etapesDuJour} (section 5)
  tricks_learned      jsonb not null default '[]',    -- inutilisées : les tours sont remplacés par la quête
  available_tricks    jsonb not null default '[]',
  training_progress   jsonb not null default '{}',
  sleeping_since      timestamptz,                    -- heure du coucher (mode Dodo), null = éveillé
  awake_since         timestamptz not null default now(), -- heure du dernier réveil (ou de l'éclosion), base de la fatigue
  last_seen           timestamptz not null default now(),
  last_trick_refresh  timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

alter table dragon enable row level security;

-- Appareils abonnés au petit mot quotidien (notifications push)
create table abonnements_push (
  endpoint    text primary key,               -- adresse du service push de l'appareil
  abonnement  jsonb not null,                 -- abonnement complet du navigateur (endpoint + clés)
  created_at  timestamptz not null default now()
);
alter table abonnements_push enable row level security;
```

## 4. Configuration (constantes ajustables)

Toutes les valeurs numériques du jeu vivent dans une **config centralisée**, jamais en dur dans le code. Structure modulaire : chaque **caractéristique** (feu, nourriture, hygiène, joie, apprentissage) est une unité autonome et auto-descriptive — elle porte ses propres seuils, son effet par action, si elle influence la croissance, et à quelles étapes elle est active. Les étapes elles-mêmes ne contiennent plus que leur durée.

- Départ simple : un fichier `config/game.json`, importé par les routes/Server Actions.
- Évolution possible : une table `game_config` en base (clé/valeur), si on veut pouvoir ajuster en live sans redéploiement.

```json
{
  "caracteristiques": {
    "feu": {
      "champDb": "fire",
      "max": 100,
      "seuilMin": 30,
      "seuilMax": 80,
      "variationParHeure": -3,
      "anticipation": { "seuil": 60, "humeur": "frais" },
      "actions": { "ajouterBois": { "effet": 20 }, "laver": { "effet": -10, "secondaire": true } },
      "affecteCroissance": true,
      "etapesActives": ["oeuf", "bebe", "jeune", "adulte"],
      "indicateur": { "type": "qualitatifPermanent", "etats": ["froid", "parfait", "chaud"] }
    },
    "nourriture": {
      "champDb": "hunger",
      "max": 100,
      "seuilMin": 70,
      "variationParHeure": -3,
      "anticipation": { "seuil": 85, "humeur": "petitCreux" },
      "actions": { "nourrir": { "effet": 30 } },
      "affecteCroissance": true,
      "etapesActives": ["bebe", "jeune", "adulte"],
      "indicateur": { "type": "ponctuel", "declencheur": "bon", "dureeSecondes": 3, "message": "Il a assez mangé !" },
      "humeurSiMauvais": "faim"
    },
    "hygiene": {
      "champDb": "clean",
      "max": 100,
      "seuilMin": 25,
      "variationParHeure": -4,
      "anticipation": { "seuil": 50, "humeur": "gratte" },
      "actions": { "laver": { "effet": 30 } },
      "bloque": { "laver": { "siAuDessus": 70 } },
      "affecteCroissance": true,
      "etapesActives": ["bebe", "jeune", "adulte"],
      "indicateur": { "type": "persistant", "declencheur": "mauvais", "message": "Il est très sale !" },
      "humeurSiMauvais": "sale"
    },
    "joie": {
      "champDb": "joy",
      "max": 100,
      "seuilMin": 30,
      "variationParHeure": -1,
      "anticipation": { "seuil": 70, "humeur": "ennui" },
      "actions": { "jouer": { "effet": 25 }, "eduquer": { "effet": -15, "secondaire": true } },
      "multiplicateurActionSiMauvais": { "jouer": 0.5 },
      "affecteCroissance": true,
      "etapesActives": ["jeune", "adulte"],
      "bloque": { "nourrir": "siMauvais" },
      "humeurSiMauvais": "triste"
    },
    "apprentissage": {
      "champDb": "learning",
      "max": 100,
      "seuilMin": 40,
      "variationParHeure": -3,
      "anticipation": { "seuil": 70, "humeur": "curiosite" },
      "actions": { "eduquer": { "effet": 20 } },
      "affecteCroissance": false,
      "etapesActives": ["jeune"],
      "bloque": { "eduquer": { "siAuDessus": 80 } },
      "humeurSiMauvais": "envieApprendre"
    }
  },
  "personnalite": {
    "suivi": { "etapes": ["bebe", "jeune"], "delaiParfaitHeures": 1, "demiVieHeures": 3, "noteNeutre": 50, "poidsNeutre": 1, "notePrevention": 100 },
    "margeEgalite": 5,
    "ordrePriorite": ["feu", "nourriture", "hygiene", "joie", "apprentissage"],
    "archetypes": { "feu": "Ardent", "...": "..." },
    "descriptions": { "Ardent": "Tu as toujours veillé sur son feu. ...", "...": "..." }
  },
  "etapes": {
    "oeuf": { "dureeHeures": 72, "paliers": 6 },
    "bebe": { "dureeHeures": 168 },
    "jeune": { "lecons": 30 }
  },
  "lecons": { "types": ["sport", "lecture", "musique"], "pointSiBesoinEnManque": 0.5, "paliers": [3, 8, 15] },
  "multiplicateurRalentissement": 0.5,
  "dodo": {
    "etapes": {
      "bebe": { "eveilHeures": 10, "sommeilHeures": 12 },
      "jeune": { "eveilHeures": 12, "sommeilHeures": 11 },
      "adulte": { "eveilHeures": 13, "sommeilHeures": 10 }
    },
    "endormissementHeures": 3,
    "dureeMinHeures": 4,
    "multiplicateurPerte": 0.5,
    "fatigueParAction": { "jouer": 0.5, "eduquer": 0.5 },
    "bloqueSiFatigue": ["eduquer"],
    "fatigue": { "message": "Il tombe de sommeil..." },
    "refusReveil": { "dureeSecondes": 3, "message": "Il dort trop profondément..." }
  },
  "nom": { "longueurMax": 20 }
}
```

### Légende des champs d'une caractéristique

| Champ | Rôle |
|---|---|
| `champDb` | nom de la colonne correspondante dans la table `dragon` (section 3) |
| `max` | valeur plafond de la jauge |
| `seuilMin` / `seuilMax` | bornes de la "bonne zone" — l'un des deux, les deux (feu), ou aucun (apprentissage) |
| `variationParHeure` | évolution automatique par heure réelle : négatif = décroissance (feu, nourriture, hygiène, joie, apprentissage), 0/absent = pas de variation passive |
| `actions` | map nom d'action → effet par clic (positif ou négatif). `secondaire: true` : simple effet de bord, sans créer de bouton (ex : le bain refroidit le feu de 10) |
| `multiplicateurActionSiMauvais` | réduit l'effet d'une action précise quand la jauge est hors de sa bonne zone (ex: "Jouer" moins efficace quand triste) |
| `affecteCroissance` | si `true`, doit être dans la bonne zone pour que `stage_progress` avance à vitesse normale |
| `etapesActives` | à quelles étapes cette caractéristique est active |
| `bloque` | actions bloquées quand hors zone (`"siMauvais"`), ou tant que la jauge reste au-dessus d'un seuil (`{ "siAuDessus": 70 }` : pas de bain s'il est encore propre) |
| `indicateur` | ce qui est montré au joueur : `qualitatifPermanent` (feu, toujours visible), `ponctuel` (toast temporaire), `persistant` (reste affiché tant que vrai) |
| `humeurSiMauvais` | humeur illustrée (sans texte) tant que la jauge est hors de sa bonne zone (ex: `"faim"` → bulle avec le morceau de viande) |
| `anticipation` | `{ seuil, humeur }` : encore en bonne zone mais sous `seuil`, le besoin approche. Le dragon l'annonce dans ses pensées (humeur « bientôt » : `frais`, `petitCreux`, `gratte`, `ennui`, `curiosite`) et un soin donné à ce moment **prévient** le besoin (voir l'archétype). Pour le feu, c'est aussi l'état « frais » de l'indicateur |


## 5. Règles du jeu, par étape de développement

### Règle de progression commune (toutes étapes)

**Œuf et Bébé grandissent avec le temps** (`etapes.<étape>.dureeHeures`) : à chaque heure réelle écoulée, pour l'étape en cours : si **toutes** les caractéristiques actives à cette étape avec `affecteCroissance: true` sont dans leur bonne zone → `stage_progress += 1h`. Sinon (au moins une hors zone) → `stage_progress += 1h × multiplicateurRalentissement`. Jamais bloqué complètement, juste plus long si négligé (cohérent avec "jamais de mort"). Quand `stage_progress >= etapes.<étape>.dureeHeures` → passage à l'étape suivante, `stage_progress` repart à 0.

**Le Jeune grandit en apprenant** (`etapes.jeune.lecons` = 30) : le temps ne le fait plus grandir, chaque leçon donnée vaut 1 point de `stage_progress`, ou `lecons.pointSiBesoinEnManque` (½) si une caractéristique `affecteCroissance` était hors zone au moment de la leçon (le soin oublié est le malus). Il ne perd jamais ses points. À 30 points, il passe Adulte.

### Mode Dodo (Bébé, Jeune, Adulte)

Le dragon suit un rythme veille/sommeil propre à chaque étape (`dodo.etapes`) : un bébé dort plus qu'un adulte. Les durées sont choisies pour que **le coucher du soir (vers 20h) cale la journée** : le dragon est fatigué avant (Bébé 18h, Jeune et Adulte 19h s'il s'est levé à son heure) et ne s'endort seul qu'après, puis se réveille à heure stable (Bébé 8h, Jeune 7h, Adulte 6h). Sans coucher par la joueuse, le cycle dure 25 à 26h et se décale d'une à deux heures par jour.

- Après `eveilHeures` passées éveillé (comptées depuis son dernier réveil, ou l'éclosion), il est **fatigué** : le message `dodo.fatigue` s'affiche (GIF « fatigué » pour le Bébé) et le bouton "Dodo" devient utilisable. Avant, impossible de le coucher.
- Si le joueur ne le couche pas, il s'endort seul après `endormissementHeures` (3h) de fatigue — sans avoir été préparé.
- Il se réveille seul après `sommeilHeures`. Le joueur peut le réveiller plus tôt (bouton "Réveil"), mais pas avant `dodo.dureeMinHeures` (4h) de sommeil — un réveil demandé plus tôt est refusé (`dodo.refusReveil`).

- **Jouer et apprendre le fatiguent** (`dodo.fatigueParAction`, en heures) : chaque partie ou leçon avance son heure de fatigue d'autant, sans dépasser l'instant présent (une action le rend fatigué, jamais endormi d'un coup). Beaucoup jouer le soir le fait donc s'endormir plus tôt, avant d'être préparé.
- **Fatigué, il ne peut plus apprendre** (`dodo.bloqueSiFatigue`) : les leçons se donnent dans la journée. Jouer reste possible, sinon un dragon triste et fatigué ne pourrait plus manger.
- Pendant le sommeil, les pertes (`variationParHeure` négatives) sont multipliées par `dodo.multiplicateurPerte` (0.5) ; la règle de progression continue de s'appliquer normalement.
- Toutes les actions sont bloquées tant qu'il dort : il faut le préparer avant de le coucher.
- Pendant le sommeil, l'écran du tamagotchi s'assombrit et le dragon n'est plus visible : seuls restent son nom et l'heure de son réveil naturel.
- Le rythme est rejoué heure par heure avec le reste du moteur : un réveil ou un endormissement survenu en l'absence du joueur a lieu à l'heure exacte, et change les multiplicateurs dès cette heure-là.

### Pensées du dragon

Le dragon s'adresse à la joueuse (une petite fille) sur le second écran de la coque (écran de dialogue, taille fixe : trois lignes sur mobile, quatre sur ordinateur), en la tutoyant, sur un ton tendre — varié selon l'archétype à l'âge adulte. Tout accord qui la concerne est au féminin ; le dragon, lui, reste masculin. Son langage grandit avec lui : sensations dans l'œuf, babillage du Bébé, phrases courtes du Jeune, phrases complètes de l'Adulte.

- Les phrases sont pré-écrites dans `config/phrases.json` (objectif : 1000), par étape : `etats` (content + chaque humeur), `soins` (réaction à une action réussie), `reves` (rêves pré-écrits, dits pendant le Dodo), `moments` (premier mot après l'éclosion, premier mot après un passage d'étape `grandir`, réveil) et, pour l'Adulte, une voix par archétype.
- La catégorie se déduit uniquement des états qualitatifs envoyés au client (`humeurs`, état du feu, fatigue, sommeil), l'état le plus urgent selon `priorite`. Aucune valeur brute n'est nécessaire.
- Quand la tristesse bloque « Nourrir » alors qu'il a faim, l'état `tristeFaim` passe avant tout : il explique qu'il est trop triste pour manger et demande à jouer, au lieu de réclamer un repas au bouton grisé.
- À l'Adulte, sans besoin urgent, une pensée sur trois (`partArchetype`) est tirée de la voix de son archétype (`etapes.adulte.archetypes`, 25 phrases par archétype) : l'archétype est désormais envoyé au client (`archetype`), sans être encore affiché en clair.
- Une pensée s'affiche au chargement, après chaque soin réussi et toutes les `intervalleSecondes` (30 s). Les `antiRepetition` dernières phrases vues sur l'appareil sont écartées tant qu'il en reste d'autres.

### Étape 1 — Œuf ✅ (validé)

- Caractéristique active : `feu` uniquement.
- Bouton "Ajouter du bois", indicateur qualitatif permanent (🥶 trop froid / 🪵 frais / 🔥 parfait / 🥵 trop chaud), aucune valeur brute affichée. « Frais » (`anticipation`, sous 60) est encore dans la bonne zone : c'est le signal qu'on peut ajouter du bois sans risque, un pas de bois (20) depuis moins de 60 restant sous 80. Rempli ainsi, le feu tient au moins 10h éveillé (une journée d'école). Les illustrations de « frais » sont celles de « parfait ».
- Durée : `etapes.oeuf.dureeHeures` = 72h.
- Jauge de progression : l'œuf se fissure au fil de `stage_progress`, découpé en `etapes.oeuf.paliers` paliers égaux (6 : intact, puis 5 stades de fissures, soit un nouveau stade toutes les 12h de progression). Seul le numéro de palier est envoyé au client.

### Étape 2 — Bébé ✅ (validé)

- Caractéristiques actives : `feu` (inchangé), `nourriture`, `hygiene`.
- **Nourriture** (`hunger`) : bouton "Nourrir", indicateur ponctuel positif ("Il a assez mangé !", disparaît après `dureeSecondes`). Hors zone, le bébé est illustré affamé (bulle avec un morceau de viande), sans message.
- **Hygiène** (`clean`) : bouton "Laver", indicateur persistant négatif ("Il est très sale !", reste affiché tant que hors zone).
- Durée : `etapes.bebe.dureeHeures` = 168h (7 jours).

### Étape 3 — Jeune dragon ✅ (validé)

- Caractéristiques actives : `feu`, `nourriture`, `hygiene` (inchangées) + `joie`, `apprentissage`.
- **Joie** (`joy`) : baisse lentement d'elle-même (il s'ennuie), "Jouer" l'augmente, "Éduquer" la diminue. Hors zone (triste) → "Jouer" devient moins efficace (`multiplicateurActionSiMauvais`) **et** "Nourrir" est complètement bloqué (`bloque.nourrir = "siMauvais"`).
- **Apprentissage** (`learning`) : baisse lentement d'elle-même (il oublie), "Éduquer" l'augmente. Sous `seuilMin` (40), il a envie d'apprendre (humeur `envieApprendre`, visible dans ses pensées). N'affecte pas la croissance (`affecteCroissance: false`). Active au Jeune seulement : l'Adulte ne prend plus de leçons (plus de bouton « Éduquer », ni d'envie d'apprendre), il part en quête. Ses talents restent ; côté joie, « éduquer » est `secondaire` pour ne pas rouvrir le bouton.
- **Énergie** : retirée. Une jauge cachée qui ne descendait jamais sous 35 ; c'est la fatigue du Dodo qui en tient lieu (« Jouer et apprendre le fatiguent », section 4).
- **Leçons** : « Éduquer » propose trois leçons (`lecons.types`) : ⚽ Sport, 📖 Lecture, 🎵 Musique. Même effet immédiat pour les trois (apprentissage +20, joie −15, fatigue) ; chaque leçon est comptée par type dans `lecons`, base du talent de l'Adulte (Sport → cracheur de feu, Lecture → sage, Musique → épanoui et musicien), qui façonnera aussi son attitude pendant la croissance (phase suivante).
- **Croissance** : 30 leçons (`etapes.jeune.lecons`), ½ leçon si un besoin est en manque (voir « Règle de progression commune »).
- **Compteur** : « 🎓 12,5/30 » à droite du nom, sur l'écran du dragon (`croissance` envoyé au client, Jeune seulement).
- **Talents** : chaque voie a trois paliers, atteints à 3, 8 et 15 leçons du même type (`lecons.paliers`), envoyés au client dans `talents` (Jeune et Adulte). Toutes les 12 s, au repos, une voie est tirée au sort parmi celles qui ont un palier, d'autant plus souvent qu'elle a reçu de leçons, et son effet est joué une fois à côté du dragon (`public/illustrations/talent-<voie>-<palier>.gif`, effets PixelLab posés sur des repères de la tête, identiques dans tous les dessins d'une étape) :

  | Voie | Palier 1 | Palier 2 | Palier 3 |
  |---|---|---|---|
  | ⚽ Sport | bouffée de fumée | flammèche et grosse fumée | vraie flamme |
  | 📖 Lecture | « ? » et ampoule éteinte | ampoule qui s'allume | ampoule et étoiles |
  | 🎵 Musique | une note (+ il fredonne) | plusieurs notes | notes colorées et cœur |

  Ses pensées suivent (`phrases.json`, `etapes.<étape>.talents`, une liste par palier, cumulées) : une fois sur trois sans besoin urgent (`partTalent`). Après une leçon, il joue l'animation de la leçon (`<étape>-sport`, `<étape>-lecture`, `<étape>-musique` : ballon, livre, flûte ; l'amour à défaut) et réagit selon la leçon (`etapes.<étape>.lecons`).
- **Rythme** : « Éduquer » est grisé tant que l'apprentissage est à 80 ou plus (`bloque.eduquer.siAuDessus`). Il baisse de 3 par heure (de moitié en dormant) : environ 2 leçons par jour d'école, 4 à 5 le mercredi et le week-end, soit au moins 10 jours pour une joueuse très assidue.
- Au passage à Adulte : les scores de rapidité des 5 traits sont figés dans `adult_stats` et l'archétype est calculé (voir « Détermination de l'archétype » ci-dessous).

### Étape 4 — Dragon adulte ✅ (validé)

- `adult_stats` contient les scores de rapidité figés au passage à l'âge adulte.
- Au passage à Adulte, une **carte d'identité** s'ouvre : nom du dragon, archétype et sa description (`personnalite.descriptions`). Un bouton "Carte" permet de la rouvrir.
- `feu`, `nourriture`, `hygiene` restent actives (`etapesActives` les inclut) mais sans enjeu de croissance puisqu'il n'y a plus de `stage_progress` à faire avancer à ce stade — entretien léger/cosmétique. Son activité est la **quête** (« Étape 4 bis » ci-dessous, à valider).

#### Détermination de l'archétype (`personality`)

Le caractère reflète **la rapidité avec laquelle la joueuse a comblé chaque besoin**, pendant toute la croissance (Bébé et Jeune, `personnalite.suivi.etapes` ; l'œuf ne compte pas, ses nuits froides étant inévitables).

1. **Besoin** : un trait (`feu`, `nourriture`, `hygiene`, `joie`, `apprentissage`) sort de sa bonne zone. Pour le feu, les deux sens comptent : trop de bois ouvre un besoin « trop chaud ».
2. **Comblé** seulement quand la jauge revient en bonne zone (un soin insuffisant ne ferme pas le besoin).
3. **Note du besoin** : 100 s'il est comblé en `delaiParfaitHeures` (1h) ou moins, puis divisée par deux toutes les `demiVieHeures` (3h) : 50 à 4h, 25 à 7h... Seules les **heures éveillé** comptent : pendant le sommeil, elle ne peut rien faire.
4. **Besoin prévenu** : un soin donné quand le besoin approche (jauge encore en bonne zone mais sous son seuil d'`anticipation`, signalé par le dragon) compte comme un besoin comblé avec `notePrevention` (100). Un soin donné jauge déjà haute, ou répété, ne compte pas. Ainsi, prévenir vaut mieux que réagir, et chaque trait peut s'anticiper autant que les autres.
5. **Score du trait** (0 à 100) : moyenne des notes, besoin encore ouvert compris, avec `poidsNeutre` note(s) fictive(s) à `noteNeutre` (50). Un trait presque jamais en manque reste vers 50 : les jauges faciles à tenir ne gagnent pas d'office.
6. Au passage à Adulte, les scores sont figés dans `adult_stats` ; on retient le meilleur et ceux à `margeEgalite` (5 points) ou moins : **1 trait** → archétype de base ; **2 traits** → hybride ; **3 ou plus** → deux tirés au hasard parmi eux, puis hybride. Les clés d'hybrides suivent `ordrePriorite`.

Le suivi est tenu dans la colonne `besoins` par le moteur (tick horaire et chaque soin).

**Archétypes de base** (trait dominant) :

| Trait | Archétype |
|---|---|
| feu | Ardent |
| nourriture | Gourmand |
| hygiene | Coquet |
| joie | Farceur |
| apprentissage | Érudit |

**Archétypes hybrides** (2 traits à égalité) :

| Combo | Archétype |
|---|---|
| feu + nourriture | Vorace |
| feu + hygiene | Flamboyant |
| feu + joie | Fantasque |
| feu + apprentissage | Visionnaire |
| nourriture + hygiene | Méticuleux |
| nourriture + joie | Bon Vivant |
| nourriture + apprentissage | Épicurien |
| hygiene + joie | Charmeur |
| hygiene + apprentissage | Perfectionniste |
| joie + apprentissage | Curieux |

### Étape 4 bis — La quête de l'Adulte (spec à valider)

À l'âge adulte, on ne l'élève plus : on l'accompagne. Il part sur une longue quête, à la façon d'un livre dont on est le héros. Ce qu'il est devenu enfant (talents et archétype) décide des actions qu'il peut tenter. Les « tours » du backlog disparaissent : ce sont ces actions.

**Déroulé**

- Bouton **🧭 Aventure** (Adulte seulement). Il ouvre la page de l'étape en cours, comme la carte d'identité : un emoji de lieu (🌲 🏔️ 🌊 🏰…), une courte scène, puis la question « Que doit faire Coco ? » et 2 ou 3 choix.
- Après un choix : une ou deux phrases de résultat, puis « Continuer ». Le dragon réagit sur le second écran (`phrases.json`, `etapes.adulte.soins.quete`).
- Les choix portent une icône : ⚽ 📖 🎵 pour un talent, 🐉 pour son caractère, ✨ pour un souvenir du voyage (drapeau).
- Pendant ce temps, l'écran principal joue une seule animation générique : l'Adulte qui marche avec son baluchon (`adulte-quete`). Aucune illustration par scène.

**Ce que l'enfance lui apporte**

- **Talents** : un choix peut demander une voie et un palier (⚽ grimper, courir, souffler du feu ; 📖 lire une carte, résoudre une énigme ; 🎵 apaiser, faire chanter une porte). Plus le palier est haut, plus l'action est belle.
- **Archétype** : un choix peut demander un trait (`feu`, `nourriture`, `hygiene`, `joie`, `apprentissage`). Un archétype a le trait de son nom, un hybride a les deux : Vorace (feu + nourriture) a les choix « feu » et les choix « nourriture ». On écrit ainsi 5 variantes au lieu de 15.
- Un choix de **talent** pas encore assez travaillé reste visible mais grisé, avec la raison : « Il n'a pas fait assez de musique… ». Elle comprend que son enfance compte.
- Un choix de **trait** ou de **drapeau** n'apparaît que si le dragon l'a : son caractère et son histoire ne sont pas des manques, ce sont des surprises.
- Chaque étape garde **au moins un choix sans condition** : on n'est jamais bloqué. Et autant que possible **deux** : une étape où il n'y a qu'un bouton à presser n'est pas un choix.
- Les **énigmes** ont plusieurs réponses ; une mauvaise donne un indice et disparaît (`sansDrapeau`), si bien qu'on trouve toujours au bout de quelques essais.
- Le **trésor du baluchon** (ballon, livre, flûte ou gâteau) revient plusieurs fois en chemin, et jusque chez les Anciens.

**Règles d'écriture**

- **Jamais d'échec ni de peur.** Un choix moins adapté mène à un détour (un autre chemin, une autre rencontre), jamais à « tu as perdu ». Les obstacles sont des énigmes, des passages, quelqu'un à aider ou à consoler.
- **Des embranchements qui se rejoignent** : chaque chapitre se divise puis se referme. Le jeu retient certains choix (**drapeaux** : un ami rencontré, un objet trouvé) et les fait revenir plus tard, ce qui ouvre parfois un choix de plus.
- Narration au présent, à la troisième personne, avec le prénom du dragon. Deux à quatre phrases par scène (environ 280 caractères au plus). Vocabulaire simple mais riche : elle est maligne. Les rares phrases qui s'adressent à elle sont au féminin.

**Carnet de voyage**

Il garde les amis, les objets et les lieux découverts, et les titres des quêtes terminées. On l'ouvre depuis la carte d'identité. C'est le « portrait du parcours » du backlog.

**Rythme**

- Une étape de quête fatigue le dragon et lui creuse l'appétit (`quete.cout`) : feu −3, nourriture −5, hygiène −4, joie +5, et une demi-heure de fatigue du Dodo (`dodo.fatigueParAction.quete`).
- Il ne repart pas s'il dort, s'il est fatigué ou si un besoin est en manque : « Coco a besoin de toi avant de repartir. » Les soins retrouvent un enjeu.
- Au plus **6 étapes par jour** (`quete.etapesParJour`), comptées sur le jour de la joueuse (`quete.fuseauHoraire`) : de quoi avancer franchement en une visite, sans tout dévorer d'un coup.
- Messages de la page d'aventure : `quete.messages`.
- Ordre de grandeur mesuré (simulation de 10 000 parties, `pnpm simuler-quete`) : environ **72 étapes**, soit **12 à 13 jours de jeu** à 6 étapes par jour ; trois semaines environ si elle joue un jour sur deux.

**Fin et suites**

- Le dernier choix de la quête (`suite: "fin"`) la termine. Le dragon reçoit un **titre** selon sa voie (⚽ « Gardien des Flammes » 🔥, 📖 « Sage des Étoiles » ✨, 🎵 « Chanteur des Vents » 🎵), puis la page d'aventure affiche le titre et un court épilogue, avec une fanfare. Le titre s'inscrit sous l'archétype sur la carte d'identité, et dans le carnet (« Ses titres »).
- **La voie du titre** additionne ses leçons de Jeune et les choix de talent joués pendant la quête (`quete.titre` : poids 1 et 1). Égalité : les leçons départagent, puis les choix de quête. Mesuré sur 10 000 parties : le titre est celui de sa voie préférée enfant 9 fois sur 10, ce qu'elle a joué pendant le voyage compte aussi, et les trois titres sortent à peu près aussi souvent. Compter seulement la quête donnait un titre étranger à son enfance 3 fois sur 10 ; seulement l'enfance rendait les choix de la quête sans effet.
- Titres, épilogues et conclusion sont dans le fichier de quête (`fin`) : chaque add-on peut avoir les siens.
- Les quêtes sont des fichiers à part, `config/quetes/<id>.json`, jouées dans l'ordre de `quete.ordre`. Ajouter une quête (un « add-on ») revient à ajouter un fichier. Quand il n'y en a plus, il se repose en attendant la prochaine aventure.

**Première quête : le voyage initiatique** (`voyage-initiatique`, synopsis à valider)

Chaque jeune dragon doit un jour monter jusqu'au **Nid des Anciens**, au sommet du monde, pour y trouver sa vraie place. C'est le tour de Coco.

| # | Chapitre | L'enjeu |
|---|---|---|
| 1 | Le départ | Préparer son baluchon (l'objet emporté resservira), dire au revoir. |
| 2 | La forêt qui chuchote | Trouver son chemin ; un petit renard perdu devient son ami. |
| 3 | La rivière aux galets | Traverser : sauter (⚽), lire les marques du passeur (📖) ou appeler la tortue en chantant (🎵). |
| 4 | Le village des lucioles | Les lucioles ont perdu leur lumière : son feu peut les aider. |
| 5 | Les collines du vent | Apprendre à planer, un cerf-volant à rattraper. |
| 6 | La bibliothèque sous la colline | Un vieux hibou et ses énigmes. |
| 7 | Le marché des nuages | Échanger, partager, se faire beau : les archétypes brillent. |
| 8 | La montagne enneigée | Le froid : rallumer un abri, aider un ours blanc grognon. |
| 9 | Le pont des étoiles | Une traversée de nuit, guidée par les constellations et la musique. |
| 10 | Le Nid des Anciens | Il raconte son voyage (le carnet), et les Anciens lui donnent son titre. |

Données : colonne `quete` (section 3). Route : `POST /api/dragon/quest` (section 6). Config : `quete` dans `config/game.json` (rythme) et `config/quetes/` (histoires). Code : `src/lib/quete.js`, page `src/app/Aventure.js`.

**Format d'une quête** (`config/quetes/<id>.json`) : `debut` (première scène), `chapitres` (titres), `fin` (`titres` par voie avec `titre`, `icone`, `epilogue`, et une `conclusion` commune), `scenes`. Une scène a `chapitre`, `lieu` (emoji), `texte` (`{nom}` devient le prénom), `carnet` (inscrit à l'arrivée) et `choix`. Un choix a `texte`, `resultat`, `suite` (scène suivante), et au besoin `condition` (`{ talent, palier }`, `{ trait }`, `{ drapeau }`, ou `{ sansDrapeau }` qui retire le choix une fois le drapeau posé), `drapeaux` et `carnet`. Une `suite` pas encore écrite affiche « La suite de l'aventure arrive bientôt… » : on peut publier un chapitre à la fois.

**Vérifier une quête** : `pnpm simuler-quete [parties]` joue des milliers de parties (dragons de tous archétypes, 30 leçons réparties au hasard, trois façons de choisir) et signale les parties bloquées, les étapes à un seul choix, les souvenirs qui ne reviennent jamais, les choix jamais affichés et la répartition des titres. Code : `scripts/quete/`.

### Sons

Petits sons façon tamagotchi, générés par le navigateur (Web Audio, onde carrée, volume bas) : aucun fichier à charger. Code : `src/lib/sons.js`.

- Un **bip** à chaque appui sur un bouton de la coque (c'est aussi le geste qui autorise le son sur iPhone).
- Quand le serveur accepte l'action : un arpège pour un soin, une petite mélodie pour une leçon de sport ou de lecture, une **ritournelle pour la leçon de musique**, une berceuse au coucher, un air montant au réveil. Une **fanfare** à l'éclosion et à chaque passage d'étape (la 30e leçon comprise).
- Un son grave quand l'action est refusée.
- **🔊 / 🔇** à droite du titre de la coque coupe ou remet le son ; le réglage est retenu sur l'appareil (`localStorage`). Sur iPhone, le bouton silencieux du téléphone coupe aussi ces sons.

### Petit mot du jour (notifications)

Une seule notification par jour, après l'école, pour garder le rituel sans rendre accro. Mise en route : [`docs/notifications.md`](docs/notifications.md).

- Le cron Vercel appelle `GET /api/notifications/envoi` à 16 h UTC, soit **17 h au Maroc** (16 h pendant le Ramadan, où le pays repasse en UTC+0). En offre gratuite, Vercel peut le déclencher n'importe quand dans l'heure.
- **Silence** si elle s'est occupée du dragon dans les `silenceSiActiviteHeures` (3 h) précédentes (`derniere_activite` : soin, leçon, nom, coucher ou réveil) : le petit mot rappelle, il n'insiste pas.
- Le message dépend de l'état du dragon : œuf, pas encore de prénom, endormi, un besoin (faim, froid, fatigue, tristesse, saleté, dans cet ordre), ou content. Il utilise le prénom qu'elle lui a donné. Le ton est toujours une invitation tendre, jamais un reproche ni une alerte.
- La phrase tourne avec le jour : jamais la même deux jours de suite pour un même état, sans rien mémoriser. Phrases et réglages : `config/notifications.json`.
- L'abonnement se fait sous la coque (« Recevoir un petit mot chaque jour »), sur chaque appareil voulu. Sur iPhone et iPad, il faut d'abord ajouter l'appli à l'écran d'accueil (iOS 16.4+) ; le bouton l'explique.

## 6. API (routes ou Server Actions, au choix)

| Route | Effet |
|---|---|
| `GET /api/dragon` | Récupère l'état, applique la décroissance/progression temporelle avant de renvoyer |
| `POST /api/dragon/add-wood` | Ajoute du bois au feu (étape Œuf) |
| `POST /api/dragon/feed` | Nourrir (étape Bébé+, bloqué si triste à partir du Jeune) |
| `POST /api/dragon/wash` | Laver (étape Bébé+) |
| `POST /api/dragon/play` | Jouer — augmente la joie, le fatigue (étape Jeune+) |
| `POST /api/dragon/educate` | `{ lecon: "sport" \| "lecture" \| "musique" }` — une leçon : augmente l'apprentissage, baisse la joie, le fatigue, fait grandir le Jeune ; refusée s'il est fatigué ou n'a pas envie d'apprendre (étape Jeune+) |
| `POST /api/dragon/sleep` | Coucher le dragon (mode Dodo, étape Bébé+) |
| `POST /api/dragon/wake` | Réveiller le dragon, refusé avant la durée minimale de sommeil |
| `POST /api/notifications` | Abonne l'appareil au petit mot quotidien (corps : abonnement push du navigateur) ; `DELETE` `{ endpoint }` le désabonne |
| `GET /api/notifications/envoi` | Cron Vercel (secret `CRON_SECRET`) : envoie le petit mot du jour ; `?forcer=1` ignore l'activité récente, pour tester |
| `POST /api/dragon/quest` | `{ choix }` — joue un choix de l'étape de quête en cours (Adulte) ; refusé s'il dort, est fatigué, a un besoin en manque ou a atteint `quete.etapesParJour` |
| `POST /api/dragon/name` | `{ name }` — nommer le dragon après éclosion |
| `POST /api/dragon/reset` | Optionnel, pratique pour les tests |

Avec l'App Router, des **Server Actions** directement dans les composants peuvent remplacer ces routes si plus simple. Dans les deux cas : un client Supabase créé côté serveur avec la clé `service_role` (jamais côté client), qui lit/écrit la ligne `dragon`.

## 7. Illustrations nécessaires (pour le dessinateur)

- Œuf : un état de base + une variante visuelle par indicateur de température (🥶 trop froid / 🔥 parfait / 🥵 trop chaud) et par stade de fissures (jauge de progression de l'étape, section 5)
- Bébé, Jeune, Adulte : repos, content, faim, fatigue, triste, fâché (bleu si froid, rouge si trop chaud), amour (après un bain, un jeu ou une leçon), surprise (quand un soin comble un besoin en manque ou le froid)
- Soins et tours : Bébé, Jeune et Adulte qui mangent, se réchauffent et se lavent, Jeune qui fait du sport, lit et joue de la musique (leçons), et Adulte qui joue au ballon (`adulte-joue`, à la place de l'amour après une partie), livrés ; cracher du feu (flamme de plus en plus grosse) — à faire
- Quête : l'Adulte qui marche avec son baluchon (`adulte-quete`), animation générique en boucle, jouée tant que la page d'aventure est ouverte et qu'il peut repartir — livrée

## 8. Roadmap

**Phase 0 — Setup**
Projet Next.js, projet Supabase (exécuter le SQL de la section 3, récupérer `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`), fichier `config/game.json` (section 4), layout de base, déploiement Vercel connecté dès le départ.

**Phase 1 — Moteur générique des caractéristiques**
Grâce à la structure modulaire de la config, une seule fonction peut gérer *toutes* les caractéristiques plutôt que du code dupliqué par soin : appliquer `variationParHeure` depuis `last_seen`, appliquer l'effet d'une `action` (avec `multiplicateurActionSiMauvais` le cas échéant), vérifier les `bloque`, et calculer si `stage_progress` avance à vitesse normale ou ralentie (règle commune, section 5). Cette fonction est le cœur du projet — tout le reste vient s'y brancher.

**Phase 2 — Étape Œuf**
Brancher `feu` sur le moteur générique, route `POST /api/dragon/add-wood`, route `GET /api/dragon`, éclosion vers Bébé. Tester avec un visuel simple en attendant les illustrations.

**Phase 3 — Étape Bébé**
Brancher `nourriture`/`hygiene`, routes `feed`/`wash`, indicateurs ponctuel/persistant (section 4). Transition vers Jeune.

**Phase 4 — Étape Jeune**
Brancher `joie`/`apprentissage`/`energie`, routes `play`/`educate`, blocages croisés (triste → nourrir bloqué, énergie vide → jouer/éduquer bloqués). Transition vers Adulte + instantané `adult_stats` + calcul de l'archétype (`personality`, règles section 5).

**Phase 5 — Intégration des illustrations**
Remplacer les visuels placeholder par les images du dessinateur, au fur et à mesure que chaque étape est prête (pas besoin d'attendre la fin du projet).

**Phase 6 — Finitions**
Transitions/animations, modale de nom, confirmation de reset, responsive mobile.

**Phase 6 bis — Second écran : ce que dit le dragon** ✅
Ajouter sur la coque un deuxième petit écran, de taille fixe, dédié aux paroles du dragon (section 5, « Pensées du dragon ») : les paroles quittent l'écran principal, qui garde le dragon, l'état du feu et les alertes. Taille fixe pour que rien ne saute d'une phrase à l'autre : prévue pour le texte le plus long, soit 81 caractères dans la banque (`config/phrases.json`), en même police pixel, lisible sur mobile. Il s'éteint avec l'écran principal pendant le Dodo, tout en continuant d'afficher ses rêves. (Les rêves générés par une IA sur un homelab ont été retirés, avec leur journal.)

**Phase 6 ter — Petit mot du jour** ✅
Appli installable (manifeste, icônes, service worker) et une notification quotidienne après l'école (section 5, « Petit mot du jour »).

**Phase 7 — La quête de l'Adulte** (section 5, « Étape 4 bis »)
- 7a : moteur de quête (étapes, choix, conditions de talent et de trait, drapeaux, rythme), route `quest`, page d'aventure, carnet de voyage, avec le chapitre 1 écrit pour tester.
- 7b : l'animation `adulte-quete` — livrée.
- 7c : écriture des chapitres 2 à 10 (82 scènes), éprouvés par 10 000 parties simulées — à relire.
- 7d : fin, titres et épilogues — livrée.

**Phase 8 — Déploiement final**
Variables d'environnement en prod, test complet sur mobile avant de l'offrir.

## 9. Notes

- Garder l'esprit "jamais de mort" de l'animal virtuel — c'est un cadeau, pas un jeu punitif.
- Toutes les constantes numériques passent par la config (section 4), jamais en dur dans le code.

## 10. À spécifier plus tard (backlog)

- **Nouvelles quêtes** (add-ons) après le voyage initiatique.
- Les tours et le portrait du parcours sont repris par la quête et son carnet de voyage (section 5, « Étape 4 bis »).
