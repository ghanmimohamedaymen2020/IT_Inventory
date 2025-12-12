"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Plus, X, Search } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Machine {
  id: string
  serialNumber: string
  machineName: string
  inventoryCode: string
  type: string
  vendor: string
  model: string
  assetStatus: string
  user?: {
    firstName: string
    lastName: string
  }
}

interface Screen {
  id: string
  serialNumber: string
  inventoryCode: string
  brand: string
  model: string
  size: string
  user?: {
    firstName: string
    lastName: string
  }
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface Equipment {
  id: string
  type: 'laptop' | 'pc' | 'ecran' | 'clavier' | 'souris' | 'autre'
  serialNumber: string
  description: string
  model: string
  vendor?: string
  inventoryCode?: string
  exists: boolean
}

export function DeliveryNoteForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [machines, setMachines] = useState<Machine[]>([])
  const [screens, setScreens] = useState<Screen[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [equipments, setEquipments] = useState<Equipment[]>([])
  
  // Nouvel équipement en cours de saisie
  const [newEquipmentType, setNewEquipmentType] = useState<Equipment['type']>('laptop')
  const [newSerialNumber, setNewSerialNumber] = useState('')
  const [searchingSerial, setSearchingSerial] = useState(false)
  const [foundEquipment, setFoundEquipment] = useState<Equipment | null>(null)
  const [serialNotFound, setSerialNotFound] = useState(false)

  useEffect(() => {
    // Charger les machines
    fetch("/api/machines")
      .then(res => res.json())
      .then(data => {
        const machineList = Array.isArray(data) ? data : data.machines || []
        setMachines(machineList)
      })
      .catch(err => console.error("Erreur chargement machines:", err))

    // Charger les écrans
    fetch("/api/screens")
      .then(res => res.json())
      .then(data => {
        const screenList = Array.isArray(data) ? data : data.screens || []
        setScreens(screenList)
      })
      .catch(err => console.error("Erreur chargement écrans:", err))

    // Charger les utilisateurs
    fetch("/api/users")
      .then(res => res.json())
      .then(data => {
        const userList = Array.isArray(data) ? data : data.users || []
        setUsers(userList)
      })
      .catch(err => console.error("Erreur chargement utilisateurs:", err))
  }, [])

  // Rechercher l'équipement par numéro de série
  const handleSerialNumberSearch = async () => {
    if (!newSerialNumber.trim()) {
      setFoundEquipment(null)
      setSerialNotFound(false)
      return
    }

    setSearchingSerial(true)
    setFoundEquipment(null)
    setSerialNotFound(false)

    try {
      // Chercher dans les machines
      if (newEquipmentType === 'laptop' || newEquipmentType === 'pc') {
        const machine = machines.find(m => 
          m.serialNumber.toLowerCase() === newSerialNumber.toLowerCase()
        )
        
        if (machine) {
          setFoundEquipment({
            id: machine.id,
            type: newEquipmentType,
            serialNumber: machine.serialNumber,
            description: machine.machineName,
            model: machine.model,
            vendor: machine.vendor,
            inventoryCode: machine.inventoryCode,
            exists: true
          })
          setSerialNotFound(false)
          setSearchingSerial(false)
          return
        }
      }

      // Chercher dans les écrans
      if (newEquipmentType === 'ecran') {
        const screen = screens.find(s => 
          s.serialNumber.toLowerCase() === newSerialNumber.toLowerCase()
        )
        
        if (screen) {
          setFoundEquipment({
            id: screen.id,
            type: 'ecran',
            serialNumber: screen.serialNumber,
            description: `${screen.brand} ${screen.model}`,
            model: screen.model,
            vendor: screen.brand,
            inventoryCode: screen.inventoryCode,
            exists: true
          })
          setSerialNotFound(false)
          setSearchingSerial(false)
          return
        }
      }

      // Si rien trouvé
      setSerialNotFound(true)
      setFoundEquipment({
        id: crypto.randomUUID(),
        type: newEquipmentType,
        serialNumber: newSerialNumber,
        description: '',
        model: '',
        exists: false
      })
    } catch (error) {
      console.error("Erreur recherche:", error)
      toast.error("Erreur lors de la recherche")
    } finally {
      setSearchingSerial(false)
    }
  }

  // Ajouter l'équipement à la liste
  const handleAddEquipment = () => {
    if (!foundEquipment || !foundEquipment.serialNumber) {
      toast.error("Veuillez rechercher un équipement d'abord")
      return
    }

    // Vérifier si déjà ajouté
    if (equipments.some(e => e.serialNumber === foundEquipment.serialNumber)) {
      toast.error("Cet équipement est déjà dans la liste")
      return
    }

    setEquipments([...equipments, foundEquipment])
    
    // Reset
    setNewSerialNumber('')
    setFoundEquipment(null)
    setSerialNotFound(false)
    toast.success("Équipement ajouté")
  }

  // Supprimer un équipement
  const handleRemoveEquipment = (id: string) => {
    setEquipments(equipments.filter(e => e.id !== id))
    toast.success("Équipement retiré")
  }

  const handleGenerate = async () => {
    if (!selectedUser || equipments.length === 0) {
      toast.error("Veuillez sélectionner un utilisateur et ajouter au moins un équipement")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/delivery-notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser,
          equipments: equipments,
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

  const equipmentTypeLabels = {
    laptop: 'Laptop',
    pc: 'PC Bureau',
    ecran: 'Écran',
    clavier: 'Clavier',
    souris: 'Souris',
    autre: 'Autre'
  }

  return (
    <div className="space-y-6">
      {/* Sélection utilisateur */}
      <div className="space-y-4 border rounded-lg p-6">
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

      {/* Ajout d'équipements */}
      <div className="space-y-4 border rounded-lg p-6">
        <h3 className="font-semibold">Ajouter un équipement</h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          {/* Type d'équipement */}
          <div className="space-y-2">
            <Label>Type d'équipement *</Label>
            <Select
              onValueChange={(value) => {
                setNewEquipmentType(value as Equipment['type'])
                setNewSerialNumber('')
                setFoundEquipment(null)
                setSerialNotFound(false)
              }}
              value={newEquipmentType}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="laptop">Laptop</SelectItem>
                <SelectItem value="pc">PC Bureau</SelectItem>
                <SelectItem value="ecran">Écran</SelectItem>
                <SelectItem value="clavier">Clavier</SelectItem>
                <SelectItem value="souris">Souris</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Numéro de série */}
          <div className="space-y-2">
            <Label>Numéro de série *</Label>
            <div className="flex gap-2">
              <Input
                value={newSerialNumber}
                onChange={(e) => {
                  setNewSerialNumber(e.target.value)
                  setFoundEquipment(null)
                  setSerialNotFound(false)
                }}
                placeholder="Entrer le SN"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSerialNumberSearch()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSerialNumberSearch}
                disabled={!newSerialNumber.trim() || searchingSerial}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Message si SN non trouvé */}
        {serialNotFound && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Numéro de série <strong>{newSerialNumber}</strong> non trouvé dans la base de données.
              Vous pouvez quand même l'ajouter manuellement en remplissant les informations ci-dessous.
            </p>
          </div>
        )}

        {/* Informations auto-complétées */}
        {foundEquipment && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Description / Nom</Label>
                <Input
                  value={foundEquipment.description}
                  onChange={(e) => setFoundEquipment({...foundEquipment, description: e.target.value})}
                  placeholder="Ex: Dell Latitude 5420"
                  readOnly={foundEquipment.exists}
                  className={foundEquipment.exists ? "bg-secondary" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label>Modèle</Label>
                <Input
                  value={foundEquipment.model}
                  onChange={(e) => setFoundEquipment({...foundEquipment, model: e.target.value})}
                  placeholder="Ex: Latitude 5420"
                  readOnly={foundEquipment.exists}
                  className={foundEquipment.exists ? "bg-secondary" : ""}
                />
              </div>
            </div>

            {foundEquipment.exists && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✓ Équipement trouvé : {foundEquipment.vendor} {foundEquipment.model} 
                  {foundEquipment.inventoryCode && ` (${foundEquipment.inventoryCode})`}
                </p>
              </div>
            )}

            <Button
              type="button"
              onClick={handleAddEquipment}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter à la liste
            </Button>
          </div>
        )}
      </div>

      {/* Liste des équipements ajoutés */}
      {equipments.length > 0 && (
        <div className="space-y-4 border rounded-lg p-6">
          <h3 className="font-semibold">Équipements à livrer ({equipments.length})</h3>
          <div className="space-y-2">
            {equipments.map((equipment) => (
              <div
                key={equipment.id}
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">
                    {equipmentTypeLabels[equipment.type]} - SN: {equipment.serialNumber}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {equipment.description} {equipment.model && `- ${equipment.model}`}
                    {equipment.inventoryCode && ` (${equipment.inventoryCode})`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveEquipment(equipment.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aperçu */}
      {selectedUserData && equipments.length > 0 && (
        <div className="border rounded-lg p-6 bg-secondary/20">
          <h3 className="font-semibold mb-4">Aperçu du Bon de Livraison</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium">Utilisateur:</p>
              <p className="text-muted-foreground">{selectedUserData.firstName} {selectedUserData.lastName}</p>
              <p className="text-muted-foreground">{selectedUserData.email}</p>
            </div>
            <div>
              <p className="font-medium">Équipements ({equipments.length}):</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                {equipments.map((eq) => (
                  <li key={eq.id}>
                    {equipmentTypeLabels[eq.type]}: {eq.description || eq.serialNumber}
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
          {isLoading ? "Génération..." : "Générer le Bon de Livraison PDF"}
        </Button>
        <Button
          type="button"
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
