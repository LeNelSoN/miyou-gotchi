# Miyou-Gotchi

Un dragon virtuel façon tamagotchi, cadeau d'anniversaire : l'œuf éclot, on s'occupe du dragon pour
qu'il grandisse (Bébé, Jeune, Adulte), puis il part sur une quête. Il ne meurt jamais.

Next.js (App Router), Supabase, Tailwind, déployé sur Vercel.


## État du projet

*(Section tenue à jour pour l'archiviste. Dernière mise à jour : 11 novembre 2026.)*

- **Objet** : dragon virtuel offert en cadeau d'anniversaire à une petite fille. Il grandit de l'œuf à l'Adulte, puis part en quête.
- **Avancement** : les étapes Œuf, Bébé, Jeune et Adulte sont validées dans `dragon-app-spec.md`. Sont aussi en place : le rythme veille/sommeil (Dodo), les pensées du dragon, les talents, les notifications push, trois simulateurs de réglage. 63 commits ; le dernier date du 11/11/2026 (nouvelles animations de l'Adulte et du Jeune).
- **En cours** : la quête de l'Adulte (« Étape 4 bis ») est marquée « spec à valider » dans la spec, alors que du code existe déjà (`config/quetes/`, simulateur de quête). Les illustrations de l'Adulte ont été redessinées le 11/11.
- **Avant de l'offrir** : remettre un œuf neuf (voir plus bas). La base Supabase de test est la même qu'en ligne.

## Lancer en local

```bash
cp .env.local.example .env.local   # puis remplir les valeurs
pnpm install
pnpm dev                            # http://localhost:3000
```

⚠️ La base Supabase est la même qu'en ligne : tester en local agit sur le vrai dragon.
`DEBUG_MODE=true` ouvre l'accès sans mot de passe et affiche le panneau de debug (jamais en prod).

## Remettre un œuf neuf (avant de l'offrir)

Dans l'éditeur SQL de Supabase :

```sql
delete from dragon;
insert into dragon (stage) values (0);
```

L'œuf attend alors qu'on touche « 🥚 Réveiller l'œuf » : le temps du jeu ne démarre qu'à ce moment-là.
Le panneau de debug (`DEBUG_MODE=true`) fait la même chose.

## Simulateurs

Ils font tourner le vrai moteur (`src/lib/dragonEngine.js`) sur des vies ou des parties simulées,
pour régler la config (`config/game.json`) avant de toucher au jeu.

| Commande | Ce qu'elle mesure |
|---|---|
| `pnpm simuler-vie [vies]` | Croissance du Bébé à l'Adulte selon la façon de nourrir |
| `pnpm simuler-dodo [vies]` | Rythme de sommeil, avec ou sans coucher : visites où il dort, levers, grognon |
| `pnpm simuler-quete [parties] [graine]` | Quête de l'Adulte : durée, choix, parties bloquées, titres |

## Documentation

- `dragon-app-spec.md` : spec et roadmap (modèle de données, règles, config, API).
- `game-design-problemes.md` : problèmes de game design, avec leurs corrections et les chiffres simulés.
- `docs/notifications.md` : petit mot du jour (notifications push).
