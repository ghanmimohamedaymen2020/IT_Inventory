# 🎯 Prochaines Étapes - Guide de Développement

## ✅ Ce qui est fait

1. **Infrastructure de base** ✓
   - Next.js 14 avec App Router et TypeScript
   - Tailwind CSS configuré
   - Composants UI Shadcn de base
   - Structure de dossiers complète

2. **Base de données** ✓
   - Schéma Prisma complet (14 modèles)
   - Relations et index optimisés
   - Scripts de migration prêts

3. **Authentification** ✓
   - NextAuth.js avec Google OAuth
   - Middleware de protection des routes
   - Gestion des rôles (super_admin, company_admin, viewer)
   - Pages login/error

4. **Utilitaires Python** ✓
   - Environnement virtuel créé
   - Scripts QR codes et chiffrement
   - Dépendances installées

5. **Validation et Sécurité** ✓
   - Schémas Zod pour tous les modèles
   - Fonctions de chiffrement/déchiffrement
   - Génération codes inventaire

6. **Pages de base** ✓
   - Dashboard avec stats
   - Layout avec sidebar
   - Pages squelettes pour tous les modules

## 🚀 Pour démarrer l'application

### 1. Configuration requise

```powershell
# 1. Configurer PostgreSQL
# Modifier .env avec vos identifiants :
DATABASE_URL="postgresql://user:password@localhost:5432/it_inventory?schema=public"

# 2. Configurer Google OAuth
# Ajouter dans .env :
GOOGLE_CLIENT_ID="votre-client-id"
GOOGLE_CLIENT_SECRET="votre-secret"

# 3. Générer les secrets
# PowerShell :
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)

# Ajouter dans .env :
NEXTAUTH_SECRET="secret-genere"
ENCRYPTION_KEY="cle-32-caracteres-minimum"
```

### 2. Initialiser la base de données

```powershell
# Pousser le schéma
npm run db:push

# Ouvrir Prisma Studio
npm run db:studio
```

### 3. Créer les premières données

Dans Prisma Studio, créer dans l'ordre :

**1. Company**
```
name: "Votre Compagnie"
code: "ABC" (2-4 lettres majuscules)
```

**2. User**
```
firstName: "Votre prénom"
lastName: "Votre nom"
email: "votre-email@gmail.com" (celui pour Google OAuth)
companyId: (sélectionner la compagnie)
role: "super_admin"
```

**3. Admin**
```
userId: (sélectionner l'utilisateur)
role: "super_admin"
companyId: null
```

### 4. Lancer l'application

```powershell
npm run dev
```

Accéder à http://localhost:3000

## 📦 Modules à développer (par priorité)

### 1. Module Machines (PRIORITÉ HAUTE)

**Fichiers à créer :**
- `app/dashboard/machines/create/page.tsx` - Formulaire création
- `app/dashboard/machines/[id]/page.tsx` - Détails machine
- `app/dashboard/machines/[id]/edit/page.tsx` - Édition
- `components/machines/machine-form.tsx` - Formulaire réutilisable
- `components/machines/machine-table.tsx` - DataTable
- `components/machines/screen-section.tsx` - Gestion écrans multiples
- `app/api/machines/route.ts` - API GET/POST
- `app/api/machines/[id]/route.ts` - API GET/PUT/DELETE

**Fonctionnalités :**
- ✅ Schéma Zod existant (`lib/validators/schemas.ts`)
- 🔨 Formulaire avec sections (Infos, Specs, Écrans)
- 🔨 Ajout/suppression écrans dynamique
- 🔨 Génération auto code inventaire
- 🔨 Génération QR code
- 🔨 Upload fichiers
- 🔨 Scan S/N avec webcam
- 🔨 Filtres et recherche
- 🔨 Export Excel/PDF

### 2. Module Utilisateurs

**Fichiers à créer :**
- `app/dashboard/users/create/page.tsx`
- `app/dashboard/users/[id]/page.tsx`
- `components/users/user-form.tsx`
- `components/users/user-table.tsx`
- `app/api/users/route.ts`

**Fonctionnalités :**
- Formulaire création/édition
- Assignation machines (multi-select)
- Gestion Office 365
- Envoi email invitation
- Historique assignations

### 3. Module Bons de Livraison

**Fichiers à créer :**
- `app/dashboard/delivery-notes/create/page.tsx`
- `app/dashboard/delivery-notes/[id]/page.tsx`
- `components/delivery/delivery-form.tsx`
- `components/delivery/items-section.tsx`
- `app/api/delivery-notes/route.ts`
- `app/api/delivery-notes/[id]/receive/route.ts`

**Fonctionnalités :**
- Création bon de livraison
- Ajout items attendus
- Processus réception (scan S/N)
- Création automatique machines
- Upload PDF
- Suivi statuts

### 4. Module Installation

**Fichiers à créer :**
- `app/dashboard/installation/sheets/[id]/page.tsx`
- `components/installation/checklist.tsx`
- `components/installation/network-config.tsx`
- `app/api/installation/route.ts`

**Fonctionnalités :**
- Fiche d'installation
- Checklist pré-déploiement
- Configuration réseau
- Liste logiciels installés
- Signature numérique
- Export PDF

### 5. Module Logiciels

**Fichiers à créer :**
- `app/dashboard/software/catalog/page.tsx`
- `app/dashboard/software/[id]/page.tsx`
- `components/software/license-form.tsx`
- `components/software/installation-history.tsx`
- `app/api/software/route.ts`

**Fonctionnalités :**
- Catalogue logiciels
- Gestion licences
- Suivi utilisation sièges
- Installation/désinstallation
- Alertes expiration
- Rapports coûts

### 6. Module Administration

**Fichiers à créer :**
- `app/dashboard/admin/companies/page.tsx`
- `app/dashboard/admin/users/page.tsx`
- `app/dashboard/admin/roles/page.tsx`
- `components/admin/company-form.tsx`
- `app/api/admin/companies/route.ts`

**Fonctionnalités :**
- Gestion compagnies
- Gestion utilisateurs système
- Attribution rôles
- Logs activité
- Statistiques globales

## 🎨 Composants Réutilisables à Créer

### DataTable (pour toutes les listes)
```typescript
// components/ui/data-table.tsx
// Basé sur @tanstack/react-table
// Avec filtres, tri, pagination, export
```

### Composants Shadcn manquants
```powershell
npx shadcn@latest add table
npx shadcn@latest add select
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add tabs
npx shadcn@latest add checkbox
npx shadcn@latest add switch
npx shadcn@latest add popover
npx shadcn@latest add command
```

### Scanner S/N
```typescript
// components/scanner/serial-scanner.tsx
// Utilise react-webcam
// Détection automatique ou saisie manuelle
```

### QR Code Generator
```typescript
// components/qr/qr-generator.tsx
// Appelle le script Python via API
// Affiche et permet téléchargement
```

### File Upload
```typescript
// components/upload/file-upload.tsx
// Drag & drop
// Preview
// Upload vers /public/uploads
```

## 📊 APIs à Implémenter

### Structure standard pour chaque ressource
```typescript
// app/api/[resource]/route.ts
// GET - Liste avec filtres, pagination
// POST - Création

// app/api/[resource]/[id]/route.ts
// GET - Détails
// PUT - Mise à jour
// DELETE - Suppression

// app/api/[resource]/[id]/[action]/route.ts
// Actions spécifiques
```

### Middleware API
```typescript
// lib/api/middleware.ts
// - Vérification authentification
// - Vérification rôles
// - Vérification company
// - Rate limiting
// - Error handling standardisé
```

## 🔐 Sécurité à Renforcer

1. **Validation stricte**
   - Tous les inputs validés avec Zod
   - Sanitization des données
   - Prévention injection SQL (Prisma le fait)

2. **Autorisation**
   - Vérifier company_id sur toutes les requêtes
   - Company Admin limité à sa compagnie
   - Viewer en lecture seule

3. **Chiffrement**
   - Product keys Windows chiffrées
   - License keys chiffrées
   - Clés stockées en environnement sécurisé

4. **Logs**
   - Tracer toutes les actions critiques
   - Audit trail par utilisateur

## 📈 Améliorations Futures

1. **Performance**
   - Cache Redis pour données fréquentes
   - Optimisation requêtes Prisma
   - Lazy loading listes

2. **Rapports**
   - Exports Excel/PDF
   - Graphiques avec Recharts
   - Rapports planifiés

3. **Notifications**
   - Email (Resend/SendGrid)
   - Alertes garanties
   - Alertes licences

4. **Mobile**
   - PWA pour scan terrain
   - App React Native

5. **Intégrations**
   - Active Directory sync
   - API Microsoft Graph (Office 365)
   - Slack/Teams webhooks

## 📝 Bonnes Pratiques

1. **Code**
   - TypeScript strict
   - Composants réutilisables
   - Server/Client components appropriés
   - Error boundaries

2. **Base de données**
   - Migrations plutôt que push
   - Index sur colonnes fréquentes
   - Soft delete pour audit

3. **Tests**
   - Tests unitaires (Vitest)
   - Tests E2E (Playwright)
   - Tests API (Supertest)

4. **Documentation**
   - JSDoc pour fonctions complexes
   - README par module
   - Storybook pour composants

## 🛠️ Commandes Utiles

```powershell
# Développement
npm run dev                    # Lancer dev server
npm run db:studio             # Ouvrir Prisma Studio
npm run db:push               # Sync schema sans migration
npm run db:migrate            # Créer migration

# Build
npm run build                 # Build production
npm run start                 # Lancer production

# Base de données
npm run db:generate           # Générer client Prisma
npx prisma db seed           # Seed data (à créer)
npx prisma migrate reset     # Reset DB (DEV ONLY)

# Qualité code
npm run lint                  # Linter
npm run type-check           # Vérif TypeScript (à ajouter)

# Python
.\venv\Scripts\Activate.ps1  # Activer venv
python scripts/utils.py qr "IT-ASSET-ABC-001" "output.png"
```

---

## ⚠️ Après modification du schéma Prisma

Si vous modifiez `prisma/schema.prisma` (par ex. ajout du modèle `AuthorizedEmail`), exécutez en local :

```powershell
# Générer et appliquer une migration
npx prisma migrate dev --name add-authorized-email

# Régénérer le client Prisma
npx prisma generate
```

Cette étape est nécessaire pour que l'API et le tableau de bord puissent persister la liste des emails autorisés.


**🎯 Objectif :** Application complète et fonctionnelle en 2-3 semaines  
**📅 Prochaine étape :** Implémenter le module Machines  
**💡 Conseil :** Commencer par le formulaire machine simple, puis ajouter les fonctionnalités avancées
