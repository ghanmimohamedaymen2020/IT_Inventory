import { z } from 'zod'

// Validation pour Machine
export const machineSchema = z.object({
  inventoryCode: z.string().optional(), // Généré automatiquement
  serialNumber: z.string().min(1, "Le numéro de série est requis"),
  machineName: z.string().min(1, "Le nom de la machine est requis"),
  type: z.enum(['Laptop', 'Desktop', 'Server'], {
    errorMap: () => ({ message: "Type invalide" })
  }),
  vendor: z.enum(['DELL', 'Lenovo', 'HP', 'Microsoft', 'Other'], {
    errorMap: () => ({ message: "Fournisseur invalide" })
  }),
  model: z.string().min(1, "Le modèle est requis"),
  acquisitionDate: z.coerce.date(),
  windowsVersion: z.string().optional(),
  productKey: z.string().optional(),
  cpu: z.string().optional(),
  ram: z.string().optional(),
  disk: z.string().optional(),
  inventoryTicket: z.boolean().default(false),
  warrantyDate: z.coerce.date().optional().nullable(),
  assetStatus: z.enum(['en_stock', 'en_service', 'maintenance', 'retiré']).default('en_stock'),
  companyId: z.string().min(1, "La compagnie est requise"),
  userId: z.string().optional().nullable(),
  deliveryNoteId: z.string().optional().nullable(),
})

export type MachineFormData = z.infer<typeof machineSchema>

// Validation pour Screen
export const screenSchema = z.object({
  brand: z.string().min(1, "La marque est requise"),
  serialNumber: z.string().min(1, "Le numéro de série est requis"),
  inventoryCode: z.string().optional(), // Généré automatiquement
  model: z.string().optional(),
  size: z.string().optional(),
  machineId: z.string().min(1, "L'ID de la machine est requis"),
})

export type ScreenFormData = z.infer<typeof screenSchema>

// Validation pour User
export const userSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  companyId: z.string().min(1, "La compagnie est requise"),
  office365Subscription: z.boolean().default(false),
  emailLogin: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['super_admin', 'company_admin', 'viewer']).default('viewer'),
})

export type UserFormData = z.infer<typeof userSchema>

// Validation pour Company
export const companySchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  code: z.string()
    .min(2, "Le code doit contenir au moins 2 caractères")
    .max(4, "Le code doit contenir au maximum 4 caractères")
    .regex(/^[A-Z]+$/, "Le code doit contenir uniquement des majuscules"),
})

export type CompanyFormData = z.infer<typeof companySchema>

// Validation pour DeliveryNote
export const deliveryNoteSchema = z.object({
  noteNumber: z.string().optional(), // Généré automatiquement
  vendor: z.string().min(1, "Le fournisseur est requis"),
  deliveryDate: z.coerce.date(),
  purchaseOrderRef: z.string().optional(),
  status: z.enum(['pending', 'partial', 'complete']).default('pending'),
  receivedBy: z.string().optional(),
  notes: z.string().optional(),
  companyId: z.string().min(1, "La compagnie est requise"),
})

export type DeliveryNoteFormData = z.infer<typeof deliveryNoteSchema>

// Validation pour DeliveryItem
export const deliveryItemSchema = z.object({
  description: z.string().min(1, "La description est requise"),
  quantity: z.number().int().positive("La quantité doit être positive"),
  unitPrice: z.number().optional(),
  expectedSerial: z.string().optional(),
  receivedSerial: z.string().optional(),
  status: z.enum(['expected', 'received', 'missing']).default('expected'),
  deliveryNoteId: z.string().min(1, "L'ID du bon de livraison est requis"),
})

export type DeliveryItemFormData = z.infer<typeof deliveryItemSchema>

// Validation pour SoftwareCatalog
export const softwareCatalogSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  version: z.string().min(1, "La version est requise"),
  vendor: z.string().min(1, "Le fournisseur est requis"),
  licenseType: z.enum(['Perpetual', 'Subscription', 'OpenSource']),
  licenseKey: z.string().optional(),
  seatsAvailable: z.number().int().positive("Le nombre de sièges doit être positif"),
  expirationDate: z.coerce.date().optional().nullable(),
  purchaseDate: z.coerce.date().optional().nullable(),
  purchasePrice: z.number().optional().nullable(),
  companyId: z.string().min(1, "La compagnie est requise"),
})

export type SoftwareCatalogFormData = z.infer<typeof softwareCatalogSchema>

// Validation pour InstallationSheet
export const installationSheetSchema = z.object({
  installationDate: z.coerce.date(),
  technicianId: z.string().min(1, "Le technicien est requis"),
  networkConfig: z.object({
    ip: z.string().optional(),
    mac: z.string().optional(),
    hostname: z.string().optional(),
    domain: z.string().optional(),
  }),
  softwareInstalled: z.array(z.object({
    name: z.string(),
    version: z.string(),
    date: z.string(),
  })),
  customApplications: z.any().optional(),
  preDeploymentChecklist: z.object({
    windowsUpdates: z.boolean(),
    antivirus: z.boolean(),
    backup: z.boolean(),
    drivers: z.boolean(),
    officeActivation: z.boolean(),
  }),
  notes: z.string().optional(),
  machineId: z.string().min(1, "L'ID de la machine est requis"),
})

export type InstallationSheetFormData = z.infer<typeof installationSheetSchema>
