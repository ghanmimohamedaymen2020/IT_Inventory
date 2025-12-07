# Configuration Google OAuth - Guide Rapide

## 🔧 Étape par Étape

### 1. Aller sur Google Cloud Console
https://console.cloud.google.com

### 2. Créer un projet (ou utiliser existant)
- Cliquer sur le sélecteur de projet en haut
- "Nouveau projet"
- Nom : "IT Inventory Management"
- Créer

### 3. Activer l'API Google+
- Menu hamburger → "APIs & Services" → "Library"
- Rechercher "Google+ API"
- Cliquer et "Activer"

### 4. Créer les identifiants OAuth
- "APIs & Services" → "Identifiants"
- "Créer des identifiants" → "ID client OAuth 2.0"

### 5. Configurer l'écran de consentement (si demandé)
- Type : Externe
- Nom de l'application : "IT Inventory Management"
- Email assistance utilisateur : votre email
- Domaines autorisés : localhost
- Enregistrer

### 6. Créer l'ID client OAuth
- Type d'application : **Application Web**
- Nom : "IT Inventory Web App"
- **URIs de redirection autorisés :** (IMPORTANT)
  ```
  http://localhost:3000/api/auth/callback/google
  ```
- Créer

### 7. Copier les identifiants
Vous obtiendrez :
- **Client ID** : quelquechose.apps.googleusercontent.com
- **Client Secret** : GOCSPX-xxxxxxxxxxxxx

### 8. Mettre à jour le fichier .env

Ouvrez `f:\Project\.env` et ajoutez :

```env
GOOGLE_CLIENT_ID="votre-client-id-ici.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-votre-secret-ici"
```

### 9. Redémarrer le serveur

```powershell
# Arrêter le serveur (Ctrl+C dans le terminal)
# Puis relancer
npm run dev
```

## ⚠️ Note Importante

Le code a été modifié temporairement pour créer automatiquement :
- Une compagnie "DEFAULT" 
- Un utilisateur avec le rôle "super_admin"
- Un enregistrement Admin

Lors de votre première connexion, vous serez automatiquement administrateur !

## 🔒 Sécurité

**Ne commitez JAMAIS le fichier .env dans Git !**
Il est déjà dans .gitignore.
