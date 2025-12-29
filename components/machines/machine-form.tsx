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
import { Plus } from "lucide-react"
import { ShowForSuperAdmin } from "@/components/admin/show-for-super-admin"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Spécifications techniques selon le type de machine
const MACHINE_SPECS = {
  'Laptop': {
    fields: [
      { name: 'cpu', label: 'Processeur', placeholder: 'Intel Core i5-1135G7' },
      { name: 'ram', label: 'RAM', placeholder: '8GB DDR4' },
      { name: 'disk', label: 'Stockage', placeholder: '256GB SSD' },
      { name: 'screenSize', label: 'Taille écran', placeholder: '14 pouces' },
      { name: 'battery', label: 'Batterie', placeholder: '45Wh' },
      { name: 'windowsVersion', label: 'OS', type: 'select', options: ['Windows 11 Pro', 'Windows 10 Pro', 'Windows 11 Home', 'Ubuntu 22.04', 'Ubuntu 20.04', 'Red Hat Enterprise Linux', 'CentOS Stream', 'VMware ESXi', 'Other'] },
      { name: 'productKey', label: 'Clé d\'activation', placeholder: 'XXXXX-XXXXX-XXXXX-XXXXX' },
    ]
  },
  'Desktop': {
    fields: [
      { name: 'cpu', label: 'Processeur', placeholder: 'Intel Core i7-12700' },
      { name: 'ram', label: 'RAM', placeholder: '16GB DDR4' },
      { name: 'disk', label: 'Stockage', placeholder: '512GB SSD + 1TB HDD' },
      { name: 'gpu', label: 'Carte graphique', placeholder: 'NVIDIA GTX 1650' },
      { name: 'productKey', label: 'Clé d\'activation', placeholder: 'XXXXX-XXXXX-XXXXX-XXXXX' },
      { name: 'windowsVersion', label: 'OS', type: 'select', options: ['Windows 11 Pro', 'Windows 10 Pro', 'Windows 11 Home', 'Ubuntu 22.04', 'Ubuntu 20.04', 'Red Hat Enterprise Linux', 'CentOS Stream', 'VMware ESXi', 'Other'] },
    ]
  },
  'Server': {
    fields: [
      { name: 'cpu', label: 'Processeur', placeholder: 'Intel Xeon E-2388G' },
      { name: 'ram', label: 'RAM', placeholder: '32GB ECC DDR4' },
      { name: 'disk', label: 'Stockage', placeholder: '2x 1TB SSD RAID1' },
      { name: 'raidType', label: 'RAID', placeholder: 'RAID 1' },
      { name: 'networkPorts', label: 'Ports réseau', placeholder: '2x 1Gbps' },
      { name: 'windowsVersion', label: 'OS', type: 'select', options: ['Windows Server 2022', 'Windows Server 2019', 'Ubuntu 22.04', 'Red Hat Enterprise Linux', 'Other'] },
    ]
  },
  'Tablet': {
    fields: [
      { name: 'screenSize', label: 'Taille écran', placeholder: '10.2 pouces' },
      { name: 'ram', label: 'RAM', placeholder: '4GB' },
      { name: 'disk', label: 'Stockage', placeholder: '64GB' },
      { name: 'windowsVersion', label: 'Système', type: 'select', options: ['Android 13', 'Android 12', 'iPadOS 16', 'Other'] },
      { name: 'connectivity', label: 'Connectivité', placeholder: 'WiFi + 4G' },
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
  type: z.string().min(1, "Le type de machine est requis"),
  brand: z.string().min(1, "La marque est requise"),
  model: z.string().min(1, "Le modèle est requis"),
  serialNumber: z.string().min(1, "Le numéro de série est requis"),
  processor: z.string().optional(),
  ram: z.string().optional(),
  storage: z.string().optional(),
  windowsVersion: z.string().optional(),
  productKey: z.string().optional(),
  purchaseDate: z.string().optional(),
  warrantyEndDate: z.string().optional(),
  assignedTo: z.string().optional(),
  companyId: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(["active", "maintenance", "retired", "storage"]).default("active"),
  notes: z.string().optional(),
})

type MachineFormData = z.infer<typeof machineSchema>

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  office: string | null
}

export function MachineForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<{ id: string; name: string; code?: string }[]>([])
  const [selectedType, setSelectedType] = useState<string>("")
  const [technicalSpecs, setTechnicalSpecs] = useState<Record<string, string>>({})
  const defaultTypes = ["Laptop", "Desktop", "Server", "Tablet"]
  const [machineTypes, setMachineTypes] = useState<string[]>(defaultTypes)
  const [osOptions, setOsOptions] = useState<string[]>([])

  useEffect(() => {
    const savedMachineTypes = localStorage.getItem("custom_machine_types")
    if (savedMachineTypes) {
      const customTypes = JSON.parse(savedMachineTypes)
      // Fusionner en évitant les doublons
      const mergedTypes = Array.from(new Set([...defaultTypes, ...customTypes]))
      setMachineTypes(mergedTypes)
    }
  }, [])

  useEffect(() => {
    // Charger la liste des utilisateurs
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data.users || []))
      .catch(err => console.error('Erreur chargement utilisateurs:', err))

    // Charger la liste des sociétés
    fetch('/api/companies')
      .then(res => res.json())
      .then(data => setCompanies(data || []))
      .catch(err => console.error('Erreur chargement sociétés:', err))

    // Charger OS dynamiquement
    fetch('/api/os')
      .then(res => res.json())
      .then(data => {
        const fetched = (data || []).map((o: any) => o.name)
        const saved: string[] = (() => {
          try { return JSON.parse(localStorage.getItem('custom_os') || '[]') } catch { return [] }
        })()
        setOsOptions(Array.from(new Set([...fetched, ...saved])))
      })
      .catch(err => console.error('Erreur chargement OS:', err))
  }, [])

  const addMachineType = () => {
    const name = prompt('Nom du nouveau type de machine')
    if (!name) return
    const trimmed = name.trim()
    if (!trimmed) return
    if (machineTypes.includes(trimmed)) {
      toast.error('Type existe déjà')
      return
    }
    const custom = JSON.parse(localStorage.getItem('custom_machine_types') || '[]')
    const next = Array.from(new Set([...custom, trimmed]))
    localStorage.setItem('custom_machine_types', JSON.stringify(next))
    setMachineTypes(prev => Array.from(new Set([...prev, trimmed])))
    toast.success('Type ajouté')
  }

  const addOs = () => {
    const name = prompt('Nom du nouvel OS')
    if (!name) return
    const trimmed = name.trim()
    if (!trimmed) return
    if (osOptions.includes(trimmed)) {
      toast.error('OS existe déjà')
      return
    }
    const saved = JSON.parse(localStorage.getItem('custom_os') || '[]')
    const next = Array.from(new Set([...saved, trimmed]))
    localStorage.setItem('custom_os', JSON.stringify(next))
    setOsOptions(prev => Array.from(new Set([...prev, trimmed])))
    toast.success('OS ajouté')
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<MachineFormData>({
    resolver: zodResolver(machineSchema),
    defaultValues: {
      status: "active",
    },
  })

  // Gérer le changement d'utilisateur assigné
  const handleUserChange = (userId: string) => {
    setValue("assignedTo", userId)
    
    // Trouver l'utilisateur sélectionné
    const selectedUser = users.find(u => u.id === userId)
    
    // Remplir automatiquement l'emplacement avec le bureau de l'utilisateur
    if (selectedUser?.office) {
      setValue("location", selectedUser.office)
    }
  }

  const onSubmit = async (data: MachineFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/machines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la création de la machine")
      }

      toast.success("Machine créée avec succès")
      router.push("/dashboard/machines")
      router.refresh()
    } catch (error) {
      toast.error("Erreur lors de la création de la machine")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Informations générales */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Informations générales</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="type">Type *</Label>
              <ShowForSuperAdmin>
                <Button size="icon" onClick={addMachineType} aria-label="Ajouter type">
                  <Plus className="h-4 w-4" />
                </Button>
              </ShowForSuperAdmin>
            </div>
            <Select
              onValueChange={(value) => {
                setValue("type", value as any)
                setSelectedType(value)
                setTechnicalSpecs({}) // Réinitialiser les specs quand on change de type
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
            <Label htmlFor="status">Statut</Label>
            <Select
              onValueChange={(value) => setValue("status", value as any)}
              defaultValue={watch("status")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="maintenance">En maintenance</SelectItem>
                <SelectItem value="retired">Retiré</SelectItem>
                <SelectItem value="storage">En stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Marque *</Label>
            <Input
              id="brand"
              {...register("brand")}
              placeholder="ex: Dell, HP, Lenovo"
            />
            {errors.brand && (
              <p className="text-sm text-red-500">{errors.brand.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyId">Société</Label>
            <Select
              onValueChange={(value) => setValue('companyId', value)}
              defaultValue={watch('companyId')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une société (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.code ? `(${c.code})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Modèle *</Label>
            <Input
              id="model"
              {...register("model")}
              placeholder="ex: Latitude 7490"
            />
            {errors.model && (
              <p className="text-sm text-red-500">{errors.model.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="serialNumber">Numéro de série *</Label>
            <Input
              id="serialNumber"
              {...register("serialNumber")}
              placeholder="ex: ABC123456789"
            />
            {errors.serialNumber && (
              <p className="text-sm text-red-500">{errors.serialNumber.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Spécifications Techniques Dynamiques */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Spécifications techniques</h3>
        
        {selectedType && MACHINE_SPECS[selectedType as keyof typeof MACHINE_SPECS] ? (
          <div className="grid gap-4 md:grid-cols-2">
            {MACHINE_SPECS[selectedType as keyof typeof MACHINE_SPECS].fields.map((field) => (
                <div key={field.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  {field.name === 'windowsVersion' && (
                    <ShowForSuperAdmin>
                      <Button size="icon" onClick={addOs} aria-label="Ajouter OS">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </ShowForSuperAdmin>
                  )}
                </div>
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
                        {(field.name === 'windowsVersion' ? (osOptions.length ? osOptions : (field as any).options) : (field as any).options).map((option: string) => (
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
          <p className="text-sm text-muted-foreground">
            Sélectionnez un type de machine pour voir les spécifications techniques.
          </p>
        )}
      </div>

      {/* Informations d'achat et garantie */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Achat et garantie</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Date d'achat</Label>
            <Input
              id="purchaseDate"
              type="date"
              {...register("purchaseDate")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="warrantyEndDate">Fin de garantie</Label>
            <Input
              id="warrantyEndDate"
              type="date"
              {...register("warrantyEndDate")}
            />
          </div>
        </div>
      </div>

      {/* Affectation et localisation */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Affectation</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="assignedTo">Affecté à</Label>
            <Select
              onValueChange={handleUserChange}
              defaultValue={watch("assignedTo")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un utilisateur" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} {user.office ? `(${user.office})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Localisation</Label>
            <Input
              id="location"
              {...register("location")}
              placeholder="Rempli automatiquement"
              disabled={!!watch("assignedTo")}
              className={watch("assignedTo") ? "bg-muted" : ""}
            />
            {watch("assignedTo") && (
              <p className="text-xs text-muted-foreground">
                📍 Emplacement automatique selon le bureau de l'utilisateur
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          {...register("notes")}
          className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Informations supplémentaires..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Création..." : "Créer la machine"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Annuler
        </Button>
      </div>
    </form>
  )
}
