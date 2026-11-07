# 🌍 Travel Memories — API

Backend REST du projet **Travel Memories** : un réseau social de voyage où l'on publie des souvenirs géolocalisés (photos, texte, tags) affichés sur une carte.

**Stack** : Node.js 20 · Express · TypeScript · PostgreSQL · Zod · JWT · Multer — testé avec Vitest + Supertest sur un vrai moteur PostgreSQL (PGlite).

## Démarrage rapide

### Avec Docker (le plus simple)
```bash
docker compose up --build
docker compose exec api node -e "require('./dist/src/scripts/seed.js')"   # données de démo (optionnel)
```
L'API répond sur `http://localhost:8000/api`.

### En local
```bash
cp .env.example .env        # puis renseigner DATABASE_URL et JWT_SECRET
npm install
npm run dev                 # applique les migrations automatiquement
npm run seed                # optionnel : admin + voyages de démo
npm test                    # 28 tests d'intégration
```

Côté frontend, dans `.env.local` :
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Architecture

```
migrations/001_init.sql   Schéma PostgreSQL (contraintes, index, cascades)
src/
  app.ts / server.ts      Express, sécurité, montage des routes
  config.ts               Variables d'environnement validées (Zod)
  db.ts                   Pool pg + système de migrations
  middleware/             auth (JWT), validate (Zod), upload, erreurs
  routes/                 auth · users · memories · comments · notifications · admin · stats · misc
  services/               settings, notifications, requêtes partagées, mailer, journal d'audit
tests/api.test.ts         Scénarios complets (auth, droits, visibilité, modération…)
```

Choix de conception :
- **Compteurs calculés** (likes, commentaires, abonnés…) par sous-requêtes SQL : jamais désynchronisés.
- **Pas de N+1** : photos et tags d'une page de résultats sont chargés en 2 requêtes.
- **Réponses uniformes** : `{ success, data, message?, pagination? }` et, en erreur, `{ success:false, message, error:{code,type,message,details?} }`.

## Sécurité

| Sujet | Mesure |
|---|---|
| Mots de passe | bcrypt (12 tours), règles de complexité, comparaison à temps constant |
| Sessions | JWT ; l'utilisateur est **relu en base à chaque requête** → un bannissement ou changement de rôle est immédiat |
| Autorisations | propriétaire / modérateur / admin vérifiés côté serveur sur chaque route |
| Injection SQL | requêtes 100 % paramétrées ; clés dynamiques issues d'une liste blanche Zod ; motifs `LIKE` échappés |
| Mass-assignment | le schéma Zod retire tout champ inconnu (impossible d'envoyer `role: "admin"`) |
| Uploads | type vérifié par **octets magiques** (pas le Content-Type), nom aléatoire, taille limitée, protection path-traversal |
| Énumération de comptes | `forgot-password` répond pareil que l'email existe ou non ; login avec hash factice |
| Reset de mot de passe | token aléatoire 256 bits, stocké **haché**, valable 1 h, usage unique |
| Abus | rate-limiting global et renforcé sur `/auth` ; Helmet ; CORS restreint ; body JSON limité à 1 Mo |
| Vie privée | visibilité `public` / `followers` / `private` appliquée partout (liste, détail, commentaires, likes, profil) |

## Endpoints principaux (préfixe `/api`)

| Domaine | Routes |
|---|---|
| Auth | `POST /auth/register` · `/auth/login` · `/auth/forgot-password` · `/auth/reset-password` · `/auth/change-password` |
| Utilisateurs | `GET/PUT /users/me` · `POST /users/avatar` · `GET /users/search?q=` · `GET /users/:username` · `POST/DELETE /users/:id/follow` · `GET /users/:id/is-following` · `GET /users/:ref/followers\|following` |
| Souvenirs | `GET /memories` (`page, limit, search, country, tag, username, mine, feed=following, has_location, sort=recent\|popular\|views`) · `GET /memories/favorites` · `GET /memories/user/:username` · `GET/PUT/DELETE /memories/:id` · `POST /memories` |
| Interactions | `POST/DELETE /memories/:id/like` · `/favorite` · `POST /memories/:id/photos` · `/photos/multiple` · `DELETE /memories/:id/photos/:photoId` |
| Commentaires | `GET/POST /memories/:id/comments` · `PUT/DELETE /comments/:id` · `POST/DELETE /comments/:id/like` |
| Notifications | `GET /notifications` · `/unread` · `/unread/count` · `PUT /notifications/read-all` · `/:id/read` |
| Inspiration | `GET /stats/travel/:username` (pays, % du monde, badges) · `GET /stats/discover` (destinations et tags tendance) |
| Abonnements (style Instagram) | `PUT /users/me {is_private}` · `POST /users/:id/follow` → `{status:'following'\|'requested'}` · `DELETE /users/:id/follow` · `DELETE /users/:id/follower` · `GET /follow-requests` (+ `/sent`) · `POST /follow-requests/:userId/accept\|decline` · `POST /follow-requests/accept-all` · `GET /friends` (abonnement mutuel) |
| Blocage | `GET /blocks` · `POST/DELETE /blocks/:userId` |
| Messages privés | `GET/POST /conversations` · `GET /conversations/unread/count` · `GET/POST /conversations/:id/messages` (curseur `before`) · `PUT /conversations/:id/read` · `DELETE /conversations/:id/messages/:mid` · `POST /memories/:id/share {user_ids, body?}` |
| Stories (24 h) | `POST /stories` (multipart `image`, `caption`, `latitude/longitude`, `visibility`) · `GET /stories` (fil groupé) · `GET /stories/map` · `GET /stories/user/:username` · `POST /stories/:id/view` · `GET /stories/:id/viewers` · `DELETE /stories/:id` |
| Identifications | `@username` dans un souvenir publié ou un commentaire → notification `mention` ; `GET /users/:username/tagged` |
| Signalement / contact | `POST /reports` · `POST /contact` |
| Admin | `/admin/stats` · `/activities` · `/users` · `/memories` · `/reports` · `/settings` (rôles `admin` et `moderator`) |

## Règles sociales

- **Compte privé** : suivre crée une demande à accepter ; tant qu'on n'est pas abonné accepté, souvenirs (même publics), stories et listes d'abonnés sont masqués. Passer un compte en public accepte les demandes en attente.
- **Amis** = abonnement mutuel.
- **Blocage** : supprime les abonnements et demandes dans les deux sens ; profil, souvenirs, stories, commentaires et conversations deviennent invisibles des deux côtés ; plus de follow, like, commentaire, message ni identification.
- **Messages** : une conversation par paire, non temps réel (sondage via `/conversations/unread/count`). Vers un compte privé, un abonnement dans un sens est requis. Les notifications ne contiennent jamais le texte. Partager un souvenir « abonnés » n'en donne pas l'accès au destinataire ; un souvenir privé ne se partage pas.
- **Stories** : visibles 24 h (puis masquées immédiatement, supprimées avec leur fichier par une purge horaire), 20 actives max par personne, mêmes règles de visibilité que les souvenirs.
- **Identifications** : seules les personnes qui peuvent réellement voir le souvenir sont identifiées/notifiées ; pas de notification pour un brouillon (envoyée à la publication) ni en double lors d'une modification.

## Branchement avec le frontend

Le contrat suit les fichiers `lib/api/*.ts` du frontend. Points d'attention côté Next.js :

1. **Token** : plusieurs fichiers lisent `localStorage.getItem('token')` (clé inexistante : le token est dans `auth-storage`). Faire passer ces appels par `apiClient` (uploads, commentaires, notifications, profil), sinon ils partiront sans authentification.
2. **Page « Ma carte »** : appeler `GET /memories?mine=true&has_location=true` (le frontend appelle aujourd'hui `/memories` = tous les souvenirs publics).
3. **Profil** : le `fetch` de `/users/:username` n'envoie pas de token, donc `is_following` vaut toujours `false`. Ajouter l'en-tête `Authorization`.
4. **Images** : les URLs renvoyées sont absolues (`PUBLIC_URL/uploads/...`). Si vous utilisez `next/image`, déclarer ce domaine dans `next.config.ts` (`images.remotePatterns`).
5. **Garde admin** : elle reste côté client dans le frontend ; l'API, elle, refuse bien tout accès non autorisé.

## Paramètres admin appliqués

`enable_registrations`, `enable_comments`, `maintenance_mode` (+ message) et `max_photos_per_memory` sont **réellement appliqués**. Les autres sont stockés mais pas encore exploités (`require_email_verification`, `memory_moderation_required`, `daily_email_limit`, `max_file_size`, `auto_delete_reports_after_days`).

## Pistes pour aller plus loin

- E-mails réels (Resend / Nodemailer) dans `services/mailer.ts` + vérification d'adresse.
- Redimensionnement/optimisation des images (sharp) et stockage objet (S3, Cloudinary).
- Extraction des coordonnées EXIF pour placer automatiquement un souvenir sur la carte.
- Voyages = regroupement de souvenirs avec itinéraire ; souvenirs collaboratifs.
- Résumé de voyage généré par IA (API Claude) à partir des notes et photos.
- Recherche sémantique (pgvector), temps réel des notifications (SSE/WebSocket), OpenAPI/Swagger.


## Frontend (dossier `frontend/`)

Next.js 16 + Tailwind. Démarrage sans Docker :

```bash
# 1. API (PostgreSQL requis)
cp .env.example .env && npm install && npm run seed && npm run dev      # http://localhost:8000
# 2. Frontend
cd frontend && cp .env.example .env.local && npm install && npm run dev   # http://localhost:3000
```

Avec Docker : `docker compose up --build` (site : :3000, API : :8001).

### Ce que le frontend branche maintenant

- **Fil façon Instagram** : bandeau de stories, publications avec carrousel de photos, double-clic pour aimer, commentaire rapide, enregistrer, partager ; onglets Découvrir / Abonnements ; défilement infini.
- **Création de souvenir avec photos** (jusqu'à 10, glisser-déposer), tags, et placement automatique sur la carte d'après la ville/le pays si aucune position n'est donnée.
- **Profil** : abonnement (Suivre / Demandé / Abonné), liste d'abonnés et d'abonnements, retirer un abonné, grille de souvenirs, enregistrés, « identifié(e) », compte privé, blocage, anneau de story.
- **Carte** : bleu = vos souvenirs, vert = souvenirs publics (visiteurs inclus), stories géolocalisées, position en rouge.
- **Messagerie privée** (actualisation toutes les 5 s) avec partage de souvenir, **notifications** (demandes d'abonnement à accepter/refuser), **réglages de confidentialité** (compte privé, utilisateurs bloqués).

### Corrections apportées

- Les photos n'apparaissaient pas : `next/image` refusait le domaine de l'API → `images.unoptimized` + composants adaptés.
- Les marqueurs de carte étaient tous bleus et ne montraient que les souvenirs publics.
- Le profil n'envoyait pas le jeton : vos souvenirs « privés » / « abonnés » restaient invisibles, et les onglets étaient mal affichés (variantes Radix `data-state`).
- Plusieurs requêtes (profil, commentaires, notifications, envois de fichiers) lisaient un jeton `localStorage.token` inexistant : elles passent toutes par `apiClient`.
- Messages d'erreur précis du serveur affichés au lieu de messages génériques ; échappement HTML dans les popups de la carte.
