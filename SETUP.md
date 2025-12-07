# 🚀 Guide de Configuration - IT Inventory Management

## ✅ État Actuel du Projet

Le projet a été initialisé avec succès :
- ✅ Structure Next.js 14 avec App Router
- ✅ TypeScript configuré
- ✅ Tailwind CSS installé
- ✅ Prisma avec schéma complet (14 modèles)
- ✅ Environnement virtuel Python créé
- ✅ Scripts Python pour QR codes et chiffrement
- ✅ Composants UI Shadcn de base
- ✅ NextAuth.js configuré pour Google OAuth
- ✅ Pages d'authentification et dashboard de base

## 📋 Prochaines Étapes

### 1. Configuration de PostgreSQL

Vous devez avoir PostgreSQL installé et créer une base de données :

```sql
-- Se connecter à PostgreSQL
psql -U postgres

-- Créer la base de données
CREATE DATABASE it_inventory;

-- Créer un utilisateur (optionnel)
CREATE USER it_admin WITH ENCRYPTED PASSWORD 'votre_password';
GRANT ALL PRIVILEGES ON DATABASE it_inventory TO it_admin;
```

Ensuite, modifiez le fichier `.env` :
```env
DATABASE_URL="postgresql://it_admin:votre_password@localhost:5432/it_inventory?schema=public"
```

### 2. Initialiser la Base de Données

```powershell
# Générer le client Prisma (déjà fait)
npm run db:generate

# Pousser le schéma vers la base de données
npm run db:push

# OU créer une migration (recommandé pour production)
npm run db:migrate
```

### 3. Configuration Google OAuth

1. Aller sur [Google Cloud Console](https://console.cloud.google.com)
2. Créer un nouveau projet (ou utiliser un existant)
3. Activer l'API "Google+ API"
4. Aller dans "Identifiants" > "Créer des identifiants" > "ID client OAuth 2.0"
5. Type d'application: "Application Web"
6. Ajouter les URIs de redirection autorisés :
   ```
   http://localhost:3000/api/auth/callback/google
   https://votredomaine.com/api/auth/callback/google
   ```
7. Copier le Client ID et Client Secret dans `.env` :
   ```env
   GOOGLE_CLIENT_ID="votre-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="votre-client-secret"
   ```

### 4. Configurer la Clé de Chiffrement

Générer une clé secrète pour NextAuth et le chiffrement :

```powershell
# Générer NEXTAUTH_SECRET (PowerShell)
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)

# Ou avec OpenSSL
openssl rand -base64 32
```

Ajouter dans `.env` :
```env
NEXTAUTH_SECRET="votre-secret-genere"
ENCRYPTION_KEY="votre-cle-de-chiffrement-32-chars"
```

### 5. Créer les Premières Données

Une fois la base de données initialisée, créez les premières compagnies et utilisateurs via Prisma Studio :

```powershell
npm run db:studio
```

Exemple de données à créer :

**Company :**
- name: "Acme Corporation"
- code: "ACM"

**User :**
- firstName: "John"
- lastName: "Doe"
- email: "votre-email@gmail.com" (l'email que vous utiliserez pour Google OAuth)
- companyId: (sélectionner la compagnie créée)
- role: "super_admin"
- office365Subscription: true

**Admin :**
- userId: (sélectionner l'utilisateur créé)
- role: "super_admin"
- companyId: null (pour super admin)

### 6. Lancer l'Application

```powershell
npm run dev
```

L'application sera disponible sur http://localhost:3000

## 📁 Structure des Fichiers Créés

```
f:\Project\
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx         # Page de connexion Google
│   │   └── error/page.tsx         # Page d'erreur auth
│   ├── api/
│   │   └── auth/[...nextauth]/route.ts
│   ├── dashboard/
│   │   ├── layout.tsx             # Layout avec sidebar
│   │   └── page.tsx               # Dashboard principal
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/                        # Composants Shadcn
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── badge.tsx
│       └── sonner.tsx
├── lib/
│   ├── auth.ts                    # Configuration NextAuth
│   ├── db.ts                      # Client Prisma
│   ├── utils.ts                   # Utilitaires généraux
│   ├── inventory.ts               # Gestion codes inventaire
│   ├── crypto.ts                  # Chiffrement via Python
│   └── validators/
│       └── schemas.ts             # Schémas Zod
├── prisma/
│   └── schema.prisma              # Schéma complet (14 modèles)
├── scripts/
│   ├── utils.py                   # Scripts Python (QR, crypto)
│   └── requirements.txt
├── venv/                          # Environnement virtuel Python
├── types/
│   └── next-auth.d.ts            # Types TypeScript NextAuth
├── middleware.ts                  # Middleware d'authentification
├── .env                          # Variables d'environnement
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## 🔧 Fonctionnalités Implémentées

### ✅ Authentification
- Google OAuth via NextAuth.js
- Gestion des rôles (super_admin, company_admin, viewer)
- Middleware de protection des routes
- Isolation des données par compagnie

### ✅ Base de Données
- 14 modèles Prisma :
  - Company, User, Admin
  - Machine, Screen
  - DeliveryNote, DeliveryItem
  - InstallationSheet
  - SoftwareCatalog, SoftwareInstallation
  - InventorySequence
- Relations complètes
- Index optimisés

### ✅ Utilitaires
- Génération codes inventaire (IT-ASSET-ABC-0001)
- Scripts Python pour QR codes
- Chiffrement/déchiffrement données sensibles
- Validation Zod complète

### ✅ Interface
- Dashboard avec statistiques
- Sidebar de navigation
- Composants UI Shadcn
- Mode clair/sombre préparé
- Design responsive

## 🚧 À Développer

Les fonctionnalités suivantes sont prêtes à être implémentées (schémas et structure en place) :

1. **Module Machines**
   - Liste avec filtres et recherche
   - Formulaire création/édition
   - Gestion des écrans multiples
   - Génération QR codes
   - Scan numéros de série

2. **Module Utilisateurs**
   - Liste et gestion
   - Assignation machines
   - Gestion Office 365

3. **Module Bons de Livraison**
   - Création et suivi
   - Réception équipements
   - Upload PDF
   - Lien avec machines

4. **Module Installation**
   - Fiches d'installation
   - Checklist pré-déploiement
   - Configuration réseau
   - Signature numérique

5. **Module Logiciels**
   - Catalogue
   - Gestion licences
   - Suivi utilisation
   - Alertes expiration

6. **Administration**
   - Gestion compagnies
   - Gestion utilisateurs/rôles
   - Rapports et exports

## 🐛 Résolution de Problèmes

### Erreur "Cannot find module"
```powershell
# Réinstaller les dépendances
rm -r node_modules
rm package-lock.json
npm install
```

### Erreur Prisma
```powershell
# Régénérer le client
npm run db:generate
```

### Environnement Python
```powershell
# Réactiver l'environnement
.\venv\Scripts\Activate.ps1

# Réinstaller les dépendances
pip install -r scripts\requirements.txt
```

### Erreur NextAuth
- Vérifier que NEXTAUTH_URL correspond à votre URL
- Vérifier que NEXTAUTH_SECRET est bien défini
- Vérifier les credentials Google OAuth

## 📞 Support

Pour toute question sur l'implémentation :
1. Vérifier la documentation dans README.md
2. Consulter les commentaires dans le code
3. Vérifier le schéma Prisma pour la structure de données
4. Utiliser Prisma Studio pour explorer la base de données

---

**Projet créé le :** 6 décembre 2025  
**Stack :** Next.js 14 + TypeScript + Prisma + PostgreSQL + Python  
**Status :** Base fonctionnelle prête pour développement des modules
