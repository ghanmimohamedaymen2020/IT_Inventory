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

const screenSchema = z.object({
  brand: z.string().min(1, "La marque est requise"),
  model: z.string().min(1, "Le modèle est requis"),
  serialNumber: z.string().min(1, "Le numéro de série est requis"),
  size: z.string().optional(),
  resolution: z.string().optional(),
  purchaseDate: z.string().min(1, "La date d'achat est requise"),
  warrantyDate: z.string().optional(),
  machineId: z.string().optional(),
  companyId: z.string().min(1, "La société est requise"),
})

type ScreenFormData = z.infer<typeof screenSchema>

interface Machine {
  id: string
  inventoryCode: string
  machineName: string
  serialNumber: string
  assetStatus: string
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
}

export function ScreenCreateForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [machines, setMachines] = useState<Machine[]>([])
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; code: string }>>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [machinesRes, companiesRes] = await Promise.all([
          fetch('/api/machines'),
          fetch('/api/companies')
        ])
        
        if (machinesRes.ok) {
          const data = await machinesRes.json()
          const machineList = Array.isArray(data) ? data : data.machines || []
          // Filtrer uniquement les machines en stock
          const machinesEnStock = machineList.filter((m: Machine) => m.assetStatus === 'en_stock')
          setMachines(machinesEnStock)
        }
        
        if (companiesRes.ok) {
          const data = await companiesRes.json()
          setCompanies(Array.isArray(data) ? data : data.companies || [])
        }
      } catch (error) {
        console.error('Erreur chargement des données:', error)
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
  })

  const onSubmit = async (data: ScreenFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/screens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la création de l'écran")
      }

      toast.success("Écran créé avec succès")
      router.push("/dashboard/screens")
      router.refresh()
    } catch (error) {
      toast.error("Erreur lors de la création de l'écran")
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
            <Label htmlFor="brand">Marque *</Label>
            <Input
              id="brand"
              {...register("brand")}
              placeholder="ex: Dell, Samsung, LG"
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
              placeholder="ex: P2419H"
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
              placeholder="ex: CN0ABCD123456"
            />
            {errors.serialNumber && (
              <p className="text-sm text-red-500">{errors.serialNumber.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyId">Société *</Label>
            <Select onValueChange={(value) => setValue("companyId", value)}>
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
            <Label htmlFor="size">Taille</Label>
            <Select onValueChange={(value) => setValue("size", value)}>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolution">Résolution</Label>
            <Select onValueChange={(value) => setValue("resolution", value)}>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="machineId">Machine associée (optionnel)</Label>
            <Select onValueChange={(value) => setValue("machineId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une machine" />
              </SelectTrigger>
              <SelectContent>
                {machines.map((machine) => (
                  <SelectItem key={machine.id} value={machine.id}>
                    {machine.inventoryCode} - {machine.machineName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/screens")}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Création..." : "Créer l'écran"}
        </Button>
      </div>
    </form>
  )
}
