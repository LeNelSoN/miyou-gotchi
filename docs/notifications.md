# Petit mot du jour : mise en route

Une notification par jour à 17 h (heure du Maroc), envoyée par le cron Vercel. Fonctionnement : section 5 de la spec, « Petit mot du jour ».

## 1. Table Supabase

Dans l'éditeur SQL de Supabase :

```sql
create table abonnements_push (
  endpoint    text primary key,
  abonnement  jsonb not null,
  created_at  timestamptz not null default now()
);
alter table abonnements_push enable row level security;
```

## 2. Clés VAPID

Elles identifient l'appli auprès des services push (Apple, Google, Mozilla). À générer une seule fois :

```bash
pnpm dlx web-push generate-vapid-keys
```

Dans Vercel (Settings → Environment Variables), puis dans `.env.local` pour le local :

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | la clé publique (« Public Key ») |
| `VAPID_PRIVATE_KEY` | la clé privée (« Private Key »), à garder secrète |
| `VAPID_SUJET` | `mailto:` suivi de ton adresse, demandé par les services push |

`CRON_SECRET` existe déjà (keepalive) et sert aussi à ce cron. Redéployer après avoir ajouté les variables : la clé publique est intégrée à la page au build.

Ne jamais régénérer les clés une fois des appareils abonnés : leurs abonnements deviendraient invalides, il faudrait se réabonner.

## 3. Sur l'appareil de la petite

**iPhone / iPad (iOS 16.4 ou plus récent)**
1. Ouvrir le jeu dans Safari et se connecter.
2. Bouton Partager, puis « Sur l'écran d'accueil ».
3. Ouvrir l'appli depuis sa nouvelle icône, se reconnecter si besoin.
4. Toucher « 🔔 Recevoir un petit mot chaque jour » sous la coque, puis « Autoriser ».

**Android**
1. Ouvrir le jeu dans Chrome et se connecter (l'installer sur l'écran d'accueil est conseillé, pas obligatoire).
2. Toucher « 🔔 Recevoir un petit mot chaque jour », puis « Autoriser ».

Tu peux aussi l'activer sur ton propre téléphone : chaque appareil abonné reçoit le même petit mot.

## 4. Tester

Envoyer le petit mot tout de suite, même si elle vient de jouer :

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://<ton-domaine>/api/notifications/envoi?forcer=1"
```

Réponse attendue : `{"envoye":1}` (un par appareil abonné). Sans `forcer=1` : `{"envoye":0,"raison":"activité récente"}` si elle s'est occupée du dragon dans les 3 dernières heures.

## Dépannage

- **`aucun abonnement`** : l'abonnement n'a pas été enregistré. Vérifier que la table existe et que le bouton affiche « Petit mot du jour activé ».
- **Le bouton n'apparaît pas** : le navigateur ne gère pas les notifications (sur iPhone, l'appli doit être ouverte depuis l'écran d'accueil).
- **« Les notifications sont bloquées »** : la permission a été refusée. La réactiver dans les réglages de l'appareil (iPhone : Réglages → Notifications → Miyou-Gotchi).
- **Rien n'arrive à 17 h** : en offre gratuite, Vercel déclenche le cron n'importe quand entre 16 h et 17 h UTC, donc entre 17 h et 18 h au Maroc. Les exécutions sont visibles dans Vercel → Settings → Cron Jobs.
- Un appareil désinstallé ou désabonné est retiré de la table automatiquement au premier envoi refusé.
