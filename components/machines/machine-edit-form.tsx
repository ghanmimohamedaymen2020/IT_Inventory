"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"

// Spécifications techniques selon le type de machine
const MACHINE_SPECS = {
  'Laptop': {
    fields: [
      { name: 'cpu', label: 'Processeur', type: 'text', placeholder: 'Intel Core i5-1135G7' },
      { name: 'ram', label: 'RAM', type: 'text', placeholder: '8GB DDR4' },
      { name: 'disk', label: 'Stockage', type: 'text', placeholder: '256GB SSD' },
      { name: 'screenSize', label: 'Taille écran', type: 'text', placeholder: '14 pouces' },
      { name: 'battery', label: 'Batterie', type: 'text', placeholder: '45Wh' },
      { name: 'windowsVersion', label: 'OS Windows', type: 'text', placeholder: 'Windows 11 Pro' },
    ]
  },
  'Desktop': {
    fields: [
      { name: 'cpu', label: 'Processeur', type: 'text', placeholder: 'Intel Core i7-12700' },
      { name: 'ram', label: 'RAM', type: 'text', placeholder: '16GB DDR4' },
      { name: 'disk', label: 'Stockage', type: 'text', placeholder: '512GB SSD + 1TB HDD' },
      { name: 'gpu', label: 'Carte graphique', type: 'text', placeholder: 'NVIDIA GTX 1650' },
      { name: 'psu', label: 'Alimentation', type: 'text', placeholder: '500W' },
      { name: 'windowsVersion', label: 'OS Windows', type: 'text', placeholder: 'Windows 11 Pro' },
    ]
  },
  'Server': {
    fields: [
      { name: 'cpu', label: 'Processeur', type: 'text', placeholder: 'Intel Xeon E-2388G' },
      { name: 'ram', label: 'RAM', type: 'text', placeholder: '32GB ECC DDR4' },
      { name: 'disk', label: 'Stockage', type: 'text', placeholder: '2x 1TB SSD RAID1' },
      { name: 'raidType', label: 'RAID', type: 'text', placeholder: 'RAID 1' },
      { name: 'networkPorts', label: 'Ports réseau', type: 'text', placeholder: '2x 1Gbps' },
      { name: 'windowsVersion', label: 'OS', type: 'text', placeholder: 'Windows Server 2022' },
    ]
  },
  'Tablet': {
    fields: [
      { name: 'screenSize', label: 'Taille écran', type: 'text', placeholder: '10.2 pouces' },
      { name: 'ram', label: 'RAM', type: 'text', placeholder: '4GB' },
      { name: 'disk', label: 'Stockage', type: 'text', placeholder: '64GB' },
      { name: 'os', label: 'Système', type: 'text', placeholder: 'Android 13' },
      { name: 'connectivity', label: 'Connectivité', type: 'text', placeholder: 'WiFi + 4G' },
    ]
  },
  'Écran': {
    fields: [
      { name: 'screenSize', label: 'Taille', type: 'select', options: ['19"', '20"', '21.5"', '22"', '23"', '23.8"', '24"', '27"', '32"', '34"', '43"', '49"'] },
      { name: 'screenResolution', label: 'Résolution', type: 'select', options: ['1366x768', '1600x900', '1920x1080', '2560x1440', '3840x2160'] },
    ]
  },
} as const

const machineSchema = z.object({
  machineName: z.string().min(1, "Le nom de la machine est requis"),
  serialNumber: z.string().min(1, "Le numéro de série est requis"),
  type: z.string().min(1, "Le type de machine est requis"),
  vendor: z.enum(["DELL", "Lenovo", "HP", "Microsoft"], {
    errorMap: () => ({ message: "Fournisseur invalide" }),
  }),
  model: z.string().min(1, "Le modèle est requis"),
  acquisitionDate: z.string().min(1, "La date d'acquisition est requise"),
  windowsVersion: z.string().optional(),
  productKey: z.string().optional(),
  cpu: z.string().optional(),
  ram: z.string().optional(),
  disk: z.string().optional(),
  warrantyDate: z.string().optional(),
  assetStatus: z.enum(["en_stock", "en_service", "maintenance", "retiré"], {
    errorMap: () => ({ message: "Statut invalide" }),
  }),
  userId: z.string().optional(),
  companyId: z.string().min(1, "La société est requise"),
  inventoryTicket: z.boolean().default(false),
  screenId: z.string().optional(),
})

type MachineFormData = z.infer<typeof machineSchema>

interface MachineEditFormProps {
  machine: {
    id: string
    inventoryCode: string
    machineName: string
    serialNumber: string
    type: string
    vendor: string
    model: string
    acquisitionDate: Date
    windowsVersion: string | null
    productKey: string | null
    cpu: string | null
    ram: string | null
    disk: string | null
    warrantyDate: Date | null
    assetStatus: string
    userId: string | null
    inventoryTicket: boolean
    company: {
      id: string
      name: string
    }
    user: {
      id: string
      firstName: string
      lastName: string
    } | null
    screens: Array<{
      id: string
      brand: string
      model: string | null
      inventoryCode: string
    }>
  }
}

export function MachineEditForm({ machine }: MachineEditFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [users, setUsers] = useState<Array<{ id: string; firstName: string; lastName: string }>>([])
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; code: string }>>([])
  const [screens, setScreens] = useState<Array<{ id: string; brand: string; model: string; inventoryCode: string }>>([])
  const defaultTypes = ["Laptop", "Desktop", "Server", "Tablet"]
  const [machineTypes, setMachineTypes] = useState<string[]>(defaultTypes);
  const [selectedType, setSelectedType] = useState<string>(machine.type)
  const [technicalSpecs, setTechnicalSpecs] = useState<Record<string, string>>({})

  useEffect(() => {
    const savedMachineTypes = localStorage.getItem("custom_machine_types")
    if (savedMachineTypes) {
      const customTypes = JSON.parse(savedMachineTypes)
      // Fusionner en évitant les doublons
      const mergedTypes = Array.from(new Set([...defaultTypes, ...customTypes]))
      setMachineTypes(mergedTypes)
    }
    
    // Initialiser les specs techniques existantes
    setTechnicalSpecs({
      cpu: machine.cpu || '',
      ram: machine.ram || '',
      disk: machine.disk || '',
      windowsVersion: machine.windowsVersion || '',
    })
  }, [machine.cpu, machine.ram, machine.disk, machine.windowsVersion])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, companiesRes, screensRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/companies"),
          fetch("/api/screens")
        ])
        
        if (usersRes.ok) {
          const data = await usersRes.json()
          setUsers(Array.isArray(data) ? data : data.users || [])
        }
        
        if (companiesRes.ok) {
          const data = await companiesRes.json()
          setCompanies(Array.isArray(data) ? data : data.companies || [])
        }
        
        if (screensRes.ok) {
          const data = await screensRes.json()
          const screenList = Array.isArray(data) ? data : data.screens || []
          // Filtrer les écrans non associés à une machine
          const availableScreens = screenList.filter((s: any) => !s.machineId || s.machineId === machine.id)
          setScreens(availableScreens)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error)
      }
    }

    fetchData()
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<MachineFormData>({
    resolver: zodResolver(machineSchema),
    defaultValues: {
      machineName: machine.machineName,
      serialNumber: machine.serialNumber,
      type: machine.type as any,
      vendor: machine.vendor as any,
      model: machine.model,
      acquisitionDate: machine.acquisitionDate.toISOString().split("T")[0],
      windowsVersion: machine.windowsVersion || "",
      productKey: machine.productKey || "",
      cpu: machine.cpu || "",
      ram: machine.ram || "",
      disk: machine.disk || "",
      warrantyDate: machine.warrantyDate
        ? machine.warrantyDate.toISOString().split("T")[0]
        : "",
      assetStatus: machine.assetStatus as any,
      userId: machine.userId || "",
      companyId: machine.company.id,
      inventoryTicket: machine.inventoryTicket,
      screenId: machine.screens[0]?.id || "",
    },
  })

  const onSubmit = async (data: MachineFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/machines/${machine.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          acquisitionDate: new Date(data.acquisitionDate),
          warrantyDate: data.warrantyDate ? new Date(data.warrantyDate) : null,
          userId: data.userId || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || "Erreur lors de la modification de la machine")
        return
      }

      toast.success("Machine modifiée avec succès")
      router.push("/dashboard/machines")
      router.refresh()
    } catch (error) {
      toast.error("Erreur lors de la modification de la machine")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/machines/${machine.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const result = await response.json()
        toast.error(result.error || "Erreur lors de la suppression de la machine")
        return
      }

      toast.success("Machine supprimée avec succès")
      router.push("/dashboard/machines")
      router.refresh()
    } catch (error) {
      toast.error("Erreur lors de la suppression de la machine")
      console.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Identification */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Identification</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Code Inventaire</Label>
              <Input value={machine.inventoryCode} disabled />
              <p className="text-sm text-muted-foreground">Généré automatiquement</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="machineName">Nom de la Machine *</Label>
              <Input
                id="machineName"
                {...register("machineName")}
                placeholder="PC-ADMIN-01"
              />
              {errors.machineName && (
                <p className="text-sm text-red-500">{errors.machineName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="serialNumber">Numéro de Série *</Label>
              <Input
                id="serialNumber"
                {...register("serialNumber")}
                placeholder="SN123456789"
              />
              {errors.serialNumber && (
                <p className="text-sm text-red-500">{errors.serialNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                onValueChange={(value) => {
                  setValue("type", value as any)
                  setSelectedType(value)
                }}
                defaultValue={watch("type")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {machineTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-500">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyId">Société *</Label>
              <Select
                onValueChange={(value) => setValue("companyId", value)}
                defaultValue={watch("companyId")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une société" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name} ({company.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.companyId && (
                <p className="text-sm text-red-500">{errors.companyId.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Informations générales */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Informations générales</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendor">Fournisseur *</Label>
              <Select
                onValueChange={(value) => setValue("vendor", value as any)}
                defaultValue={watch("vendor")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DELL">DELL</SelectItem>
                  <SelectItem value="Lenovo">Lenovo</SelectItem>
                  <SelectItem value="HP">HP</SelectItem>
                  <SelectItem value="Microsoft">Microsoft</SelectItem>
                </SelectContent>
              </Select>
              {errors.vendor && (
                <p className="text-sm text-red-500">{errors.vendor.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modèle *</Label>
              <Input
                id="model"
                {...register("model")}
                placeholder="Latitude 5420"
              />
              {errors.model && (
                <p className="text-sm text-red-500">{errors.model.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="acquisitionDate">Date d'Acquisition *</Label>
              <Input
                id="acquisitionDate"
                type="date"
                {...register("acquisitionDate")}
              />
              {errors.acquisitionDate && (
                <p className="text-sm text-red-500">{errors.acquisitionDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="warrantyDate">Date de Garantie</Label>
              <Input
                id="warrantyDate"
                type="date"
                {...register("warrantyDate")}
              />
            </div>
          </div>
        </div>

        {/* Spécifications Techniques Dynamiques */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Spécifications Techniques</h3>
          
          {selectedType && MACHINE_SPECS[selectedType as keyof typeof MACHINE_SPECS] ? (
            <div className="grid gap-4 md:grid-cols-2">
              {MACHINE_SPECS[selectedType as keyof typeof MACHINE_SPECS].fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  {'options' in field && field.type === 'select' ? (
                    <Select
                      onValueChange={(value) => {
                        setTechnicalSpecs({ ...technicalSpecs, [field.name]: value })
                        setValue(field.name as any, value)
                      }}
                      value={technicalSpecs[field.name] || ''}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Sélectionner ${field.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option: string) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={field.name}
                      value={technicalSpecs[field.name] || ''}
                      onChange={(e) => {
                        setTechnicalSpecs({ ...technicalSpecs, [field.name]: e.target.value })
                        setValue(field.name as any, e.target.value)
                      }}
                      placeholder={'placeholder' in field ? field.placeholder : ''}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cpu">Processeur</Label>
                <Input
                  id="cpu"
                  {...register("cpu")}
                  placeholder="Intel Core i7-11th Gen"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ram">RAM</Label>
                <Input
                  id="ram"
                  {...register("ram")}
                  placeholder="16GB DDR4"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="disk">Disque</Label>
                <Input
                  id="disk"
                  {...register("disk")}
                  placeholder="512GB SSD"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="windowsVersion">Version Windows</Label>
                <Input
                  id="windowsVersion"
                  {...register("windowsVersion")}
                  placeholder="Windows 11 Pro"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="productKey">Clé de Produit Windows</Label>
            <Input
              id="productKey"
              {...register("productKey")}
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
            />
          </div>
        </div>

        {/* Gestion */
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Gestion</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assetStatus">Statut *</Label>
              <Select
                onValueChange={(value) => setValue("assetStatus", value as any)}
                defaultValue={watch("assetStatus")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_stock">En Stock</SelectItem>
                  <SelectItem value="en_service">En Service</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retiré">Retiré</SelectItem>
                </SelectContent>
              </Select>
              {errors.assetStatus && (
                <p className="text-sm text-red-500">{errors.assetStatus.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="userId">Utilisateur Assigné</Label>
              <Select
                onValueChange={(value) => setValue("userId", value === "none" ? "" : value)}
                defaultValue={watch("userId") || "none"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun utilisateur</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="screenId">Écran Associé (optionnel)</Label>
              <Select
                onValueChange={(value) => setValue("screenId", value === "none" ? "" : value)}
                defaultValue={watch("screenId") || "none"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun écran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun écran</SelectItem>
                  {screens.map((screen) => (
                    <SelectItem key={screen.id} value={screen.id}>
                      {screen.brand} {screen.model || ''} ({screen.inventoryCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-8">
              <input
                type="checkbox"
                id="inventoryTicket"
                {...register("inventoryTicket")}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="inventoryTicket" className="font-normal cursor-pointer">
                Ticket d'inventaire créé
              </Label>
            </div>
          </div>
        </div>
        }

        {/* Actions */}
        <div className="flex justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" disabled={isDeleting}>
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Cette machine sera définitivement supprimée.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
