# IT Inventory Management System

## 🚀 Installation

### Prérequis
- Node.js 18+
- PostgreSQL 14+
- Python 3.9+ (pour scripts utilitaires)

### 1. Installation des dépendances Node.js

```powershell
npm install
```

### 2. Configuration de l'environnement virtuel Python

```powershell
# Créer l'environnement virtuel
python -m venv venv

# Activer l'environnement virtuel
.\venv\Scripts\Activate.ps1

# Installer les dépendances Python
pip install -r scripts\requirements.txt
```

### 3. Configuration de la base de données

1. Créer une base de données PostgreSQL :
```sql
CREATE DATABASE it_inventory;
```

2. Modifier le fichier `.env` avec vos paramètres :
```
DATABASE_URL="postgresql://user:password@localhost:5432/it_inventory?schema=public"
```

3. Générer le client Prisma et pousser le schéma :
```powershell
npm run db:generate
npm run db:push
```

### 4. Configuration Google OAuth

1. Aller sur [Google Cloud Console](https://console.cloud.google.com)
2. Créer un nouveau projet
3. Activer Google+ API
4. Créer des identifiants OAuth 2.0
5. Ajouter les URIs de redirection autorisés :
   - `http://localhost:3000/api/auth/callback/google`
   - `https://votredomaine.com/api/auth/callback/google`
6. Copier Client ID et Client Secret dans `.env`

### 5. Lancement de l'application

```powershell
npm run dev
```

L'application sera accessible sur http://localhost:3000

## 📋 Scripts disponibles

- `npm run dev` - Lancement en mode développement
- `npm run build` - Build de production
- `npm run start` - Lancement de production
- `npm run db:generate` - Génération du client Prisma
- `npm run db:push` - Push du schéma vers la base
- `npm run db:studio` - Interface Prisma Studio
- `npm run db:migrate` - Création de migration

## 🏗️ Structure du projet

```
/app                    # Application Next.js (App Router)
  /(auth)              # Pages d'authentification
  /(dashboard)         # Pages principales (protégées)
  /api                 # API Routes
/components            # Composants React
  /ui                  # Composants Shadcn
/lib                   # Utilitaires et configurations
/prisma                # Schéma et migrations base de données
/scripts               # Scripts Python (QR codes, chiffrement)
/public                # Fichiers statiques
```

## 🔐 Rôles et permissions

- **Super Admin** : Accès total à toutes les compagnies
- **Company Admin** : Gestion complète de sa compagnie uniquement
- **Viewer** : Lecture seule

## 📦 Fonctionnalités principales

- ✅ Gestion machines (ordinateurs, serveurs)
- ✅ Gestion utilisateurs
- ✅ Bons de livraison
- ✅ Fiches d'installation
- ✅ Catalogue logiciels et licences
- ✅ Codes inventaire uniques avec QR codes
- ✅ Scan de numéros de série
- ✅ Authentification Google OAuth
- ✅ Multi-compagnies avec isolation des données
- ✅ Rapports et exports

## 🛠️ Technologies utilisées

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **UI Components**: Shadcn/UI, Radix UI
- **Backend**: Next.js API Routes, Prisma ORM
- **Base de données**: PostgreSQL
- **Authentification**: NextAuth.js
- **Scripts**: Python (QR codes, chiffrement)
