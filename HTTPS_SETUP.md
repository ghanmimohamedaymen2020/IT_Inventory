# Configuration HTTPS pour le développement

Ce guide explique comment activer HTTPS en développement local.

## Pourquoi HTTPS en développement ?

- Test des fonctionnalités qui nécessitent HTTPS (caméra, géolocalisation, etc.)
- Simulation de l'environnement de production
- Éviter les avertissements de sécurité du navigateur
- OAuth et authentification Google nécessitent HTTPS

## Installation

### Option 1 : mkcert (Recommandé)

mkcert génère des certificats SSL de confiance automatiquement reconnus par votre système.

```powershell
# Installer mkcert avec Chocolatey
choco install mkcert

# Ou télécharger depuis : https://github.com/FiloSottile/mkcert/releases
```

### Option 2 : OpenSSL

```powershell
# Installer OpenSSL avec Chocolatey
choco install openssl
```

## Génération des certificats

Une fois mkcert ou OpenSSL installé :

```powershell
npm run certs:generate
```

Ce script va :
1. Détecter automatiquement mkcert ou OpenSSL
2. Générer les certificats dans le dossier `certificates/`
3. Installer l'autorité de certification locale (si mkcert)

## Démarrer le serveur HTTPS

```powershell
# Développement avec HTTPS
npm run dev:https

# Production avec HTTPS
npm run start:https
```

Le serveur sera disponible sur : **https://localhost:3000**

## Développement HTTP classique

Pour continuer à utiliser HTTP (sans certificat) :

```powershell
npm run dev
```

Le serveur sera disponible sur : **http://localhost:3000**

## Avertissement de sécurité

### Avec mkcert
Aucun avertissement, les certificats sont automatiquement approuvés.

### Avec OpenSSL (certificat auto-signé)
Votre navigateur affichera un avertissement. Pour continuer :

**Chrome/Edge:**
1. Cliquez sur "Paramètres avancés"
2. Cliquez sur "Continuer vers localhost (dangereux)"

**Firefox:**
1. Cliquez sur "Avancé"
2. Cliquez sur "Accepter le risque et continuer"

## Fichiers générés

```
certificates/
  ├── localhost.pem       # Certificat SSL
  └── localhost-key.pem   # Clé privée
```

⚠️ **Ces fichiers sont dans .gitignore et ne seront pas committés.**

## Configuration de l'environnement

Pour forcer l'utilisation de HTTPS dans votre application, ajoutez dans `.env` :

```env
NEXTAUTH_URL=https://localhost:3000
```

## Dépannage

### Port déjà utilisé
Si le port 3000 est occupé, modifiez `server.js` :

```javascript
const port = 3001 // Changez le port
```

### Certificats expirés
Les certificats générés sont valides 365 jours. Pour régénérer :

```powershell
npm run certs:generate
```

### Erreur "module not found"
Installez les dépendances manquantes :

```powershell
npm install
```

## Scripts disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Serveur HTTP classique (port 3000) |
| `npm run dev:https` | Serveur HTTPS avec certificats (port 3000) |
| `npm run certs:generate` | Générer les certificats SSL |
| `npm run start:https` | Production HTTPS |

## Production

En production, utilisez un vrai certificat SSL fourni par :
- Let's Encrypt (gratuit)
- Cloudflare
- Votre hébergeur

Ne pas utiliser les certificats auto-signés en production !
