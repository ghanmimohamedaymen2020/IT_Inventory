# Script d'importation de données Excel

Ce script permet d'importer des données depuis un fichier Excel dans la base de données.

## Structure attendue du fichier Excel

Le fichier Excel doit contenir les colonnes suivantes :

| Colonne | Description | Obligatoire |
|---------|-------------|-------------|
| Service | Département (DocumentationTG, Documentation GT, etc.) | Oui |
| Utilisateur | Nom complet de l'utilisateur (Prénom Nom) | Non |
| Type | Type de machine (Laptop, Desktop, PC) | Oui |
| Constructeur | Marque/Fabricant (HP, Dell, Lenovo, etc.) | Non |
| Model | Modèle de la machine | Non |
| date d'acqusition | Date d'acquisition | Non |
| S/N | Numéro de série de la machine | Oui |
| Nom de machine | Nom de la machine | Non |
| Ticket inventaire | Numéro de ticket d'inventaire | Non |
| ECRAN | Informations sur l'écran | Non |
| version Windows | Version de Windows | Non |
| Garantie | Date de fin de garantie | Non |
| clé Produit | Clé de licence Windows | Non |
| CPU/RAM/Hard Drive | Spécifications (format: CPU/RAM/Disque) | Non |
| Inventaire UC | Code inventaire de l'unité centrale | Non |
| Inventaire  Ecran | Code inventaire de l'écran | Non |
|  Ecran 1 :  S/N | Numéro de série écran 1 | Non |
|  Ecran 2 :  S/N | Numéro de série écran 2 | Non |

## Mapping des services

Le script convertit automatiquement :
- `DocumentationTG` ou `Documentation TG` → **Documentation Transglory**
- `DocumentationGT` ou `Documentation GT` → **Documentation Green Tunisie**

Les machines seront assignées à la compagnie correspondante.

## Utilisation

1. **Placer votre fichier Excel** dans un dossier accessible

2. **Exécuter le script** :
```bash
npx ts-node scripts/import-excel-data.ts chemin/vers/votre/fichier.xlsx
```

Exemple :
```bash
npx ts-node scripts/import-excel-data.ts F:\data\inventaire.xlsx
```

## Comportement du script

### Création d'utilisateurs
- Si un utilisateur n'existe pas, il sera créé automatiquement
- Email temporaire généré : `prenom.nom@temp.com`
- Département = Service du fichier Excel

### Création de machines
- Si la machine existe déjà (même S/N), elle sera **mise à jour**
- Statut automatique :
  - `affecté` si assignée à un utilisateur
  - `en_stock` sinon
- Code inventaire généré si manquant : `M{timestamp}`

### Création d'écrans
- Jusqu'à 2 écrans par ligne peuvent être importés
- Si l'écran existe déjà (même S/N), il sera **ignoré**
- Code inventaire généré si manquant : `S{timestamp}-{random}`

## Exemple de fichier Excel

```
Service          | Utilisateur   | Type   | Constructeur | S/N         | ...
DocumentationTG  | Ahmed Ben Ali | Laptop | HP           | HP123456    | ...
Documentation GT | Sara Trabelsi | Desktop| Dell         | DELL789012  | ...
```

## Logs

Le script affiche des logs détaillés :
- ✅ Succès (création/mise à jour)
- ⚠️  Avertissements (données manquantes, doublons)
- ❌ Erreurs

## Résultat final

À la fin de l'importation, vous verrez :
```
==================================================
✅ Importation terminée: 45 lignes traitées, 2 erreurs
```
