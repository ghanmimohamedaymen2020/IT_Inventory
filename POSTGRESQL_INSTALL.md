# Guide d'Installation PostgreSQL pour Windows

## 📥 Étape 1 : Télécharger PostgreSQL

1. Allez sur https://www.postgresql.org/download/windows/
2. Cliquez sur "Download the installer" (EDB)
3. Téléchargez la version **PostgreSQL 16.x** pour Windows x86-64

**Ou utilisez ce lien direct :**
https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

## 🔧 Étape 2 : Installation

1. **Lancez l'installateur** téléchargé (double-clic)
2. Cliquez sur **Next**

### Configuration :
- **Installation Directory** : Laissez par défaut `C:\Program Files\PostgreSQL\16`
- **Components** : Cochez tout (PostgreSQL Server, pgAdmin 4, Stack Builder, Command Line Tools)
- **Data Directory** : Laissez par défaut `C:\Program Files\PostgreSQL\16\data`
- **Password** : Choisissez un mot de passe fort et **NOTEZ-LE** (ex: `postgres123`)
  ⚠️ **IMPORTANT** : Vous aurez besoin de ce mot de passe !
- **Port** : Laissez **5432** par défaut
- **Locale** : Choisissez **French, France** ou laissez **Default locale**

3. Cliquez sur **Next** jusqu'à **Finish**
4. Décochez "Launch Stack Builder" et cliquez sur **Finish**

## ✅ Étape 3 : Vérifier l'installation

Ouvrez PowerShell et tapez :

```powershell
psql --version
```

Vous devriez voir quelque chose comme : `psql (PostgreSQL) 16.x`

Si la commande n'est pas reconnue, ajoutez PostgreSQL au PATH :
```powershell
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"
```

## 🗄️ Étape 4 : Créer la base de données

### Option A - Via pgAdmin 4 (Interface graphique) :

1. Lancez **pgAdmin 4** depuis le menu Démarrer
2. Cliquez sur **Servers** → **PostgreSQL 16**
3. Entrez le mot de passe que vous avez choisi
4. Clic droit sur **Databases** → **Create** → **Database**
5. Nom : `it_inventory`
6. Cliquez sur **Save**

### Option B - Via ligne de commande :

Ouvrez PowerShell et tapez :

```powershell
# Se connecter à PostgreSQL
psql -U postgres

# Entrez votre mot de passe quand demandé
# Puis tapez ces commandes :

CREATE DATABASE it_inventory;
\l
# Vérifiez que "it_inventory" apparaît dans la liste
\q
# Pour quitter
```

## 🔐 Étape 5 : Configurer votre projet

Ouvrez le fichier `.env` dans votre projet et modifiez :

```env
# Remplacez cette ligne :
DATABASE_URL="postgresql://postgres:password@localhost:5432/it_inventory"

# Par (en utilisant VOTRE mot de passe) :
DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/it_inventory"

# Exemple si votre mot de passe est "postgres123" :
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/it_inventory"
```

## 🚀 Étape 6 : Initialiser la base de données avec Prisma

Dans votre terminal PowerShell (dans le dossier F:\Project), tapez :

```powershell
# Pousser le schéma Prisma vers PostgreSQL
npm run db:push

# Ou directement :
npx prisma db push

# Pour visualiser votre base de données :
npm run db:studio
# Ceci ouvre Prisma Studio sur http://localhost:5555
```

## ✅ Vérification finale

Si tout fonctionne, vous devriez voir :

```
🚀  Your database is now in sync with your Prisma schema. Done in XXXms

✔ Generated Prisma Client
```

## 🔍 Résolution de problèmes

### Erreur : "role 'postgres' does not exist"
```powershell
psql -U postgres -c "CREATE USER postgres WITH PASSWORD 'votre_mot_de_passe' SUPERUSER;"
```

### Erreur : "database 'it_inventory' does not exist"
```powershell
psql -U postgres -c "CREATE DATABASE it_inventory;"
```

### Erreur de connexion
Vérifiez que PostgreSQL est démarré :
- Ouvrez **Services** (Windows + R → `services.msc`)
- Cherchez **postgresql-x64-16**
- Clic droit → **Démarrer** si arrêté

### Impossible de se connecter
Vérifiez `pg_hba.conf` :
```
C:\Program Files\PostgreSQL\16\data\pg_hba.conf
```

Ajoutez cette ligne si nécessaire :
```
host    all             all             127.0.0.1/32            md5
```

Puis redémarrez PostgreSQL.

## 📚 Commandes utiles

```powershell
# Se connecter à PostgreSQL
psql -U postgres -d it_inventory

# Lister les bases de données
\l

# Lister les tables
\dt

# Se connecter à une base
\c it_inventory

# Voir la structure d'une table
\d nom_de_table

# Quitter
\q

# Redémarrer PostgreSQL
net stop postgresql-x64-16
net start postgresql-x64-16
```

## 🎯 Prochaines étapes

Une fois PostgreSQL installé et configuré :

1. ✅ Modifiez `.env` avec vos identifiants
2. ✅ Lancez `npm run db:push`
3. ✅ Redémarrez votre serveur Next.js : `npm run dev`
4. ✅ L'application utilisera maintenant PostgreSQL au lieu du mode dev !

---

**Besoin d'aide ?** Si vous rencontrez des erreurs, copiez le message d'erreur complet et je vous aiderai à le résoudre.
