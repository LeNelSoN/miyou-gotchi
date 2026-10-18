# Miyou-Gotchi — Problèmes de game design

Analyse du 3 octobre 2026, à partir de `config/game.json`, du moteur (`src/lib/dragonEngine.js`) et de la spec. Les chiffres sont calculés à la main, pas simulés. État pris en compte : fissures de l'œuf, faim visible, mode Dodo (non commité).

## Repères chiffrés

| Jauge | Tient en bonne zone, éveillé | Tient en bonne zone, endormi | Clics par jour |
|---|---|---|---|
| Nourriture (seuil 70, -5/h, +30 par clic) | 6 h | 12 h | environ 4 |
| Feu (zone 40–70, -4/h, +20 par clic) | 7 h 30 en partant de 70 | 15 h | environ 5 |
| Hygiène (seuil 25, -4/h, +30 par clic) | 18 h 45 | 37 h 30 | environ 3 |

- Durée minimale jusqu'à l'Adulte : 24 jours (3 + 7 + 14). Durée maximale, dragon totalement négligé : 48 jours.
- Le jeu représente une douzaine de clics par jour, soit moins d'une minute.

## Problèmes, par ordre d'importance

### 1. Dormir n'a aucun coût — ✅ corrigé (rythme veille/sommeil par étape, à valider)

- Pendant le Dodo, les pertes sont divisées par deux et la croissance continue normalement.
- Rien ne limite la durée ni la fréquence du sommeil, et le dragon ne se réveille jamais seul.
- La stratégie optimale est donc : réveiller, remplir les jauges, recoucher. Deux visites par jour donnent une croissance parfaite (24 jours) ; une seule visite donne environ 32 jours.
- Conséquence : l'écran est noir presque tout le temps, et le dragon dessiné n'est visible qu'une minute par visite.

Piste : le dragon ne peut être couché que lorsqu'il est fatigué (après une douzaine d'heures éveillé) et se réveille seul après 10 h environ. Le GIF aux yeux mi-clos, aujourd'hui inutilisé, signale qu'il est l'heure de le coucher.

### 2. L'archétype est joué d'avance — ✅ corrigé (rapidité à combler chaque besoin + carte d'identité, à valider)

- Il est calculé sur un instantané des jauges au passage à l'Adulte, pas sur la façon dont le dragon a été élevé.
- Joie et apprentissage ne décroissent jamais : un joueur attentif les a toutes deux à 100 et obtient « Curieux » presque à coup sûr.
- Les archétypes de feu demandent un feu à 95 ou plus, donc un dragon en surchauffe : ils récompensent un mauvais soin.
- Les archétypes de nourriture et d'hygiène demandent d'avoir soigné dans l'heure précédant un passage que le joueur ne voit pas venir.
- L'archétype n'est affiché nulle part dans l'appli. (Il s'entend désormais dans les pensées de l'Adulte, mais n'est pas nommé.)

Piste : compter les soins donnés pendant la croissance (bois, repas, bains, jeux, leçons) et retenir les dominants ; révéler le résultat sur une carte d'identité de l'Adulte.

### 3. L'étape Jeune s'épuise en une session — 🟡 en partie (joie et apprentissage baissent seuls, -1/h)

- Cinq clics sur « Éduquer » amènent l'apprentissage à 100, et l'énergie de départ suffit.
- La joie ne baisse que si on éduque : une fois l'apprentissage plein, elle ne bouge plus.
- L'énergie se régénère de 120 par jour (le double en dormant) : elle ne contraint presque jamais.
- Restent 14 jours, la plus longue étape, avec la même routine que le Bébé.

Piste : une joie qui décroît lentement, ou un apprentissage plafonné par jour.

### 4. Le feu se règle à l'aveugle

- Un clic ajoute 20 dans une zone large de 30, et la valeur est cachée.
- Cliquer quand le feu est « parfait » est un pari : au-dessus de 50, le dragon surchauffe.
- Aucun moyen de refroidir : il faut attendre, jusqu'à 7 h 30 depuis 100.
- La seule stratégie sûre est d'attendre qu'il ait froid, donc de passer par la mauvaise zone.
- Le Dodo aggrave la surchauffe : endormi, le feu refroidit deux fois moins vite et les actions sont bloquées. Un feu à 90 met 10 h à revenir en bonne zone.

Piste : un état intermédiaire (« il commence à faire frais ») pour pouvoir agir avant qu'il ait froid, ou un pas de bois plus petit.

### 5. Aucune progression visible après l'œuf

- L'œuf montre ses fissures (un stade toutes les 12 h), mais le Bébé (7 jours) et le Jeune (14 jours) n'ont aucun signe d'avancement.
- Rien n'indique non plus que la croissance est ralentie par un mauvais soin.

Piste : un message à mi-parcours, ou des illustrations qui grandissent par paliers.

### 6. Beaucoup de clics sont sans réaction

- Nourrir sans atteindre le seuil, laver, ajouter du bois sans changer d'état : rien ne se passe à l'écran.
- Suralimenter ou surlaver ne coûte rien : le bon réflexe est de marteler les boutons, sans décision à prendre.

Piste : rejouer le GIF « content » à chaque soin.

### 7. La fin est vide

- L'Adulte n'a aucune activité : les jauges restent actives mais sans enjeu.
- Les tours et la carte d'identité sont encore dans le backlog de la spec (section 10).
- Un dragon qui démarre l'étape Bébé est Adulte dans 21 jours au plus tôt : c'est le délai pour préparer la suite.

### 8. L'œuf ne peut pas dormir

- Le Dodo commence au Bébé : les trois nuits de l'œuf restent ralenties.
- L'effet est faible (environ une heure perdue sur 72), mais chaque matin l'œuf est froid, quoi que fasse le joueur.

### 9. L'écart entre joueur assidu et joueur distrait est faible

- La négligence ne fait au pire que doubler la durée, et un joueur qui passe une fois par jour n'est en retard que de quelques jours.
- C'est cohérent avec l'esprit « jamais de mort », mais le joueur ne perçoit presque pas l'effet de ses soins.

## Déjà corrigé depuis la première analyse

- Les nuits étaient perdues d'avance : une nuit de 8 h tient maintenant grâce au Dodo, si le dragon est nourri avant d'être couché.
- L'œuf n'avait aucun signe de progression : il se fissure par paliers.
- La faim était invisible : le bébé affamé pense à un morceau de viande.
