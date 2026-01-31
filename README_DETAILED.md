# Application de Gestion d'Installations et de Maintenance

## Vue d'ensemble
Cette application Web permet la gestion complète d'installations et de maintenance d'équipements (machines) pour une ou plusieurs sociétés clientes. Elle adresse les besoins des techniciens, managers, administrateurs et équipes logistiques : suivi des machines, interventions, consommables, bons de livraison/retour, gestion des utilisateurs, et export de documents PDF.

## Architecture technique
- Framework : Next.js (App Router) avec TypeScript et React.
- Authentification : NextAuth + Prisma (voir `lib/auth.ts`).
- Base de données : Prisma ORM (schéma dans `prisma/schema.prisma`).
- API : Routes App Router dans `app/api/*` exposant endpoints RESTful.
- Frontend : composants réutilisables dans `components/`.
- Export/PDF : génération de fragments HTML côté serveur (`app/api/export/pdf/route.ts`) puis conversion hors-app.
- Dev HTTPS local : `server.js` pour proxy et certificats dev.

## Principales fonctionnalités
- Authentification via Google OAuth (NextAuth) et sessions JWT/cookies.
- Gestion des sociétés (CRUD + logos).
- Gestion des machines (CRUD, import CSV, historique, QR/scan optionnel).
- Planification et suivi des interventions (création, exécution, historique, PDF fiche intervention).
- Gestion des consommables (noms centralisés, ajustement, historique).
- Bons de livraison / retours (pré-check, génération v2/v3, export PDF).
- Gestion des utilisateurs et import massifs.

## Acteurs
- Admin : gestion globale, paramètres, création d'utilisateurs et sociétés.
- Manager : assignation d'interventions, rapports, génération de documents.
- Technicien : consultation d'interventions, saisie de compte-rendus, consommation de pièces.
- Système externe / OAuth provider : Google pour l'authentification.

## Endpoints importants (exemples)
- `GET/POST /api/companies` — gestion des sociétés (`app/api/companies/route.ts`).
- `GET/POST /api/machines` — gestion des machines (`app/api/machines/route.ts`).
- `POST /api/interventions/generate` — génération d'interventions (`app/api/interventions/generate/route.ts`).
- `POST /api/export/pdf` — génération de fragments HTML pour export (`app/api/export/pdf/route.ts`).
- `api/auth/*` — NextAuth handlers (signin, callback, session).

## Scénarios critiques (résumés)
- Connexion via Google (OAuth) → NextAuth crée/associe User/Account via Prisma → session établie.
- Import CSV de machines → endpoint `app/api/machines/import/route.ts` parse et insère les lignes valides.
- Création d'intervention par technicien → création d'entité liée à machine et user; export possible au format PDF.
- Génération de BL / bons de retour via `app/api/delivery-notes/*`.

## Variables d'environnement essentielles
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — pour Google OAuth.
- `NEXTAUTH_URL` — URL de l'app (doit correspondre au scheme utilisé en dev: http/https).
- `NEXTAUTH_SECRET` — secret pour NextAuth.
- Variables DB pour Prisma (ex: `DATABASE_URL`).

## Développement local
1. Installer dépendances:

```bash
npm install
```

2. Variables d'environnement: créer `.env.local` et définir au minimum:
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
DATABASE_URL=...
```

3. Lancer Prisma (migrations si besoin):

```bash
npx prisma migrate dev
npx prisma studio
```

4. Démarrer le serveur de développement:

```bash
npm run dev
# ou si vous utilisez le proxy HTTPS local
node server.js
```

## Tests et validation
- Tests E2E recommandés: OAuth login, import CSV, export PDF, création d'intervention.
- Vérifier que les routes qui utilisent `cookies()` sont marquées `export const dynamic = "force-dynamic"` pour éviter les erreurs de prerender.

## Bonnes pratiques et recommandations
- Sauvegarder les modifications importantes avant `git reset --hard` (branche de sauvegarde ou patch).
- Tenir `prisma/schema.prisma` synchronisé et versionné, exécuter `prisma migrate` après modification.
- Ajouter tests automatisés pour les flows critiques.

## Fichiers clés à consulter
- Auth: [lib/auth.ts](lib/auth.ts)
- Schéma DB: [prisma/schema.prisma](prisma/schema.prisma)
- Routes API: `app/api/*` (ex: [app/api/companies/route.ts](app/api/companies/route.ts))
- Composants: `components/*` (ex: [components/users/user-form.tsx](components/users/user-form.tsx))
- PDF export: [app/api/export/pdf/route.ts](app/api/export/pdf/route.ts) et [components/exports/export-menu.tsx](components/exports/export-menu.tsx)

---
Fichier généré automatiquement — dites-moi si vous voulez que je le fusionne dans `README.md` existant ou que je crée une version traduite/abrégée pour les clients.