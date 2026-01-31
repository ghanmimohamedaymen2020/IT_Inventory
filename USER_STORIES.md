# User Stories (format Jira / Markdown)

## US-001 — Connexion via Google (OAuth)
- **En tant que** utilisateur
- **Je veux** me connecter avec mon compte Google
- **Afin de** accéder rapidement à l'application sans gérer un mot de passe spécifique

### Critères d'acceptation
- Given: l'utilisateur clique sur "Se connecter avec Google"
- When: NextAuth redirige vers Google et revient au callback
- Then: l'utilisateur est créé/associé en base (Prisma) et reçoit une session valide

## US-002 — Afficher la liste des sociétés
- **En tant que** Admin/Manager
- **Je veux** voir la liste des sociétés accessibles
- **Afin de** pouvoir choisir la société sur laquelle opérer

### Critères d'acceptation
- Given: utilisateur authentifié
- When: il visite la page sociétés
- Then: `GET /api/companies` renvoie un tableau JSON d'objets société (200)
- And: en cas de 401, l'UI affiche un message explicite

## US-003 — Créer/éditer une société
- **En tant que** Admin
- **Je veux** créer ou modifier une société (nom, adresse, logo)
- **Afin de** gérer les entités clientes

### Critères d'acceptation
- Given: formulaire complété
- When: soumission du formulaire
- Then: `POST/PUT /api/companies` persiste la société et renvoie l'objet créé

## US-004 — Importer des machines via CSV
- **En tant que** Admin
- **Je veux** importer un fichier CSV de machines
- **Afin de** charger massivement les machines sans saisie manuelle

### Critères d'acceptation
- Given: CSV upload
- When: l'API `app/api/machines/import/route.ts` parse le fichier
- Then: les lignes valides sont insérées, les lignes invalides renvoient un rapport d'erreur

## US-005 — Créer une intervention
- **En tant que** Manager/Technicien
- **Je veux** créer une intervention liée à une machine
- **Afin de** planifier l'intervention et garder l'historique

### Critères d'acceptation
- Given: formulaire d'intervention complété
- When: création via `POST /api/interventions`
- Then: intervention créée, liée à la machine et à l'utilisateur

## US-006 — Saisir consommation et ajuster stock de consommables
- **En tant que** Technicien
- **Je veux** enregistrer la consommation de pièces et ajuster le stock
- **Afin de** maintenir un suivi précis des consommables

### Critères d'acceptation
- Given: accès au formulaire d'ajustement
- When: soumission
- Then: l'API met à jour les quantités et fournit un historique

## US-007 — Générer et télécharger une fiche d'intervention en PDF
- **En tant que** Technicien/Manager
- **Je veux** exporter la fiche d'intervention en PDF
- **Afin de** l'archiver ou l'imprimer

### Critères d'acceptation
- Given: intervention valide
- When: l'utilisateur demande l'export
- Then: `POST /api/export/pdf` renvoie un fragment HTML utilisable par l'outil de conversion en PDF

## US-008 — Gérer les utilisateurs (CRUD + import)
- **En tant que** Admin
- **Je veux** ajouter/modifier/supprimer et importer des utilisateurs
- **Afin de** gérer les accès et responsabilités

### Critères d'acceptation
- Given: utilisateur authentifié avec droits Admin
- When: opérations CRUD ou import
- Then: les changements sont persistés via `app/api/users/*` et renvoyés au frontend

---
Pour chaque story je peux générer des tickets Jira formatés (summary, description, acceptance criteria) avec une numérotation personnalisée et estimation en story points — veux-tu que je les exporte au format CSV ou JSON pour import dans Jira ?