# Connecter le homelab : les rêves générés par l'IA

Chaque nuit, une IA légère tournant sur le homelab écrit le rêve du dragon à partir de sa journée. Côté jeu, tout est déjà en place (spec, section « Rêves générés par l'IA ») : il reste à brancher le homelab.

**Principe : le homelab n'est jamais exposé.** Aucun port à ouvrir, aucun tunnel. C'est lui qui interroge le jeu, par des appels sortants :

```
Homelab (cron toutes les 30 min)                    Jeu (Vercel)
  homelab/reveur.mjs ── GET  /api/ia/contexte ──▶  « dort-il ? sa journée, le prompt »
        │
        ▼
  Ollama (local) : écrit le rêve
        │
        └────────────── POST /api/ia/pensees ──▶  validation (garde-fous) puis Supabase
```

Si le homelab est éteint, rien ne casse : le dragon rêve avec les phrases de la banque (`config/phrases.json`).

## 1. Préparer le jeu (une seule fois)

### Tables Supabase

Dans l'éditeur SQL de Supabase :

```sql
create table journal (
  id bigint generated always as identity primary key,
  type text not null,
  detail text,
  created_at timestamptz not null default now()
);
alter table journal enable row level security;

create table pensees_ia (
  id bigint generated always as identity primary key,
  sommeil_debut timestamptz not null,
  pendant text,
  reveil text,
  rejet text,
  brut text,
  modele text,
  raconte boolean not null default false,
  created_at timestamptz not null default now()
);
alter table pensees_ia enable row level security;
```

### Secret partagé

Générer un secret :

```bash
openssl rand -hex 32
```

L'ajouter sous le nom `IA_SECRET` :
- dans Vercel (*Settings → Environment Variables*), puis redéployer ;
- dans `.env.local` pour tester en local.

## 2. Installer Ollama sur le homelab

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull gemma3:4b
```

Il faut Ollama 0.5 ou plus récent : le jeu impose le format de la réponse avec un schéma JSON.

### Quel modèle ?

La génération se fait la nuit, sans urgence : la vitesse compte peu, seule la qualité du français compte.

| Matériel du homelab | Modèle conseillé | Remarque |
|---|---|---|
| GPU avec 6 Go de mémoire vidéo ou plus | `gemma3:4b` | Le meilleur français à cette taille |
| GPU plus modeste, ou bon processeur avec 8 Go de RAM libre | `qwen2.5:3b` ou `llama3.2:3b` | Une à deux minutes par rêve sur processeur, sans importance la nuit |
| Petit processeur (Raspberry Pi…) | `gemma3:1b` | Français plus fragile : s'attendre à plus de rejets |

Tester le modèle seul :

```bash
ollama run gemma3:4b "Écris en une phrase le rêve tendre d'un bébé dragon."
```

## 3. Installer le relais

Le script `homelab/reveur.mjs` du dépôt n'a aucune dépendance. Il faut Node.js 20.6 ou plus récent sur le homelab.

```bash
sudo mkdir -p /opt/miyou-reveur
sudo cp homelab/reveur.mjs /opt/miyou-reveur/
```

Créer `/opt/miyou-reveur/.env` et le rendre lisible par toi seul (`chmod 600`) :

```bash
JEU_URL=https://ton-app.vercel.app
IA_SECRET=le-secret-généré-plus-haut
OLLAMA_URL=http://localhost:11434
OLLAMA_MODELE=gemma3:4b
```

Premier essai à la main :

```bash
cd /opt/miyou-reveur && node --env-file=.env reveur.mjs
```

- Le dragon est éveillé : le script affiche `rien à générer`. C'est normal.
- Le dragon dort : le script affiche `rêve enregistré`, ou `rêve rejeté : <raison>` (le prochain passage retentera, 3 essais par nuit au plus).

## 4. Lancer le relais toutes les 30 minutes

`crontab -e`, puis ajouter :

```
*/30 * * * * cd /opt/miyou-reveur && node --env-file=.env reveur.mjs >> reveur.log 2>&1
```

Si `node` n'est pas trouvé par cron, mettre son chemin complet (`which node`).

## 5. Vérifier dans le jeu

1. Coucher le dragon (ou attendre qu'il s'endorme seul).
2. Lancer le relais à la main (ou attendre le cron).
3. Recharger la page : la bulle affiche le rêve sur l'écran noir.
4. Le réveiller : il raconte son rêve une seule fois.

Sans homelab, on peut simuler le relais depuis n'importe quel terminal :

```bash
curl -s -H "Authorization: Bearer $IA_SECRET" https://ton-app.vercel.app/api/ia/contexte

curl -s -X POST -H "Authorization: Bearer $IA_SECRET" https://ton-app.vercel.app/api/ia/pensees \
  -d '{"sommeilDebut":"<sommeilDebut reçu>","modele":"test","reponse":"{\"pendant\":\"Zzz... une forêt de livres...\",\"reveil\":\"Cette nuit, j’ai joué à cache-cache avec toi dans une forêt de livres !\"}"}'
```

## 6. Relire les rêves (contrôle parental)

Le code vérifie le format, la longueur, les emoji et les mots interdits. **L'accord au féminin pour l'enfant n'est vérifié que par le prompt** : relire les rêves de temps en temps.

```sql
-- Les derniers rêves acceptés
select sommeil_debut, pendant, reveil, modele from pensees_ia
where rejet is null order by sommeil_debut desc limit 20;

-- Les rejets, avec la réponse brute du modèle (pour ajuster le prompt)
select sommeil_debut, rejet, brut from pensees_ia
where rejet is not null order by created_at desc limit 20;

-- Retirer un rêve qui ne convient pas (il ne sera plus affiché)
delete from pensees_ia where id = <id>;
```

Le prompt, les thèmes, les longueurs et les mots interdits se règlent dans `config/ia.json`, sans toucher au code.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| `401` sur `/api/ia/...` | `IA_SECRET` différent entre le homelab et Vercel, ou Vercel pas redéployé après l'ajout |
| `500` sur `/api/ia/contexte` | Tables `journal` ou `pensees_ia` absentes |
| `409` à l'envoi | Le dragon s'est réveillé pendant la génération : rien à faire |
| Toujours `rien à générer` alors qu'il dort | Rêve déjà valide pour cette nuit, ou 3 tentatives déjà épuisées |
| Erreur de connexion à Ollama | Service arrêté (`systemctl status ollama`) ou `OLLAMA_URL` erroné |
| Beaucoup de rejets | Modèle trop petit : essayer un plus gros, ou assouplir `config/ia.json` |
