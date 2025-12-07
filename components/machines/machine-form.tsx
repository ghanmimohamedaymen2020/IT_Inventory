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

const machineSchema = z.object({
  type: z.enum(["desktop", "laptop", "server", "other"]),
  brand: z.string().min(1, "La marque est requise"),
  model: z.string().min(1, "Le modèle est requis"),
  serialNumber: z.string().min(1, "Le numéro de série est requis"),
  processor: z.string().optional(),
  ram: z.string().optional(),
  storage: z.string().optional(),
  os: z.string().optional(),
  purchaseDate: z.string().optional(),
  warrantyEndDate: z.string().optional(),
  assignedTo: z.string().optional(),
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

  useEffect(() => {
    // Charger la liste des utilisateurs
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data.users || []))
      .catch(err => console.error('Erreur chargement utilisateurs:', err))
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
            <Label htmlFor="type">Type *</Label>
            <Select
              onValueChange={(value) => setValue("type", value as any)}
              defaultValue={watch("type")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desktop">Ordinateur de bureau</SelectItem>
                <SelectItem value="laptop">Ordinateur portable</SelectItem>
                <SelectItem value="server">Serveur</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
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

      {/* Spécifications techniques */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Spécifications techniques</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="processor">Processeur</Label>
            <Input
              id="processor"
              {...register("processor")}
              placeholder="ex: Intel Core i7-8650U"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ram">RAM</Label>
            <Input
              id="ram"
              {...register("ram")}
              placeholder="ex: 16GB DDR4"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="storage">Stockage</Label>
            <Input
              id="storage"
              {...register("storage")}
              placeholder="ex: 512GB SSD"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="os">Système d'exploitation</Label>
            <Input
              id="os"
              {...register("os")}
              placeholder="ex: Windows 11 Pro"
            />
          </div>
        </div>
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
