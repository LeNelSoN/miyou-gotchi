# Miyou-Gotchi — Problèmes de game design

Audit du 18 octobre 2026, refait sur la version en ligne (`config/game.json`, moteur `src/lib/dragonEngine.js`). Il remplace l'analyse du 3 octobre.

**Méthode.** Contrairement à la première analyse (calculs à la main), les chiffres viennent d'une simulation du vrai moteur, heure par heure, de l'œuf à l'Adulte, avec **une enfant réaliste** :
- en semaine, visites à 7 h 30, 16 h 30, 18 h 30 et 20 h (école entre les deux) ; le week-end, six visites de 9 h à 20 h 30 ;
- à chaque visite, elle comble tous les besoins visibles (bois tant qu'il a froid, repas, bain, jeu, leçon) et prépare la nuit à la dernière visite ;
- deux variantes : elle utilise le Dodo (couche le soir s'il est fatigué, réveille le matin), ou elle n'y touche jamais.

## Repères chiffrés

| | Utilise le Dodo | Ne touche pas au Dodo |
|---|---|---|
| Éclosion | jour 4,6 (au lieu de 3) | jour 4,6 |
| Passage au Jeune | jour 16,8 | jour 17,4 |
| Passage à l'Adulte | **jour 39,6** (au lieu de 24) | jour 42,7 |
| Visites où il dort | 18 % | 38 % |
| Heures de nuit (21 h-7 h) où il est éveillé | 6 % | 26 % |
| Heures où le feu est en manque, Bébé + Jeune | 582 h | 789 h |
| Heures où il a faim mais « Nourrir » est bloqué | 25 h | 73 h |
| Énergie minimale atteinte | 45 | 35 |
| Archétype obtenu | Charmeur (scores 72 à 84) | Charmeur (scores 62 à 72) |

Même une enfant attentive met **six semaines** pour atteindre l'Adulte.

## Problèmes, par ordre d'importance

### 1. Le rythme du Bébé dérive et le fait dormir pendant les visites — ✅ corrigé

- Le cycle du Bébé fait 20 à 23 h (8 h d'éveil, au plus 3 h de fatigue, 12 h de sommeil), donc moins d'une journée.
- Il se décale d'environ une heure par jour : couché à 20 h, puis 19 h, 18 h, 17 h... Il finit endormi aux visites de 16 h 30 et 18 h 30.
- On ne peut alors plus le préparer pour la nuit, et ses soins du soir sont perdus.
- Sans utiliser le Dodo, il dort pendant 38 % des visites et passe un quart des nuits éveillé, seul.

**Piste testée :** passer l'éveil du Bébé à 10 h (et le sommeil du Jeune à 11 h). Le rythme se cale tout seul sur « debout à 8 h, couché à 21 h », et il ne dort plus qu'à 6 % des visites. Autre piste : un réveil naturel calé sur une heure du matin fixe.

### 2. Le feu est le goulot du jeu — ✅ corrigé

- Un clic ajoute 20 dans une zone large de 30, et la valeur reste cachée.
- Ajouter du bois quand le feu est « parfait » est un pari. Le plus haut qu'on puisse viser sans risque est donc environ 59, ce qui tient moins de 5 h éveillé.
- Résultat : c'est de loin le besoin le plus souvent en manque (582 h sur la croissance), et comme il compte pour la croissance, c'est lui qui ralentit le plus le dragon.
- Il n'y a toujours aucun moyen de refroidir.

**Piste testée :** une zone plus large (30-80) et une perte de 3 par heure, ce qui fait gagner 3 jours. Autres pistes : un pas de bois plus petit, ou un état intermédiaire « il commence à faire frais ».

### 3. La journée d'école dépasse l'autonomie du dragon — ✅ corrigé

- Elle est absente 9 h (de 7 h 30 à 16 h 30). Or la nourriture tient 6 h et le feu moins de 5 h.
- Chaque jour d'école, il a donc faim et froid plusieurs heures, quoi qu'elle fasse le matin, et sa croissance passe à demi-vitesse.
- C'est la principale raison des 40 jours au lieu de 24.
- Ces manques comptent aussi contre elle dans l'archétype, alors qu'elle ne pouvait rien y faire.

**Piste :** viser au moins 10 h d'autonomie quand le dragon est bien préparé. Par exemple, la nourriture à −3 par heure, ou un repas qui rassasie plus.

### 4. La tristesse bloque « Nourrir » sans explication

- Un dragon triste refuse de manger. Mais dans ses pensées, la faim passe avant la tristesse : il dit « J'ai faim ! » alors que le bouton est grisé.
- Cela arrive 25 à 73 heures pendant l'étape Jeune. Pour une enfant, c'est incompréhensible.

**Piste rapide :** quand la tristesse bloque le repas, faire passer « triste » avant « faim » dans les pensées (« Je n'ai pas faim, je suis trop triste... joue avec moi ? »). On peut aussi donner la raison du bouton grisé.

### 5. Aucune progression visible après l'œuf

- Le Bébé dure environ 12 jours et le Jeune environ 23, sans aucun signe d'avancement.
- Rien n'indique non plus que la croissance ralentit à cause d'un manque.
- Avec des étapes plus longues que prévu (problèmes 2 et 3), le manque se fait encore plus sentir.

**Piste :** des paliers comme les fissures de l'œuf (taille, cornes, ailes), ou une phrase « grandir » à mi-étape.

### 6. La fin est vide

- À l'Adulte, les jauges continuent de baisser (la joie et l'apprentissage aussi, maintenant) mais n'ont plus aucun enjeu.
- La carte d'identité et la voix de l'archétype donnent une récompense, mais il n'y a toujours rien à faire.
- Les tours sont encore dans le backlog.

### 7. L'archétype se joue à quelques points près — ✅ corrigé (signaux « bientôt » et besoins prévenus)

- Chez une enfant attentive, les cinq scores sont serrés (72 à 84 points). Avec une marge d'égalité de 5 points, le résultat tient à des détails, et les hybrides sortent souvent.
- Les jauges lentes, comme l'hygiène, ont moins de besoins et les comble mieux : « Charmeur » et « Coquet » reviennent souvent.
- Empêcher un besoin d'apparaître ne rapporte rien : seule la réaction est notée.
- Les manques pendant l'école (problème 3) pèsent sur tous les traits à la fois, ce qui resserre encore les scores.

**Piste :** ajouter une part de temps passé en bonne zone, et/ou ne pas noter les besoins nés pendant une longue absence.

### 8. L'énergie ne contraint jamais

- Elle ne descend jamais sous 35. La régénération (environ 180 par jour, sommeil compris) dépasse largement ce que coûtent les jeux et les leçons nécessaires.
- Elle ne sert qu'à empêcher de marteler les boutons. C'est une jauge de plus à l'écran, sans décision à prendre.

### 9. L'œuf ne peut pas dormir

- Les nuits et les journées d'école refroidissent l'œuf : il éclot au jour 4,6 au lieu de 3.
- Chaque matin, l'œuf a froid, quoi qu'elle fasse.

### 10. Rien ne rappelle le dragon à la joueuse

- Un vrai tamagotchi sonne quand il a besoin de quelque chose. Ici, rien ne prévient l'enfant : tout repose sur sa mémoire.
- **Piste :** des notifications de l'appli installée sur l'écran d'accueil (PWA, possible sur iOS et Android), par exemple « Coco a faim ! » ou « Coco s'est réveillé ».

### 11. Trop nourrir ou trop laver ne coûte rien

- Le bon réflexe reste de remplir à fond à chaque visite, sans décision à prendre. Les réactions du second écran rendent ça plus vivant, mais pas plus intéressant.

## Corrections du 18 octobre (problèmes 1 à 3)

- **Rythme** : Bébé 10h d'éveil / 12h de sommeil, Jeune 12 / 11, Adulte 13 / 10. Le coucher du soir cale la journée : il est fatigué avant la visite de 20h et ne s'endort seul qu'après.
- **Feu** : zone 30-80, perte 3/h, et un état « frais » (sous 60, encore en bonne zone) qui dit quand ajouter du bois sans risque.
- **Nourriture** : perte 3/h, elle tient 10h.

Même simulation, enfant qui utilise le Dodo :

| | Avant | Après |
|---|---|---|
| Éclosion | jour 4,6 | **jour 3,1** |
| Passage au Jeune | jour 16,8 | **jour 10,8** |
| Passage à l'Adulte | jour 39,6 | **jour 27,0** |
| Visites où il dort | 18 % | **4 %** |
| Rythme du Bébé | décalé d'1h par jour | **couché 21h, debout 8h, stable** |
| Rythme de l'Adulte | couché 21h, debout 4h-5h | **couché 21h, debout 6h-7h** |
| Heures de feu en manque (Bébé + Jeune) | 582 h | **0 h** |
| Heures de faim (Bébé + Jeune) | 435 h | **99 h** |

Restent à suivre :
- **Sans Dodo, le rythme dérive vers le soir** (cycle de 25 à 26h) : il dort à 41 % des visites. Le coucher est donc le rituel qui tient la journée ; le message « Il tombe de sommeil » et le GIF fatigué doivent suffire à le rappeler.
- **Le feu bien tenu n'a plus de besoins** : son score d'archétype reste à 50 (neutre), et une joueuse attentive ne peut presque plus obtenir Ardent. Cela renforce le problème 7 (prévenir un besoin ne rapporte rien).

## Correction du 18 octobre (problème 7)

Chaque trait annonce maintenant son besoin avant le manque, dans les pensées du dragon (« Il commence à faire frais... », « J'ai un petit creux... », « Ça commence à gratter... », « Je m'ennuie un peu... », « J'aimerais apprendre un nouveau truc »). Un soin donné à ce moment **prévient** le besoin et vaut la note maximale. L'archétype reflète donc ce qu'elle anticipe.

Simulation, même emploi du temps d'école, elle répond à tous les manques mais n'anticipe que certains soins :

| Elle anticipe | Archétype | Adulte au jour |
|---|---|---|
| tout | hybride tiré parmi ses meilleurs (ex. Méticuleux) | 24,4 |
| rien | Charmeur (scores 77 à 88, serrés) | 36,3 |
| le feu | Ardent | 32,4 |
| la nourriture | Gourmand | 34,4 |
| l'hygiène | Coquet | 34,8 |
| la joie | Farceur | 35,5 |
| l'apprentissage | Érudit | 35,8 |
| la joie et l'apprentissage | Curieux | 35,5 |
| la nourriture et l'hygiène | Méticuleux | 32,6 |

Anticiper fait aussi grandir plus vite : une enfant qui anticipe tout atteint l'Adulte dans la durée prévue (24 jours).

## Corrigé depuis l'analyse du 3 octobre

- **Dormir sans contrepartie** : il faut maintenant attendre qu'il soit fatigué pour le coucher, et il se réveille seul. On ne peut plus le garder couché presque tout le temps.
- **L'archétype joué d'avance** : il reflète maintenant la rapidité à combler chaque besoin, et il est révélé sur une carte d'identité.
- **Les clics sans réaction** : chaque soin a sa réaction sur le second écran, et le dragon s'exprime selon son état.
- **La joie et l'apprentissage figés** : ils baissent désormais seuls. Le Jeune n'est plus fini en cinq clics.

## Hors game design

- L'appli en local et celle en ligne partagent la même base Supabase : tester en local agit sur le vrai dragon. Une base de test séparée éviterait les accidents.
