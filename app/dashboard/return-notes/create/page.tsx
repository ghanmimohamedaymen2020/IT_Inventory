"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, Search, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Equipment {
  type: "machine" | "screen"
  serialNumber: string
  brand: string
  model: string
  inventoryCode: string
  previousUser: string
  userId?: string
}

interface SearchedEquipment {
  type: "machine" | "screen"
  serialNumber: string
  brand: string
  model: string
  inventoryCode: string
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export default function CreateReturnNotePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [returnedBy, setReturnedBy] = useState("")
  const [returnedByUserId, setReturnedByUserId] = useState<string | undefined>(undefined)
  const [users, setUsers] = useState<any[]>([])
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [serialNumberSearch, setSerialNumberSearch] = useState("")

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (!response.ok) throw new Error("Failed to fetch")
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const searchEquipment = async () => {
    if (!serialNumberSearch.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un numéro de série",
        variant: "destructive",
      })
      return
    }

    setSearching(true)
    try {
      // Chercher dans les machines
      const machinesRes = await fetch("/api/machines")
      const machinesData = await machinesRes.json()
      const machine = machinesData.machines?.find(
        (m: any) => m.serialNumber.toLowerCase() === serialNumberSearch.toLowerCase()
      )

      if (machine) {
        const equipment: Equipment = {
          // store specific machine subtype if available (laptop/desktop/etc.)
          type: machine.type || "machine",
          serialNumber: machine.serialNumber,
          brand: machine.vendor,
          model: machine.model,
          inventoryCode: machine.inventoryCode,
          previousUser: machine.user 
            ? `${machine.user.firstName} ${machine.user.lastName}`
            : "Non assigné",
          userId: machine.user?.id,
        }
        
        // Remplir automatiquement "Retourné par" avec l'utilisateur assigné
        if (machine.user && !returnedBy) {
          setReturnedBy(`${machine.user.firstName} ${machine.user.lastName}`)
          setReturnedByUserId(machine.user.id)
        }
        
        // Bloquer l'ajout si l'équipement n'est pas assigné
        if (!machine.user) {
          toast({
            title: "Impossible",
            description: "Cet équipement est déjà en stock (non assigné). Impossible de créer un bon de retour.",
            variant: "destructive",
          })
          setSerialNumberSearch("")
          return
        }
        
        // Vérifier si déjà ajouté
        if (equipments.some(e => e.serialNumber === equipment.serialNumber)) {
          toast({
            title: "Attention",
            description: "Cet équipement est déjà ajouté",
            variant: "destructive",
          })
        } else {
          setEquipments([equipment, ...equipments])
          setSerialNumberSearch("")
          
          toast({
            title: "Succès",
            description: "Équipement ajouté",
          })
        }
        return
      }

      // Chercher dans les écrans
      const screensRes = await fetch("/api/screens")
      const screensData = await screensRes.json()
      const screen = screensData.screens?.find(
        (s: any) => s.serialNumber.toLowerCase() === serialNumberSearch.toLowerCase()
      )

      if (screen) {
        const equipment: Equipment = {
          type: "screen",
          serialNumber: screen.serialNumber,
          brand: screen.brand,
          model: screen.model || "",
          inventoryCode: screen.inventoryCode,
          previousUser: screen.user 
            ? `${screen.user.firstName} ${screen.user.lastName}`
            : "Non assigné",
          userId: screen.user?.id,
        }
        
        // Remplir automatiquement "Retourné par" avec l'utilisateur assigné
        if (screen.user && !returnedBy) {
          setReturnedBy(`${screen.user.firstName} ${screen.user.lastName}`)
          setReturnedByUserId(screen.user.id)
        }
        
        // Bloquer l'ajout si l'équipement n'est pas assigné
        if (!screen.user) {
          toast({
            title: "Impossible",
            description: "Cet équipement est déjà en stock (non assigné). Impossible de créer un bon de retour.",
            variant: "destructive",
          })
          setSerialNumberSearch("")
          return
        }
        
        if (equipments.some(e => e.serialNumber === equipment.serialNumber)) {
          toast({
            title: "Attention",
            description: "Cet équipement est déjà ajouté",
            variant: "destructive",
          })
        } else {
          setEquipments([equipment, ...equipments])
          setSerialNumberSearch("")
          
          toast({
            title: "Succès",
            description: "Équipement ajouté",
          })
        }
        return
      }

      toast({
        title: "Non trouvé",
        description: "Aucun équipement trouvé avec ce numéro de série",
        variant: "destructive",
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Erreur",
        description: "Erreur lors de la recherche",
        variant: "destructive",
      })
    } finally {
      setSearching(false)
    }
  }

  const removeEquipment = (index: number) => {
    setEquipments(equipments.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (equipments.length === 0) {
        toast({
          title: "Erreur",
          description: "Veuillez ajouter au moins un équipement à retourner",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      if (!returnedByUserId) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner l'utilisateur qui retourne l'équipement",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const response = await fetch("/api/return-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnedByUserId,
          reason,
          destination: "stock", // Toujours retour au stock
          notes,
          equipments,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("API Error:", errorData)
        throw new Error(errorData.error || "Erreur lors de la création du bon de retour")
      }

      const data = await response.json()

      toast({
        title: "Succès",
        description: `Bon de retour ${data.returnNote.noteNumber} créé avec succès`,
      })

      // Ouvrir le PDF dans un nouvel onglet
      if (data.pdfUrl) {
        window.open(data.pdfUrl, '_blank')
      }

      router.push(`/dashboard/return-notes/${data.returnNote.id}`)
    } catch (error) {
      console.error("Full error:", error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Créer un bon de retour</h1>
        <p className="text-muted-foreground">
          Enregistrer le retour d'équipements au stock ou en réparation
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
            <CardDescription>Détails du retour d'équipement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="returnedBy">Retourné par *</Label>
                <Select 
                  value={returnedByUserId} 
                  onValueChange={(value) => {
                    setReturnedByUserId(value)
                    const user = users.find(u => u.id === value)
                    if (user) {
                      setReturnedBy(`${user.firstName} ${user.lastName}`)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un utilisateur" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} - {user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Raison du retour</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Fin de contrat, Changement de poste..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                placeholder="Remarques supplémentaires..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Équipements retournés</CardTitle>
            <CardDescription>Rechercher et ajouter les équipements par numéro de série</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="serialNumber">Numéro de série</Label>
                <Input
                  id="serialNumber"
                  value={serialNumberSearch}
                  onChange={(e) => setSerialNumberSearch(e.target.value)}
                  placeholder="Entrer le N° de série..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      searchEquipment()
                    }
                  }}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={searchEquipment}
                  disabled={searching || !serialNumberSearch.trim()}
                >
                  {searching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recherche...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Rechercher
                    </>
                  )}
                </Button>
              </div>
            </div>

            {equipments.length > 0 && (
              <div className="space-y-2">
                <Label>Équipements ajoutés ({equipments.length})</Label>
                <div className="space-y-2">
                  {equipments.map((equipment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex-1 text-sm">
                        <div className="font-medium">
                          {equipment.type === "machine" ? "Machine" : "Écran"} - {equipment.serialNumber}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {equipment.brand} {equipment.model} • {equipment.inventoryCode} • {equipment.previousUser}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEquipment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={loading || equipments.length === 0}>
            {loading ? "Création..." : "Créer le bon de retour"}
          </Button>
        </div>
      </form>
    </div>
  )
}
