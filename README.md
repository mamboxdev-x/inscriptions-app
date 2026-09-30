# Forma — plateforme de préinscription

Application responsive React/Vite + Supabase : formulaire public, validation, stockage privé des portraits, authentification admin, recherche/filtres/pagination, édition/suppression et export Excel.

**Note photo :** les portraits sont stockés dans un bucket Supabase privé et visibles dans l’espace admin après connexion; ils ne sont pas intégrés à l’export Excel (seul le chemin de stockage est exporté).

## Prérequis

- Node.js 20+ et npm
- Un projet Supabase (PostgreSQL + Auth + Storage)

## Installation locale

```bash
npm install
cp .env.example .env
```

Sous Windows PowerShell : `Copy-Item .env.example .env`.

Créer un projet sur [supabase.com](https://supabase.com), puis copier l’URL du projet et sa clé **publishable/anon** depuis Project Settings → API dans `.env` :

```dotenv
VITE_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
VITE_SUPABASE_ANON_KEY=VOTRE_CLE_PUBLISHABLE_OU_ANON
```

Exécuter `supabase/schema.sql` dans le SQL Editor Supabase. Cela crée la table, ses index, les règles RLS et le bucket privé des portraits.

### Créer un compte admin

1. Dans Supabase Authentication → Users, créer/inviter le compte administrateur.
2. Dans l’éditeur SQL, associer le rôle uniquement au compte de confiance (remplacer par son UUID) :
   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   where id = 'UUID-DU-COMPTE-ADMIN';
   ```
3. Déconnecter/reconnecter le compte pour renouveler le JWT, puis ouvrir `/admin`.

Le rôle est porté par `app_metadata` (non modifiable par l’utilisateur depuis le client), pas par `user_metadata`. Ne jamais mettre la clé `service_role` dans le frontend.

L’application utilise la table `inscriptions` avec la colonne `adresse` contenant « pays, ville » et `photo_url` contenant le chemin Storage privé. Une clé `VITE_*` est embarquée dans le bundle : la clé anon/publishable est publique par conception. La vraie protection vient de RLS, Auth et des politiques Storage.

Lancer le serveur de développement :

```bash
npm run dev
```

Ouvrir l’URL affichée (par défaut `http://localhost:5173`). Vérifier également le build de production avec `npm run build`, puis `npm run preview`.

## Fonctionnalités

- Formulaire responsive : identité, coordonnées, parcours et portrait.
- Champs requis, date non future, validation e-mail/téléphone, images JPEG/PNG/WebP ≤ 5 Mo.
- Insertion publique limitée par les politiques RLS et contraintes PostgreSQL.
- Compte admin Supabase Auth : liste paginée, recherche nom/prénom, filtre ville/niveau, tri, consultation, édition, suppression.
- Portraits dans un bucket privé avec accès admin signé.
- Export complet (indépendant de la pagination et des filtres), toutes colonnes, date d’export et fichier `inscriptions_YYYY_MM_DD.xlsx`.

## Déploiement

Importer le dépôt dans Vercel/Netlify, définir les deux variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, puis utiliser `npm run build` et le dossier `dist`. Ajouter une règle SPA vers `index.html` (le fichier `vercel.json` est fourni). Dans Supabase Authentication → URL Configuration, définir le Site URL et les Redirect URLs avec les URL locales et de production exactes.

## Points de sécurité de production

- N’exposer que la clé anon/publishable ; ne jamais versionner `.env` ou la clé `service_role`.
- Les politiques SQL laissent l’insertion anonyme mais aucun droit de lecture publique sur les informations personnelles ; seul le rôle `admin` en `app_metadata` peut consulter/modifier/supprimer. Les requêtes admin doivent se faire avec une session Auth valide.
- Limiter les inscriptions abusives en configurant CAPTCHA/Turnstile ou une Edge Function avec rate limiting selon le trafic.
- Enregistrer uniquement les données nécessaires, définir une durée de conservation, une procédure d’effacement et une notice de confidentialité conforme aux règles applicables.
- Faire tourner les clés si elles ont été exposées et tester les politiques avec un compte anonyme et un compte non-admin avant publication.

## Structure

```text
src/
├── components/RegistrationForm.jsx
├── pages/HomePage.jsx
├── pages/AdminPage.jsx
├── services/inscriptions.js
├── services/supabase.js
├── utils/validation.js
├── utils/exportExcel.js
├── styles/global.css
├── App.jsx
└── main.jsx
supabase/schema.sql
```
