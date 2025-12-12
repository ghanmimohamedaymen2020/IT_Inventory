"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Plus, X } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface Equipment {
  id: string
  type: string
  description: string
  serialNumber: string
  brand: string
}

export function DeliveryNoteFormNew() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [equipments, setEquipments] = useState<Equipment[]>([])

  useEffect(() => {
    // Charger les utilisateurs
    fetch("/api/users")
      .then(res => res.json())
      .then(data => {
        const userList = Array.isArray(data) ? data : data.users || []
        setUsers(userList)
      })
      .catch(err => console.error("Erreur chargement utilisateurs:", err))
  }, [])

  const addEquipment = () => {
    setEquipments([{
      id: crypto.randomUUID(),
      type: 'Ordinateur',
      description: '',
      serialNumber: '',
      brand: ''
    }, ...equipments])
  }

  const removeEquipment = (id: string) => {
    setEquipments(equipments.filter(e => e.id !== id))
  }

  const updateEquipment = (id: string, field: keyof Equipment, value: string) => {
    setEquipments(equipments.map(e => 
      e.id === id ? { ...e, [field]: value } : e
    ))
  }

  const handleGenerate = async () => {
    if (!selectedUser) {
      toast.error("Veuillez sélectionner un utilisateur")
      return
    }

    if (equipments.length === 0) {
      toast.error("Veuillez ajouter au moins un équipement")
      return
    }

    // Vérifier que tous les équipements ont les champs requis
    const hasEmptyFields = equipments.some(e => 
      !e.description.trim() || !e.serialNumber.trim()
    )

    if (hasEmptyFields) {
      toast.error("Veuillez remplir tous les champs des équipements")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/delivery-notes/generate-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser,
          equipments: equipments
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || "Impossible de générer le bon de livraison. Veuillez vérifier les données et réessayer.")
        return
      }

      toast.success("Bon de livraison généré avec succès")
      
      // Télécharger le PDF
      const link = document.createElement('a')
      link.href = result.pdfUrl
      link.download = result.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Rediriger vers la liste
      router.push("/dashboard/delivery-notes")
      router.refresh()
    } catch (error) {
      toast.error("Impossible de générer le bon de livraison. Veuillez vérifier les données et réessayer.")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedUserData = users.find(u => u.id === selectedUser)

  return (
    <div className="space-y-6">
      {/* Sélection utilisateur */}
      <div className="space-y-4 border rounded-lg p-6">
        <h3 className="font-semibold text-lg">Destinataire</h3>
        <div className="space-y-2">
          <Label htmlFor="user">Utilisateur *</Label>
          <Select
            onValueChange={setSelectedUser}
            value={selectedUser}
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
      </div>

      {/* Liste des équipements */}
      <div className="space-y-4 border rounded-lg p-6">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">Équipements</h3>
          <Button onClick={addEquipment} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un équipement
          </Button>
        </div>

        {equipments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Aucun équipement ajouté</p>
            <p className="text-sm">Cliquez sur "Ajouter un équipement" pour commencer</p>
          </div>
        ) : (
          <div className="space-y-4">
            {equipments.map((equipment) => (
              <div key={equipment.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">Équipement #{equipments.indexOf(equipment) + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEquipment(equipment.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Select
                      value={equipment.type}
                      onValueChange={(value) => updateEquipment(equipment.id, 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ordinateur">Ordinateur</SelectItem>
                        <SelectItem value="Écran">Écran</SelectItem>
                        <SelectItem value="Clavier">Clavier</SelectItem>
                        <SelectItem value="Souris">Souris</SelectItem>
                        <SelectItem value="Imprimante">Imprimante</SelectItem>
                        <SelectItem value="Autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Marque</Label>
                    <Input
                      value={equipment.brand}
                      onChange={(e) => updateEquipment(equipment.id, 'brand', e.target.value)}
                      placeholder="Dell, HP, Lenovo..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description *</Label>
                    <Input
                      value={equipment.description}
                      onChange={(e) => updateEquipment(equipment.id, 'description', e.target.value)}
                      placeholder="Latitude 5420, Écran 24 pouces..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Numéro de série *</Label>
                    <Input
                      value={equipment.serialNumber}
                      onChange={(e) => updateEquipment(equipment.id, 'serialNumber', e.target.value)}
                      placeholder="SN123456789"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aperçu */}
      {selectedUserData && equipments.length > 0 && (
        <div className="border rounded-lg p-6 bg-secondary/20">
          <h3 className="font-semibold mb-4">Aperçu du Bon de Livraison</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium">Destinataire:</p>
              <p className="text-muted-foreground">{selectedUserData.firstName} {selectedUserData.lastName}</p>
              <p className="text-muted-foreground">{selectedUserData.email}</p>
            </div>
            <div>
              <p className="font-medium">Équipements ({equipments.length}):</p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                {equipments.map((eq, idx) => (
                  <li key={eq.id}>
                    {eq.type} - {eq.brand} {eq.description} (SN: {eq.serialNumber})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <Button
          onClick={handleGenerate}
          disabled={isLoading || !selectedUser || equipments.length === 0}
          className="w-full"
        >
          {isLoading ? "Génération..." : "Générer le bon de livraison"}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/delivery-notes")}
          disabled={isLoading}
        >
          Annuler
        </Button>
      </div>
    </div>
  )
}
