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

const screenSchema = z.object({
  brand: z.string().min(1, "La marque est requise"),
  serialNumber: z.string().min(1, "Le numéro de série est requis"),
  model: z.string().optional(),
  size: z.string().optional(),
  resolution: z.string().optional(),
  purchaseDate: z.string().min(1, "La date d'achat est requise"),
  warrantyDate: z.string().optional(),
  machineId: z.string().optional(),
  companyId: z.string().min(1, "La société est requise"),
  assetStatus: z.enum(['en_stock', 'en_service', 'maintenance', 'retiré']),
})

type ScreenFormData = z.infer<typeof screenSchema>

interface ScreenEditFormProps {
    screen: {
    id: string
    brand: string
    serialNumber: string
    inventoryCode: string
      model: string | null
      size: string | null
      resolution: string | null
      purchaseDate: string | null
      warrantyDate: string | null
      assetStatus: string
    machine: {
      id: string
      machineName: string
      user: {
        id: string
        firstName: string
        lastName: string
        email: string
      } | null
    } | null
    user: {
      id: string
      firstName: string
      lastName: string
      email: string
    } | null
    company: {
      id: string
      name: string
    }
  }
}

export function ScreenEditForm({ screen }: ScreenEditFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [machines, setMachines] = useState<Array<{ id: string; machineName: string; inventoryCode: string; assetStatus: string }>>([])
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; code: string }>>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [machinesRes, companiesRes] = await Promise.all([
          fetch("/api/machines"),
          fetch("/api/companies")
        ])
        
        if (machinesRes.ok) {
          const data = await machinesRes.json()
          const machineList = Array.isArray(data) ? data : data.machines || []
          // Filtrer uniquement les machines en stock
          const machinesEnStock = machineList.filter((m: any) => m.assetStatus === 'en_stock')
          setMachines(machinesEnStock)
        }
        
        if (companiesRes.ok) {
          const data = await companiesRes.json()
          setCompanies(Array.isArray(data) ? data : data.companies || [])
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
  } = useForm<ScreenFormData>({
    resolver: zodResolver(screenSchema),
    defaultValues: {
      brand: screen.brand,
      serialNumber: screen.serialNumber,
      model: screen.model || "",
      size: screen.size || "",
      resolution: screen.resolution || "",
      purchaseDate: screen.purchaseDate ? new Date(screen.purchaseDate).toISOString().split('T')[0] : "",
      warrantyDate: screen.warrantyDate ? new Date(screen.warrantyDate).toISOString().split('T')[0] : "",
      machineId: screen.machine?.id || "",
      companyId: screen.company.id,
      assetStatus: (screen as any).assetStatus || 'en_stock',
    },
  })

  const onSubmit = async (data: ScreenFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/screens/${screen.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour de l'écran")
      }

      toast.success("Écran mis à jour avec succès")
      router.push("/dashboard/screens")
      router.refresh()
    } catch (error) {
      toast.error("Erreur lors de la mise à jour de l'écran")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/screens/${screen.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression de l'écran")
      }

      toast.success("Écran supprimé avec succès")
      router.push("/dashboard/screens")
      router.refresh()
    } catch (error) {
      toast.error("Erreur lors de la suppression de l'écran")
      console.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Informations */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Informations</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Code Inventaire</Label>
              <Input value={screen.inventoryCode} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Marque *</Label>
              <Input
                id="brand"
                {...register("brand")}
                placeholder="Dell, HP, Samsung..."
              />
              {errors.brand && (
                <p className="text-sm text-red-500">{errors.brand.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modèle</Label>
              <Input
                id="model"
                {...register("model")}
                placeholder="P2422H"
              />
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

            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Date d'Achat *</Label>
              <Input
                id="purchaseDate"
                type="date"
                {...register("purchaseDate")}
              />
              {errors.purchaseDate && (
                <p className="text-sm text-red-500">{errors.purchaseDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="warrantyDate">Date de Garantie</Label>
              <Input
                id="warrantyDate"
                type="date"
                {...register("warrantyDate")}
              />
              {errors.warrantyDate && (
                <p className="text-sm text-red-500">{errors.warrantyDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">Dimension</Label>
              <Select onValueChange={(value) => setValue("size", value)} defaultValue={watch("size")}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la taille" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="19&quot;">19"</SelectItem>
                  <SelectItem value="20&quot;">20"</SelectItem>
                  <SelectItem value="21.5&quot;">21.5"</SelectItem>
                  <SelectItem value="22&quot;">22"</SelectItem>
                  <SelectItem value="23&quot;">23"</SelectItem>
                  <SelectItem value="23.8&quot;">23.8"</SelectItem>
                  <SelectItem value="24&quot;">24"</SelectItem>
                  <SelectItem value="27&quot;">27"</SelectItem>
                  <SelectItem value="32&quot;">32"</SelectItem>
                  <SelectItem value="34&quot;">34"</SelectItem>
                  <SelectItem value="43&quot;">43"</SelectItem>
                  <SelectItem value="49&quot;">49"</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Ex: 24", 27", 32"
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolution">Résolution</Label>
              <Select onValueChange={(value) => setValue("resolution", value)} defaultValue={watch("resolution")}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la résolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1366x768">1366x768</SelectItem>
                  <SelectItem value="1600x900">1600x900</SelectItem>
                  <SelectItem value="1920x1080">1920x1080</SelectItem>
                  <SelectItem value="2560x1440">2560x1440</SelectItem>
                  <SelectItem value="3840x2160">3840x2160</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Ex: Full HD (1920x1080), QHD (2560x1440), 4K (3840x2160)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="machineId">Machine associée (optionnel)</Label>
              <Select
                onValueChange={(value) => setValue("machineId", value)}
                defaultValue={watch("machineId")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une machine" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.machineName} ({machine.inventoryCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.machineId && (
                <p className="text-sm text-red-500">{errors.machineId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Utilisateur Assigné</Label>
              {screen.user || screen.machine?.user ? (
                <div className="border rounded-md p-3 bg-muted">
                  <div className="text-sm font-medium">
                    {screen.user ? 
                      `${screen.user.firstName} ${screen.user.lastName}` : 
                      `${screen.machine?.user?.firstName} ${screen.machine?.user?.lastName}`
                    }
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {screen.user?.email || screen.machine?.user?.email}
                  </div>
                </div>
              ) : (
                <div className="border rounded-md p-3 bg-muted text-sm text-muted-foreground">
                  Aucun utilisateur assigné
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {screen.user ? 
                  "Utilisateur assigné via le bon de livraison" : 
                  "L'utilisateur est assigné via la machine associée"
                }
              </p>
            </div>
            
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
            </div>
          </div>
        </div>

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
                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer cet écran ? Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/screens")}
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
