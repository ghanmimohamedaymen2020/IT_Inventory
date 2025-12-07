# Documentation des Fonctionnalités Avancées

## 🎯 Fonctionnalités Implémentées

### 1. Scanner de Numéros de Série

**Composant:** `components/machines/serial-scanner.tsx`

**Fonctionnalités:**
- ✅ Activation de la caméra pour scanner des numéros de série
- ✅ Capture d'image avec zone de détection visuelle
- ✅ Saisie manuelle en backup
- ✅ Historique des 5 derniers scans
- ✅ Callback pour remplir automatiquement les formulaires

**Utilisation:**
```tsx
import { SerialScanner } from "@/components/machines/serial-scanner"

<SerialScanner 
  onSerialDetected={(serial) => {
    // Remplir automatiquement le champ S/N
    setValue("serialNumber", serial)
  }}
/>
```

**Note:** Pour la reconnaissance OCR réelle, intégrer Tesseract.js ou une API cloud (Google Vision, AWS Textract)

---

### 2. Générateur de QR Codes

**Composant:** `components/machines/qr-code-generator.tsx`
**API:** `app/api/qrcode/generate/route.ts`

**Fonctionnalités:**
- ✅ Génération de QR codes via script Python
- ✅ Encodage de données JSON (ID, code inventaire, S/N)
- ✅ Prévisualisation du QR code
- ✅ Téléchargement en PNG
- ✅ Impression directe avec en-tête

**Utilisation:**
```tsx
import { QRCodeGenerator } from "@/components/machines/qr-code-generator"

<QRCodeGenerator 
  machineId="123"
  inventoryCode="INV-2025-0001"
  serialNumber="ABC123456"
/>
```

**Script Python:** `scripts/utils.py`
```bash
# Générer manuellement un QR code
python scripts/utils.py generate-qr "données" "output.png"
```

---

### 3. Système d'Export Multi-Format

**Composant:** `components/exports/export-menu.tsx`
**APIs:** 
- `app/api/export/excel/route.ts`
- `app/api/export/pdf/route.ts`

**Formats supportés:**
- ✅ CSV - Export direct côté client
- ✅ Excel (.xlsx) - Via API serveur
- ✅ PDF - Génération HTML avec mise en forme
- ✅ JSON - Export brut des données

**Utilisation:**
```tsx
import { ExportMenu } from "@/components/exports/export-menu"

<ExportMenu 
  data={machines}
  filename="parc-informatique-2025"
  type="machines"
/>
```

**Intégration recommandée:**
- Pour Excel professionnel: `exceljs` ou `xlsx`
- Pour PDF avancé: `jspdf` ou `pdfkit`

---

### 4. Tableaux de Bord et Statistiques

**Composant:** `components/reports/dashboard-stats.tsx`

**Graphiques inclus:**
- ✅ **Pie Chart** - Répartition des machines par type
- ✅ **Bar Chart** - Statut des machines (actif, maintenance, retiré)
- ✅ **Line Chart** - Évolution des livraisons sur 6 mois

**Technologies:**
- Recharts pour les graphiques réactifs
- Calculs automatiques de pourcentages
- Responsive design

**Utilisation:**
```tsx
import { DashboardStats } from "@/components/reports/dashboard-stats"

<DashboardStats 
  machines={allMachines}
  users={allUsers}
  deliveryNotes={allDeliveryNotes}
/>
```

---

## 🚀 Intégration dans les Pages

### Page Machines (`/dashboard/machines`)
```tsx
import { ExportMenu } from "@/components/exports/export-menu"

// Ajout du bouton export dans la toolbar
<ExportMenu data={machines} filename="machines" type="machines" />
```

### Page Création Machine (`/dashboard/machines/create`)
```tsx
import { SerialScanner } from "@/components/machines/serial-scanner"
import { QRCodeGenerator } from "@/components/machines/qr-code-generator"

// Scanner pour auto-remplir le S/N
<SerialScanner onSerialDetected={(sn) => setValue("serialNumber", sn)} />

// Générer QR après création
<QRCodeGenerator machineId={machine.id} inventoryCode={machine.code} />
```

### Dashboard Principal (`/dashboard`)
```tsx
import { DashboardStats } from "@/components/reports/dashboard-stats"

// Afficher les statistiques visuelles
<DashboardStats machines={data.machines} users={data.users} deliveryNotes={data.notes} />
```

---

## 📦 Dépendances Requises

```json
{
  "@radix-ui/react-dropdown-menu": "^2.0.0",
  "recharts": "^2.10.0",
  "@hookform/resolvers": "^3.3.0"
}
```

**Installation:**
```bash
npm install @radix-ui/react-dropdown-menu recharts @hookform/resolvers
```

---

## 🐍 Configuration Python

**Script:** `scripts/utils.py`

**Commandes disponibles:**
```bash
# Générer QR code
python utils.py generate-qr "data" "output.png"

# Chiffrer données
python utils.py encrypt "secret data"

# Déchiffrer
python utils.py decrypt "encrypted_data"
```

**Dépendances:**
```txt
qrcode==7.4.2
Pillow==10.4.0
cryptography==42.0.8
```

---

## 🔒 Sécurité

### QR Codes
- Données encodées en JSON
- Timestamp inclus pour traçabilité
- Possibilité de chiffrer les données sensibles

### Exports
- Vérification de session avant export
- Filtrage des données selon les permissions
- Logs des exports (à implémenter)

---

## 📈 Prochaines Améliorations

### Scanner de S/N
- [ ] Intégration Tesseract.js pour OCR réel
- [ ] Support scan de codes-barres
- [ ] Mode batch (scan multiple)

### QR Codes
- [ ] Chiffrement des données dans le QR
- [ ] QR codes colorés avec logo
- [ ] Génération massive (export CSV → QR codes)

### Exports
- [ ] Planification d'exports automatiques
- [ ] Templates personnalisés pour PDF
- [ ] Export vers Google Sheets / Excel Online

### Rapports
- [ ] Rapports personnalisables
- [ ] Filtres par date/catégorie
- [ ] Export automatique par email
- [ ] Alertes sur seuils (garanties, maintenances)

---

## 🎨 Personnalisation

### Styles des Graphiques
Modifier les couleurs dans `dashboard-stats.tsx`:
```tsx
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]
```

### Format des QR Codes
Ajuster la taille dans `qr-code-generator.tsx`:
```tsx
<img className="w-64 h-64" /> // Changer w-64 h-64
```

### Templates d'Export
Personnaliser le HTML dans `app/api/export/pdf/route.ts`

---

## 📞 Support

Pour toute question ou bug, vérifier:
1. Logs du serveur (`npm run dev`)
2. Console navigateur (F12)
3. Environnement Python (`venv` activé)
4. Variables d'environnement (`.env`)

---

**Date de dernière mise à jour:** 6 décembre 2025
**Version:** 1.0.0
