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
  fire                numeric not null default 50,   -- jauge de chaleur, active à chaque étape
  stage_progress      numeric not null default 0,    -- heures de progression cumulées vers l'étape suivante (remise à 0 à chaque avancement)
  hunger              numeric not null default 100,  -- nourriture, active à partir de l'étape Bébé
  clean               numeric not null default 100,  -- hygiène, active à partir de l'étape Bébé
  joy                 numeric not null default 100,  -- joie, active à partir de l'étape Jeune
  learning            numeric not null default 0,    -- apprentissage, actif à partir de l'étape Jeune
  energy              numeric not null default 100,  -- énergie, active à partir de l'étape Jeune
  adult_stats         jsonb,                          -- instantané {fire, hunger, clean, joy, learning} au passage à Adulte
  personality         text,                           -- archétype dérivé de adult_stats (règles à définir)
  tricks_learned      jsonb not null default '[]',
  available_tricks    jsonb not null default '[]',
  training_progress   jsonb not null default '{}',
  last_seen           timestamptz not null default now(),
  last_trick_refresh  timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

alter table dragon enable row level security;
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
      "seuilMin": 40,
      "seuilMax": 70,
      "variationParHeure": -4,
      "actions": { "ajouterBois": { "effet": 20 } },
      "affecteCroissance": true,
      "etapesActives": ["oeuf", "bebe", "jeune", "adulte"],
      "indicateur": { "type": "qualitatifPermanent", "etats": ["froid", "parfait", "chaud"] }
    },
    "nourriture": {
      "champDb": "hunger",
      "max": 100,
      "seuilMin": 70,
      "variationParHeure": -5,
      "actions": { "nourrir": { "effet": 30 } },
      "affecteCroissance": true,
      "etapesActives": ["bebe", "jeune", "adulte"],
      "indicateur": { "type": "ponctuel", "declencheur": "bon", "dureeSecondes": 3, "message": "Il a assez mangé !" }
    },
    "hygiene": {
      "champDb": "clean",
      "max": 100,
      "seuilMin": 25,
      "variationParHeure": -4,
      "actions": { "laver": { "effet": 30 } },
      "affecteCroissance": true,
      "etapesActives": ["bebe", "jeune", "adulte"],
      "indicateur": { "type": "persistant", "declencheur": "mauvais", "message": "Il est très sale !" }
    },
    "joie": {
      "champDb": "joy",
      "max": 100,
      "seuilMin": 30,
      "variationParHeure": 0,
      "actions": { "jouer": { "effet": 25 }, "eduquer": { "effet": -15 } },
      "multiplicateurActionSiMauvais": { "jouer": 0.5 },
      "affecteCroissance": true,
      "etapesActives": ["jeune", "adulte"],
      "bloque": { "nourrir": "siMauvais" }
    },
    "apprentissage": {
      "champDb": "learning",
      "max": 100,
      "variationParHeure": 0,
      "actions": { "eduquer": { "effet": 20 } },
      "affecteCroissance": false,
      "etapesActives": ["jeune", "adulte"]
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
    "margeEgalite": 5,
    "ordrePriorite": ["feu", "nourriture", "hygiene", "joie", "apprentissage"]
  },
  "etapes": {
    "oeuf": { "dureeHeures": 72 },
    "bebe": { "dureeHeures": 168 },
    "jeune": { "dureeHeures": 336 }
  },
  "multiplicateurRalentissement": 0.5,
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

`energie.affecteCroissance` est mis à `false` : son rôle est de bloquer les actions Jouer/Éduquer (via `bloque`), pas de ralentir directement la croissance — l'effet se répercute déjà indirectement (énergie vide → impossible de jouer → joie qui stagne). À confirmer si tu préfères qu'elle compte aussi en direct.

## 5. Règles du jeu, par étape de développement

### Règle de progression commune (toutes étapes)

À chaque heure réelle écoulée, pour l'étape en cours : si **toutes** les caractéristiques actives à cette étape avec `affecteCroissance: true` sont dans leur bonne zone → `stage_progress += 1h`. Sinon (au moins une hors zone) → `stage_progress += 1h × multiplicateurRalentissement`. Jamais bloqué complètement, juste plus long si négligé (cohérent avec "jamais de mort"). Quand `stage_progress >= etapes.<étape>.dureeHeures` → passage à l'étape suivante, `stage_progress` repart à 0.

### Étape 1 — Œuf ✅ (validé)

- Caractéristique active : `feu` uniquement.
- Bouton "Ajouter du bois", indicateur qualitatif permanent (🥶 trop froid / 🔥 parfait / 🥵 trop chaud), aucune valeur brute affichée.
- Durée : `etapes.oeuf.dureeHeures` = 72h.

### Étape 2 — Bébé ✅ (validé)

- Caractéristiques actives : `feu` (inchangé), `nourriture`, `hygiene`.
- **Nourriture** (`hunger`) : bouton "Nourrir", indicateur ponctuel positif ("Il a assez mangé !", disparaît après `dureeSecondes`).
- **Hygiène** (`clean`) : bouton "Laver", indicateur persistant négatif ("Il est très sale !", reste affiché tant que hors zone).
- Durée : `etapes.bebe.dureeHeures` = 168h (7 jours).

### Étape 3 — Jeune dragon ✅ (validé)

- Caractéristiques actives : `feu`, `nourriture`, `hygiene` (inchangées) + `joie`, `apprentissage`, `energie`.
- **Joie** (`joy`) : "Jouer" l'augmente, "Éduquer" la diminue. Hors zone (triste) → "Jouer" devient moins efficace (`multiplicateurActionSiMauvais`) **et** "Nourrir" est complètement bloqué (`bloque.nourrir = "siMauvais"`).
- **Apprentissage** (`learning`) : "Éduquer" l'augmente. N'affecte pas la croissance (`affecteCroissance: false`) — progression à part, base pour les tours plus tard.
- **Énergie** (`energy`) : "Jouer" et "Éduquer" en coûtent, régénération passive avec le temps. À 0 → "Jouer" et "Éduquer" bloqués (`bloque.jouer/eduquer = "siVide"`). N'affecte pas la croissance directement (voir note section 4).
- Durée : `etapes.jeune.dureeHeures` = 336h (14 jours), proposé par défaut — à confirmer.
- Au passage à Adulte : instantané de `{ feu, nourriture, hygiene, joie, apprentissage }` dans `adult_stats` (énergie exclue, ce n'est pas un trait de personnalité). Ces valeurs deviennent les stats fixes du dragon adulte.

### Étape 4 — Dragon adulte ✅ (validé)

- `adult_stats` contient l'instantané figé des 5 caractéristiques au moment du passage à l'âge adulte.
- `feu`, `nourriture`, `hygiene` restent actives (`etapesActives` les inclut) mais sans enjeu de croissance puisqu'il n'y a plus de `stage_progress` à faire avancer à ce stade — entretien léger/cosmétique. **Aucune autre activité à cette étape pour l'instant** (tours et carte d'identité/portrait : voir backlog section 10).

#### Détermination de l'archétype (`personality`)

Calculée une seule fois, au moment du passage à Adulte, à partir de `adult_stats` :

1. Comparer les 5 valeurs (`feu`, `nourriture`, `hygiene`, `joie`, `apprentissage`).
2. Repérer la valeur la plus haute, puis tous les traits dont l'écart avec ce maximum est ≤ `personnalite.margeEgalite` (config, 5 points).
3. **1 seul trait retenu** → archétype de base (trait dominant).
4. **2 traits retenus** → archétype hybride (combinaison des 2).
5. **3 traits ou plus retenus** → appliquer l'ordre de priorité fixe `personnalite.ordrePriorite` (`feu > nourriture > hygiene > joie > apprentissage`) pour ne garder que les 2 premiers de cet ordre parmi les traits à égalité, puis traiter comme un cas à 2 traits.

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
| `POST /api/dragon/train` | `{ trickId }` — entraîner un tour *(à définir)* |
| `POST /api/dragon/name` | `{ name }` — nommer le dragon après éclosion |
| `POST /api/dragon/reset` | Optionnel, pratique pour les tests |

Avec l'App Router, des **Server Actions** directement dans les composants peuvent remplacer ces routes si plus simple. Dans les deux cas : un client Supabase créé côté serveur avec la clé `service_role` (jamais côté client), qui lit/écrit la ligne `dragon`.

## 7. Illustrations nécessaires (pour le dessinateur)

- Œuf : un état de base + une variante visuelle par indicateur de température (🥶 trop froid / 🔥 parfait / 🥵 trop chaud) — pas de fissures, la mécanique n'est plus basée sur des taps
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

**Phase 7 — Fonctionnalités en attente de spec (backlog, section 10)**
Système de tours, activités Adulte additionnelles (carte d'identité/portrait) — à démarrer une fois ces specs détaillées.

**Phase 8 — Déploiement final**
Variables d'environnement en prod, test complet sur mobile avant de l'offrir.

## 9. Notes

- Garder l'esprit "jamais de mort" de l'animal virtuel — c'est un cadeau, pas un jeu punitif.
- Toutes les constantes numériques passent par la config (section 4), jamais en dur dans le code.

## 10. À spécifier plus tard (backlog)

- **Système de tours** : quels tours, comment on les débloque/enseigne, lien avec `learning` (l'apprentissage accumulé au Jeune devrait influencer ça) **et avec l'archétype** (`personality`, défini en section 5) — les tours accessibles à l'Adulte pourraient en dépendre. Route `POST /api/dragon/train` déjà réservée en section 6, en attente du détail.
- **Carte d'identité / portrait Adulte** : écran révélant l'archétype et un résumé du parcours du dragon (`adult_stats`) — envisagé, non prioritaire pour l'instant (l'étape Adulte se limite à l'entretien cosmétique, section 5).
