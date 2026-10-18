# Dragon Tamagotchi — Spec & Roadmap (Next.js)

## 1. Concept

Animal virtuel en forme de dragon, cadeau d'anniversaire. L'œuf éclot, on s'occupe du dragon pour le faire grandir en plusieurs stades, et on lui apprend des tours. Le dragon ne "meurt" jamais — au pire il est mal en point, jamais perdu.

Illustrations : fournies par un dessinateur (pas de génération IA). Un seul projet Next.js (front + API).

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
  stage_progress      numeric not null default 0,    -- heures de progression cumulées vers l'étape suivante (remise à 0 à chaque avancement)
  hunger              numeric not null default 100,  -- nourriture, active à partir de l'étape Bébé
  clean               numeric not null default 100,  -- hygiène, active à partir de l'étape Bébé
  joy                 numeric not null default 100,  -- joie, active à partir de l'étape Jeune
  learning            numeric not null default 0,    -- apprentissage, actif à partir de l'étape Jeune
  energy              numeric not null default 100,  -- énergie, active à partir de l'étape Jeune
  adult_stats         jsonb,                          -- scores de rapidité {feu, nourriture, hygiene, joie, apprentissage} figés au passage à Adulte
  personality         text,                           -- archétype dérivé de adult_stats (section 5)
  besoins             jsonb not null default '{}',    -- suivi des besoins pendant la croissance, par trait : {notes, nombre, ouvert}
  tricks_learned      jsonb not null default '[]',
  available_tricks    jsonb not null default '[]',
  training_progress   jsonb not null default '{}',
  sleeping_since      timestamptz,                    -- heure du coucher (mode Dodo), null = éveillé
  awake_since         timestamptz not null default now(), -- heure du dernier réveil (ou de l'éclosion), base de la fatigue
  last_seen           timestamptz not null default now(),
  last_trick_refresh  timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

alter table dragon enable row level security;

-- Mémoire de la journée (soins, coucher, réveil, passages d'étape), lue pour contextualiser les rêves
create table journal (
  id          bigint generated always as identity primary key,
  type        text not null,                  -- soin | coucher | reveil | etape
  detail      text,                           -- nom de l'action ou de l'étape
  created_at  timestamptz not null default now()
);
alter table journal enable row level security;

-- Rêves générés par l'IA du homelab, un valide au plus par nuit (rejets conservés pour ajuster le prompt)
create table pensees_ia (
  id             bigint generated always as identity primary key,
  sommeil_debut  timestamptz not null,        -- sleeping_since de la nuit concernée
  pendant        text,                        -- fragment affiché pendant le sommeil
  reveil         text,                        -- récit fait une fois au réveil
  rejet          text,                        -- raison du rejet par les garde-fous, null = valide
  brut           text,                        -- réponse brute du modèle
  modele         text,
  raconte        boolean not null default false,
  created_at     timestamptz not null default now()
);
alter table pensees_ia enable row level security;
```

## 4. Configuration (constantes ajustables)

Toutes les valeurs numériques du jeu vivent dans une **config centralisée**, jamais en dur dans le code. Structure modulaire : chaque **caractéristique** (feu, nourriture, hygiène, joie, apprentissage, énergie) est une unité autonome et auto-descriptive — elle porte ses propres seuils, son effet par action, si elle influence la croissance, et à quelles étapes elle est active. Les étapes elles-mêmes ne contiennent plus que leur durée.

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
      "actions": { "ajouterBois": { "effet": 20 } },
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
      "actions": { "jouer": { "effet": 25 }, "eduquer": { "effet": -15 } },
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
      "variationParHeure": -1,
      "anticipation": { "seuil": 70, "humeur": "curiosite" },
      "actions": { "eduquer": { "effet": 20 } },
      "affecteCroissance": false,
      "etapesActives": ["jeune", "adulte"],
      "humeurSiMauvais": "envieApprendre"
    },
    "energie": {
      "champDb": "energy",
      "max": 100,
      "variationParHeure": 5,
      "actions": { "jouer": { "effet": -10 }, "eduquer": { "effet": -15 } },
      "affecteCroissance": false,
      "etapesActives": ["jeune", "adulte"],
      "bloque": { "jouer": "siVide", "eduquer": "siVide" }
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
    "jeune": { "dureeHeures": 336 }
  },
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
    "multiplicateurGain": 2,
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
| `variationParHeure` | évolution automatique par heure réelle : négatif = décroissance (feu, nourriture, hygiène), positif = régénération (énergie), 0/absent = pas de variation passive (joie, apprentissage) |
| `actions` | map nom d'action → effet par clic (positif ou négatif) |
| `multiplicateurActionSiMauvais` | réduit l'effet d'une action précise quand la jauge est hors de sa bonne zone (ex: "Jouer" moins efficace quand triste) |
| `affecteCroissance` | si `true`, doit être dans la bonne zone pour que `stage_progress` avance à vitesse normale |
| `etapesActives` | à quelles étapes cette caractéristique est active |
| `bloque` | actions bloquées quand hors zone (`"siMauvais"`) ou à 0 (`"siVide"`) |
| `indicateur` | ce qui est montré au joueur : `qualitatifPermanent` (feu, toujours visible), `ponctuel` (toast temporaire), `persistant` (reste affiché tant que vrai) |
| `humeurSiMauvais` | humeur illustrée (sans texte) tant que la jauge est hors de sa bonne zone (ex: `"faim"` → bulle avec le morceau de viande) |
| `anticipation` | `{ seuil, humeur }` : encore en bonne zone mais sous `seuil`, le besoin approche. Le dragon l'annonce dans ses pensées (humeur « bientôt » : `frais`, `petitCreux`, `gratte`, `ennui`, `curiosite`) et un soin donné à ce moment **prévient** le besoin (voir l'archétype). Pour le feu, c'est aussi l'état « frais » de l'indicateur |

`energie.affecteCroissance` est mis à `false` : son rôle est de bloquer les actions Jouer/Éduquer (via `bloque`), pas de ralentir directement la croissance — l'effet se répercute déjà indirectement (énergie vide → impossible de jouer → joie qui stagne). À confirmer si tu préfères qu'elle compte aussi en direct.

## 5. Règles du jeu, par étape de développement

### Règle de progression commune (toutes étapes)

À chaque heure réelle écoulée, pour l'étape en cours : si **toutes** les caractéristiques actives à cette étape avec `affecteCroissance: true` sont dans leur bonne zone → `stage_progress += 1h`. Sinon (au moins une hors zone) → `stage_progress += 1h × multiplicateurRalentissement`. Jamais bloqué complètement, juste plus long si négligé (cohérent avec "jamais de mort"). Quand `stage_progress >= etapes.<étape>.dureeHeures` → passage à l'étape suivante, `stage_progress` repart à 0.

### Mode Dodo (Bébé, Jeune, Adulte)

Le dragon suit un rythme veille/sommeil propre à chaque étape (`dodo.etapes`) : un bébé dort plus qu'un adulte. Les durées sont choisies pour que **le coucher du soir (vers 20h) cale la journée** : le dragon est fatigué avant (Bébé 18h, Jeune et Adulte 19h s'il s'est levé à son heure) et ne s'endort seul qu'après, puis se réveille à heure stable (Bébé 8h, Jeune 7h, Adulte 6h). Sans coucher par la joueuse, le cycle dure 25 à 26h et se décale d'une à deux heures par jour.

- Après `eveilHeures` passées éveillé (comptées depuis son dernier réveil, ou l'éclosion), il est **fatigué** : le message `dodo.fatigue` s'affiche (GIF « fatigué » pour le Bébé) et le bouton "Dodo" devient utilisable. Avant, impossible de le coucher.
- Si le joueur ne le couche pas, il s'endort seul après `endormissementHeures` (3h) de fatigue — sans avoir été préparé.
- Il se réveille seul après `sommeilHeures`. Le joueur peut le réveiller plus tôt (bouton "Réveil"), mais pas avant `dodo.dureeMinHeures` (4h) de sommeil — un réveil demandé plus tôt est refusé (`dodo.refusReveil`).

- Pendant le sommeil, les pertes (`variationParHeure` négatives) sont multipliées par `dodo.multiplicateurPerte` (0.5) et les gains (régénération de l'énergie) par `dodo.multiplicateurGain` (2) ; la règle de progression continue de s'appliquer normalement.
- Toutes les actions sont bloquées tant qu'il dort : il faut le préparer avant de le coucher.
- Pendant le sommeil, l'écran du tamagotchi s'assombrit et le dragon n'est plus visible : seuls restent son nom et l'heure de son réveil naturel.
- Le rythme est rejoué heure par heure avec le reste du moteur : un réveil ou un endormissement survenu en l'absence du joueur a lieu à l'heure exacte, et change les multiplicateurs dès cette heure-là.

### Pensées du dragon

Le dragon s'adresse à la joueuse (une petite fille) sur le second écran de la coque (écran de dialogue, taille fixe de six lignes), en la tutoyant, sur un ton tendre — varié selon l'archétype à l'âge adulte. Tout accord qui la concerne est au féminin ; le dragon, lui, reste masculin. Son langage grandit avec lui : sensations dans l'œuf, babillage du Bébé, phrases courtes du Jeune, phrases complètes de l'Adulte.

- Les phrases sont pré-écrites dans `config/phrases.json` (objectif : 1000), par étape : `etats` (content + chaque humeur), `soins` (réaction à une action réussie), `reves` (pendant le Dodo), `moments` (premier mot après l'éclosion, premier mot après un passage d'étape `grandir`, réveil) et, pour l'Adulte, une voix par archétype.
- La catégorie se déduit uniquement des états qualitatifs envoyés au client (`humeurs`, état du feu, fatigue, sommeil), l'état le plus urgent selon `priorite`. Aucune valeur brute n'est nécessaire.
- Quand la tristesse bloque « Nourrir » alors qu'il a faim, l'état `tristeFaim` passe avant tout : il explique qu'il est trop triste pour manger et demande à jouer, au lieu de réclamer un repas au bouton grisé.
- À l'Adulte, sans besoin urgent, une pensée sur trois (`partArchetype`) est tirée de la voix de son archétype (`etapes.adulte.archetypes`, 25 phrases par archétype) : l'archétype est désormais envoyé au client (`archetype`), sans être encore affiché en clair.
- Une pensée s'affiche au chargement, après chaque soin réussi et toutes les `intervalleSecondes` (30 s). Les `antiRepetition` dernières phrases vues sur l'appareil sont écartées tant qu'il en reste d'autres.

### Rêves générés par l'IA (homelab)

Une IA légère tournant sur un homelab (Ollama) écrit chaque nuit un rêve contextualisé. Installation et branchement : [`docs/homelab-ia.md`](docs/homelab-ia.md). **Le homelab n'est jamais exposé** : c'est lui qui interroge le jeu, avec le secret `IA_SECRET`.

1. `GET /api/ia/contexte` (toutes les ~30 min) : si le dragon dort et que la nuit n'a pas encore de rêve valide (au plus `tentativesMax` essais), renvoie la requête Ollama prête à l'emploi (`messages`, `format`, `options`) et `sommeilDebut` ; sinon `{ aGenerer: false }`.
2. Le homelab l'envoie à `POST /api/chat` d'Ollama en ajoutant seulement le nom du modèle.
3. `POST /api/ia/pensees` `{ sommeilDebut, modele, reponse }` : l'appli valide puis enregistre dans `pensees_ia` (422 si rejeté, 409 si la nuit est finie).

- Le contexte ne contient que le nom du dragon, son étape, son archétype, l'heure du coucher (et s'il s'est endormi seul), ses soins depuis son réveil (table `journal`), un thème tiré au hasard et ses derniers rêves (pour éviter les répétitions). Aucune donnée sur l'enfant.
- Prompt, thèmes, limites et mots interdits vivent dans `config/ia.json`. Les garde-fous du code vérifient le JSON, les longueurs, l'absence d'emoji et de mots interdits ; l'accord au féminin pour l'enfant repose sur le prompt et la relecture des rêves en base.
- Pendant le sommeil, l'écran de dialogue (éteint lui aussi) affiche `pendant` à la place des rêves de la banque ; après le réveil, `reveil` est raconté une seule fois (`raconte`). Sans rêve généré (homelab éteint), la banque prend le relais sans que rien ne casse.

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

- Caractéristiques actives : `feu`, `nourriture`, `hygiene` (inchangées) + `joie`, `apprentissage`, `energie`.
- **Joie** (`joy`) : baisse lentement d'elle-même (il s'ennuie), "Jouer" l'augmente, "Éduquer" la diminue. Hors zone (triste) → "Jouer" devient moins efficace (`multiplicateurActionSiMauvais`) **et** "Nourrir" est complètement bloqué (`bloque.nourrir = "siMauvais"`).
- **Apprentissage** (`learning`) : baisse lentement d'elle-même (il oublie), "Éduquer" l'augmente. Sous `seuilMin` (40), il a envie d'apprendre (humeur `envieApprendre`, visible dans ses pensées). N'affecte pas la croissance (`affecteCroissance: false`) — progression à part, base pour les tours plus tard.
- **Énergie** (`energy`) : "Jouer" et "Éduquer" en coûtent, régénération passive avec le temps. À 0 → "Jouer" et "Éduquer" bloqués (`bloque.jouer/eduquer = "siVide"`). N'affecte pas la croissance directement (voir note section 4).
- Durée : `etapes.jeune.dureeHeures` = 336h (14 jours), proposé par défaut — à confirmer.
- Au passage à Adulte : les scores de rapidité des 5 traits sont figés dans `adult_stats` et l'archétype est calculé (voir « Détermination de l'archétype » ci-dessous).

### Étape 4 — Dragon adulte ✅ (validé)

- `adult_stats` contient les scores de rapidité figés au passage à l'âge adulte.
- Au passage à Adulte, une **carte d'identité** s'ouvre : nom du dragon, archétype et sa description (`personnalite.descriptions`). Un bouton "Carte" permet de la rouvrir.
- `feu`, `nourriture`, `hygiene` restent actives (`etapesActives` les inclut) mais sans enjeu de croissance puisqu'il n'y a plus de `stage_progress` à faire avancer à ce stade — entretien léger/cosmétique. **Aucune autre activité à cette étape pour l'instant** (tours et carte d'identité/portrait : voir backlog section 10).

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

## 6. API (routes ou Server Actions, au choix)

| Route | Effet |
|---|---|
| `GET /api/dragon` | Récupère l'état, applique la décroissance/progression temporelle avant de renvoyer |
| `POST /api/dragon/add-wood` | Ajoute du bois au feu (étape Œuf) |
| `POST /api/dragon/feed` | Nourrir (étape Bébé+, bloqué si triste à partir du Jeune) |
| `POST /api/dragon/wash` | Laver (étape Bébé+) |
| `POST /api/dragon/play` | Jouer — augmente la joie, coûte de l'énergie (étape Jeune+) |
| `POST /api/dragon/educate` | Éduquer — augmente l'apprentissage, baisse la joie, coûte de l'énergie (étape Jeune+) |
| `POST /api/dragon/sleep` | Coucher le dragon (mode Dodo, étape Bébé+) |
| `POST /api/dragon/wake` | Réveiller le dragon, refusé avant la durée minimale de sommeil |
| `GET /api/ia/contexte` | Homelab (secret `IA_SECRET`) : requête Ollama du rêve à générer, s'il y en a un |
| `POST /api/ia/pensees` | Homelab (secret `IA_SECRET`) : `{ sommeilDebut, modele, reponse }` — rêve à valider et enregistrer |
| `POST /api/dragon/train` | `{ trickId }` — entraîner un tour *(à définir)* |
| `POST /api/dragon/name` | `{ name }` — nommer le dragon après éclosion |
| `POST /api/dragon/reset` | Optionnel, pratique pour les tests |

Avec l'App Router, des **Server Actions** directement dans les composants peuvent remplacer ces routes si plus simple. Dans les deux cas : un client Supabase créé côté serveur avec la clé `service_role` (jamais côté client), qui lit/écrit la ligne `dragon`.

## 7. Illustrations nécessaires (pour le dessinateur)

- Œuf : un état de base + une variante visuelle par indicateur de température (🥶 trop froid / 🔥 parfait / 🥵 trop chaud) et par stade de fissures (jauge de progression de l'étape, section 5)
- Bébé, Jeune, Adulte : détails à définir avec chaque étape
- Icônes par tour — à définir à l'étape correspondante

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
Ajouter sur la coque un deuxième petit écran, de taille fixe, dédié aux paroles du dragon (section 5, « Pensées du dragon ») : les paroles quittent l'écran principal, qui garde le dragon, l'état du feu et les alertes. Taille fixe pour que rien ne saute d'une phrase à l'autre : prévue pour le texte le plus long, soit 81 caractères dans la banque (`config/phrases.json`) et jusqu'à 160 pour le récit d'un rêve généré par l'IA (`config/ia.json`), en même police pixel, lisible sur mobile. Il s'éteint avec l'écran principal pendant le Dodo, tout en continuant d'afficher le rêve.

**Phase 7 — Fonctionnalités en attente de spec (backlog, section 10)**
Système de tours, activités Adulte additionnelles (carte d'identité/portrait) — à démarrer une fois ces specs détaillées.

**Phase 8 — Déploiement final**
Variables d'environnement en prod, test complet sur mobile avant de l'offrir.

## 9. Notes

- Garder l'esprit "jamais de mort" de l'animal virtuel — c'est un cadeau, pas un jeu punitif.
- Toutes les constantes numériques passent par la config (section 4), jamais en dur dans le code.

## 10. À spécifier plus tard (backlog)

- **Système de tours** : quels tours, comment on les débloque/enseigne, lien avec `learning` (l'apprentissage accumulé au Jeune devrait influencer ça) **et avec l'archétype** (`personality`, défini en section 5) — les tours accessibles à l'Adulte pourraient en dépendre. Route `POST /api/dragon/train` déjà réservée en section 6, en attente du détail.
- **Portrait Adulte** : la carte d'identité (archétype + description) existe ; reste à envisager un résumé illustré du parcours du dragon (`adult_stats`).
