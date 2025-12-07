# Système de Gestion des Logos de Société

## 📋 Résumé des Modifications

### 1. **Schéma de Base de Données** ✅
- Ajout du champ `logoPath` (String?) au modèle `Company`
- Stockage du chemin du logo : `/logos/CODE-timestamp.ext`

### 2. **Sécurité et Authentification** ✅
- **Middleware mis à jour** : Seuls `super_admin` et `company_admin` peuvent se connecter
- Les utilisateurs normaux (`user`) sont bloqués au niveau du middleware
- Message d'erreur : "Accès refusé. Seuls les administrateurs peuvent se connecter."

### 3. **API de Gestion des Logos** ✅
**Route** : `/api/companies/[id]/logo`

#### POST - Upload Logo
- **Autorisation** : `super_admin` uniquement
- **Formats acceptés** : PNG, JPG, JPEG, WEBP
- **Taille max** : 5 MB
- **Stockage** : `public/logos/`
- **Nom de fichier** : `{CODE}-{timestamp}.{ext}`
- Supprime automatiquement l'ancien logo s'il existe

#### DELETE - Supprimer Logo
- **Autorisation** : `super_admin` uniquement
- Supprime le fichier du disque
- Met à jour `logoPath` à `null` dans la BD

### 4. **API Companies** ✅
**Route** : `/api/companies`

#### GET - Liste des Sociétés
- **Autorisation** : `super_admin` et `company_admin`
- Retourne : id, name, code, logoPath, createdAt

#### POST - Créer Société
- **Autorisation** : `super_admin` uniquement
- Vérifie l'unicité du nom et du code

### 5. **Interface de Gestion** ✅
**Page** : `/dashboard/admin/companies`

#### Fonctionnalités :
- ✅ Affichage de toutes les sociétés avec leurs logos
- ✅ Upload de logo par glisser-déposer
- ✅ Prévisualisation du logo
- ✅ Modification du logo existant
- ✅ Suppression du logo
- ✅ Indication visuelle : "Ce logo apparaîtra sur tous les bons de livraison"

#### Accès :
- **Menu latéral** : Lien "Sociétés" visible uniquement pour `super_admin`

### 6. **Intégration Bons de Livraison** 🎯

Le logo sera automatiquement inclus dans les bons de livraison via :
```typescript
// Dans le template du bon de livraison
const company = await prisma.company.findUnique({
  where: { id: deliveryNote.companyId },
  select: { logoPath: true, name: true }
})

// Affichage du logo
{company.logoPath && (
  <Image 
    src={company.logoPath} 
    alt={company.name}
    width={200}
    height={80}
  />
)}
```

## 🚀 Utilisation

### Pour le Super Admin :

1. **Se connecter** avec un compte `super_admin`
2. **Naviguer** vers "Sociétés" dans le menu
3. **Uploader** un logo pour chaque société :
   - Cliquer sur "Ajouter un logo" ou "Modifier"
   - Sélectionner un fichier PNG/JPG/WEBP (max 5MB)
   - Le logo s'upload automatiquement
4. **Le logo apparaîtra automatiquement** sur tous les bons de livraison de cette société

### Pour le Company Admin :
- Peut **voir** les sociétés et leurs logos
- **Ne peut pas** modifier les logos (réservé au super_admin)

## 📁 Structure des Fichiers

```
F:\Project\
├── public/
│   └── logos/                          # Logos uploadés
│       ├── DEV-1733580123456.png
│       └── ABC-1733580234567.jpg
│
├── prisma/
│   └── schema.prisma                   # + logoPath dans Company
│
├── app/
│   ├── api/
│   │   └── companies/
│   │       ├── route.ts                # GET, POST companies
│   │       └── [id]/
│   │           └── logo/
│   │               └── route.ts        # POST, DELETE logo
│   │
│   └── dashboard/
│       └── admin/
│           └── companies/
│               └── page.tsx            # Interface de gestion
│
└── middleware.ts                       # Protection accès (super_admin + company_admin)
```

## ⚙️ Commandes à Exécuter

```bash
# Mettre à jour la base de données
npx prisma db push

# Le serveur dev devrait redémarrer automatiquement
npm run dev
```

## 🔒 Permissions

| Rôle            | Voir Sociétés | Upload Logo | Supprimer Logo | Créer Société |
|-----------------|---------------|-------------|----------------|---------------|
| `super_admin`   | ✅            | ✅          | ✅             | ✅            |
| `company_admin` | ✅            | ❌          | ❌             | ❌            |
| `user`          | ❌ Bloqué     | ❌ Bloqué   | ❌ Bloqué      | ❌ Bloqué     |

## 📝 Prochaines Étapes

- [ ] Exécuter `npx prisma db push` dans un terminal séparé
- [ ] Tester l'upload d'un logo sur `/dashboard/admin/companies`
- [ ] Créer le template du bon de livraison avec intégration du logo
- [ ] Générer des bons de livraison PDF avec le logo de la société

## 🎯 Objectif Final

Lorsqu'un bon de livraison est généré, le système :
1. Récupère automatiquement la société associée
2. Charge le logo depuis `company.logoPath`
3. Intègre le logo en haut du document
4. Génère le PDF avec l'en-tête personnalisé

---

**Note** : Tous les utilisateurs normaux (`role: 'user'`) sont maintenant bloqués. Seuls les administrateurs peuvent accéder à l'application.
