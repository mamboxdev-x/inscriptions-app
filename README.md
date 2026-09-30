# Plateforme d’inscription AICPES

Application web responsive de préinscription pour l’Association des Ingénieurs issus des Classes Préparatoires de l’ESATIC (AICPES). Elle comprend un formulaire public, la promotion de chaque membre, le stockage privé des portraits, l’authentification administrateur, la recherche/filtres/pagination, l’édition/suppression et l’export Excel.

## Prérequis

- Node.js 20+ et npm
- Un projet Supabase (PostgreSQL, Auth et Storage)

## Installation locale

```bash
npm install
cp .env.example .env
```

Sous Windows PowerShell, remplace `cp` par `Copy-Item .env.example .env`.

Dans Supabase, ouvre **Project Settings → API** et récupère le **Project URL** et la clé publique **publishable/anon**. Complète le fichier `.env` à la racine :

```dotenv
VITE_SUPABASE_URL=https://TON-PROJET.supabase.co
VITE_SUPABASE_ANON_KEY=TA_CLE_PUBLISHABLE_OU_ANON
```

Ne mets jamais la clé `service_role` dans le frontend. Le fichier `.env` est ignoré par Git.

### Configurer la base Supabase

1. Dans Supabase, ouvre **SQL Editor → New query**.
2. Copie-colle tout le contenu de [`supabase/schema.sql`](./supabase/schema.sql), puis clique **Run**. Cela crée la table, les politiques d’accès, les fonctions d’administration et le bucket privé des portraits.
3. Dans **Authentication → Users**, crée/invite le compte admin. Copie son User UID.
4. Dans SQL Editor, attribue le rôle uniquement à cet UID en remplaçant la valeur ci-dessous :

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where id = 'UUID-DU-COMPTE-ADMIN';
```

5. Déconnecte-toi puis reconnecte-toi pour renouveler la session avant d’ouvrir `/admin`.

Le rôle doit être dans `app_metadata`; ne le définis pas dans `user_metadata` et ne l’accorde jamais depuis l’interface publique.

La liste des promotions proposée va de IT12 à IT30; adapte `PROMOTIONS` dans `src/utils/validation.js` et la liste correspondante de l’administration si de nouvelles promotions doivent être ajoutées. L’application stocke le pays et la ville ensemble dans la colonne `adresse` (« pays, ville »). Les portraits sont privés; seuls les administrateurs obtiennent des URL signées.

## Lancer et vérifier

```bash
npm run dev
npm run build
npm test
```

Lance le serveur local à l’adresse affichée (habituellement `http://localhost:5173`). Sans variables Supabase configurées, le formulaire ne peut pas enregistrer de dossiers et l’admin ne peut pas se connecter.

## Déployer sur Vercel depuis GitHub

Le dépôt source est [mamboxdev-x/inscriptions-app](https://github.com/mamboxdev-x/inscriptions-app).

1. Sur Vercel, choisis **Add New → Project**, puis importe `mamboxdev-x/inscriptions-app`.
2. Dans les paramètres du projet Vercel, ajoute les variables d’environnement `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (les mêmes valeurs publiques que dans `.env`). Sélectionne les environnements voulus, au minimum **Production**.
3. Utilise `npm run build` comme commande de build et `dist` comme dossier de sortie; les valeurs par défaut détectées pour Vite conviennent aussi.
4. Déploie. Après avoir ajouté/modifié une variable, relance un déploiement pour reconstruire l’application.
5. Dans Supabase → **Authentication → URL Configuration**, définis le **Site URL** avec le domaine Vercel attribué et ajoute ce domaine aux **Redirect URLs**. Ajoute aussi `http://localhost:5173/**` pour le développement local si nécessaire.
6. Vérifie l’envoi d’un dossier de test et la connexion admin sur `https://TON-DOMAINE.vercel.app/admin`.

Le fichier [`vercel.json`](./vercel.json) inclut la réécriture SPA nécessaire aux routes de l’application.

## Sécurité et données personnelles

- Seule la clé `anon`/`publishable` est utilisable dans le navigateur; elle est publique par conception. RLS et les fonctions SQL sécurisent les données.
- N’ajoute jamais `.env`, une clé `service_role` ou un mot de passe dans GitHub.
- Les inscriptions publiques sont ouvertes; configure une protection anti-abus telle qu’un CAPTCHA avant une collecte à grande échelle.
- Définis une notice de confidentialité, les règles de conservation et la procédure d’effacement applicables.
- Les tests de parcours nécessitant une véritable instance Supabase ne sont pas exécutés dans les tests automatisés locaux tant qu’aucun backend de test n’est configuré.

## Fonctionnalités

- Formulaire avec identité, coordonnées, parcours et portrait.
- Validation des champs obligatoires, email, téléphone, date et photo JPEG/PNG/WebP (maximum 5 Mo).
- Tableau admin avec pagination, recherche, filtres, tri, détails, modification et suppression.
- Export Excel des inscriptions.
