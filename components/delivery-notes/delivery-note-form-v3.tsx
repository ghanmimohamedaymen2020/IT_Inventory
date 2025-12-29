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

interface Machine {
  id: string
  serialNumber: string
  machineName?: string
  type?: string
  vendor?: string
  model?: string
  cpu?: string | null
  ram?: string | null
  disk?: string | null
  inventoryCode?: string
  userId?: string | null
}

interface Screen {
  id: string
  serialNumber: string
  inventoryCode: string
  brand: string
  model: string
  size: string
  userId: string | null
}

// Types d'équipements simplifiés
const EQUIPMENT_TYPES = ['Laptop', 'PC', 'Écran', 'Clavier', 'Souris', 'Autre'] as const

type EquipmentTypeName = typeof EQUIPMENT_TYPES[number]

interface Equipment {
  id: string
  type: EquipmentTypeName
  serialNumber: string
  // Auto-remplis si trouvé
  brand?: string
  model?: string
  description?: string
  inventoryCode?: string
  serialNumberStatus?: 'found' | 'not-found' | null
  // Données complètes si trouvé
  foundData?: Machine | Screen | null
  // Indicateur si déjà assigné
  alreadyAssigned?: boolean
  assignedToUser?: string
}

export function DeliveryNoteFormV3() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [screens, setScreens] = useState<Screen[]>([])
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [notes, setNotes] = useState<string>("")
  const [consumables, setConsumables] = useState<Array<{ id: string; typeName?: string; quantity: number; consumableId?: string }>>([])
  const [consumableNames, setConsumableNames] = useState<string[]>([])

  useEffect(() => {
    // Charger les utilisateurs, machines et écrans
    Promise.all([
      fetch("/api/users").then(res => res.json()),
      fetch("/api/machines").then(res => res.json()),
      fetch("/api/screens").then(res => res.json())
    ])
      .then(([usersData, machinesData, screensData]) => {
        const userList = Array.isArray(usersData) ? usersData : usersData.users || []
        setUsers(userList)
        
        const machineList = Array.isArray(machinesData) ? machinesData : machinesData.machines || []
        setMachines(machineList)

        const screenList = Array.isArray(screensData) ? screensData : screensData.screens || []
        setScreens(screenList)
      })
      .catch(err => console.error("Erreur chargement données:", err))

    // fetch consumable names for selector
    fetch('/api/consumable-names').then(r => r.ok ? r.json() : []).then(data => {
      if (Array.isArray(data)) setConsumableNames(data)
    }).catch(() => {})
  }, [])

  const addEquipment = () => {
    setEquipments([{
      id: crypto.randomUUID(),
      type: 'Laptop',
      serialNumber: '',
      serialNumberStatus: null,
      alreadyAssigned: false,
      assignedToUser: undefined
    }, ...equipments])
  }

  const addConsumable = () => {
    if (consumableNames.length === 0) return
    setConsumables([{ id: crypto.randomUUID(), typeName: consumableNames[0], quantity: 1 }, ...consumables])
  }

  const updateConsumable = (id: string, changes: Partial<{ typeName?: string; quantity?: number; consumableId?: string }>) => {
    setConsumables(consumables.map(c => c.id === id ? { ...c, ...changes } : c))
  }

  const removeConsumable = (id: string) => setConsumables(consumables.filter(c => c.id !== id))

  const removeEquipment = (id: string) => {
    setEquipments(equipments.filter(e => e.id !== id))
  }

  const updateEquipmentType = (id: string, type: EquipmentTypeName) => {
    setEquipments(equipments.map(e => 
      e.id === id ? { 
        ...e, 
        type, 
        serialNumber: '',
        serialNumberStatus: null,
        brand: undefined,
        model: undefined,
        description: undefined,
        foundData: null,
        alreadyAssigned: false,
        assignedToUser: undefined
      } : e
    ))
  }

  const updateSerialNumber = (id: string, serialNumber: string) => {
    // Rechercher automatiquement
    let found: Machine | Screen | null = null
    let status: 'found' | 'not-found' | null = null

    if (serialNumber.trim()) {
      const eq = equipments.find(e => e.id === id)
      
      // Chercher dans les machines (Laptop, PC)
      if (eq && (eq.type === 'Laptop' || eq.type === 'PC')) {
        found = machines.find(m => 
          m.serialNumber?.toLowerCase() === serialNumber.toLowerCase()
        ) || null
        
        // Vérifier si la machine est déjà assignée
        if (found && 'userId' in found && found.userId) {
          const assignedUser = users.find(u => u.id === found.userId)
          if (assignedUser) {
            toast.warning(
              `Attention: Cet équipement est déjà assigné à ${assignedUser.firstName} ${assignedUser.lastName}`,
              { duration: 5000 }
            )
          }
        }
      }
      
      // Chercher dans les écrans
      if (eq && eq.type === 'Écran') {
        found = screens.find(s => 
          s.serialNumber?.toLowerCase() === serialNumber.toLowerCase()
        ) || null
        
        // Vérifier si l'écran est déjà assigné
        if (found && 'userId' in found && found.userId) {
          const assignedUser = users.find(u => u.id === found.userId)
          if (assignedUser) {
            toast.warning(
              `Attention: Cet écran est déjà assigné à ${assignedUser.firstName} ${assignedUser.lastName}`,
              { duration: 5000 }
            )
          }
        }
      }

      status = found ? 'found' : 'not-found'
    }

    setEquipments(equipments.map(e => {
      if (e.id !== id) return e

      if (found) {
        // Machine trouvée
        if ('machineName' in found) {
          const isAssigned = found.userId !== null
          const assignedUser = isAssigned ? users.find(u => u.id === found.userId) : null
          
          return {
            ...e,
            serialNumber,
            serialNumberStatus: 'found',
            brand: found.vendor,
            model: found.model,
            description: found.machineName,
            inventoryCode: found.inventoryCode,
            foundData: found,
            alreadyAssigned: isAssigned,
            assignedToUser: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : undefined
          }
        }
        // Écran trouvé
        else {
          const isAssigned = found.userId !== null
          const assignedUser = isAssigned ? users.find(u => u.id === found.userId) : null
          
          return {
            ...e,
            serialNumber,
            serialNumberStatus: 'found',
            brand: found.brand,
            model: found.model,
            description: `${found.brand} ${found.model} ${found.size}`,
            inventoryCode: found.inventoryCode,
            foundData: found,
            alreadyAssigned: isAssigned,
            assignedToUser: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : undefined
          }
        }
      } else {
        return {
          ...e,
          serialNumber,
          serialNumberStatus: status,
          brand: undefined,
          model: undefined,
          description: undefined,
          inventoryCode: undefined,
          foundData: null,
          alreadyAssigned: false,
          assignedToUser: undefined
        }
      }
    }))
  }

  const handleGenerate = async () => {
    if (!selectedUser) {
      toast.error("Veuillez sélectionner un utilisateur")
      return
    }

    if (equipments.length === 0 && consumables.length === 0) {
      toast.error("Veuillez ajouter au moins un équipement ou un consommable")
      return
    }

    // Vérifier que tous les équipements (s'il y en a) ont un numéro de série
    if (equipments.length > 0) {
      const hasEmptyFields = equipments.some(e => !e.serialNumber.trim())
      if (hasEmptyFields) {
        toast.error("Veuillez remplir le numéro de série pour tous les équipements")
        return
      }
    }

    // Vérifier qu'aucun équipement n'est déjà assigné (si des équipements sont fournis)
    if (equipments.length > 0) {
      const alreadyAssignedEquipments = equipments.filter(e => e.alreadyAssigned)
      if (alreadyAssignedEquipments.length > 0) {
        const equipmentsList = alreadyAssignedEquipments
          .map(e => `${e.serialNumber} (assigné à ${e.assignedToUser})`)
          .join(', ')
        
        toast.error(
          `Impossible de générer le bon de livraison. Ces équipements sont déjà assignés: ${equipmentsList}`,
          { duration: 8000 }
        )
        return
      }
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/delivery-notes/generate-v3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser,
          equipments: equipments,
          notes: notes.trim() || undefined,
          consumables: consumables.map(c => ({ consumableId: c.consumableId, typeName: c.typeName, quantity: c.quantity }))
        }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const msg = data?.error || "Impossible de générer le bon de livraison. Veuillez vérifier les données et réessayer."
        toast.error(msg)
        setIsLoading(false)
        return
      }

      toast.success("Bon de livraison généré avec succès")
      
      // Ouvrir le PDF dans un nouvel onglet
      if (data?.pdfUrl) {
        window.open(data.pdfUrl, '_blank')
      }
      
      // Réinitialiser le formulaire
      setSelectedUser("")
      setEquipments([])
      setConsumables([])
      setNotes("")
      
      router.refresh()
    } catch (error) {
      toast.error("Impossible de générer le bon de livraison. Veuillez vérifier les données et réessayer.")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Sélection de l'utilisateur */}
      <div className="space-y-2">
        <Label>Utilisateur *</Label>
        <Select value={selectedUser} onValueChange={setSelectedUser}>
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

      {/* Notes optionnelles */}
      <div className="space-y-2">
        <Label>Notes / Détails supplémentaires (optionnel)</Label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ajoutez des notes, remarques ou détails supplémentaires pour ce bon de livraison..."
          className="w-full min-h-[100px] px-3 py-2 border border-input rounded-md bg-background text-sm resize-y"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">
          {notes.length}/500 caractères
        </p>
      </div>

      {/* Liste des équipements */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold">Équipements</Label>
          <Button type="button" onClick={addEquipment} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un équipement
          </Button>
        </div>

        {equipments.map((equipment, index) => (
          <div key={equipment.id} className="border rounded-lg p-4 space-y-4 bg-card">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Équipement #{index + 1}</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeEquipment(equipment.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Type d'équipement */}
              <div className="space-y-2">
                <Label className="text-sm">Type *</Label>
                <Select
                  value={equipment.type}
                  onValueChange={(val) => updateEquipmentType(equipment.id, val as EquipmentTypeName)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Numéro de série avec recherche automatique */}
              <div className="space-y-2">
                <Label className="text-sm">Numéro de série *</Label>
                <Input
                  value={equipment.serialNumber}
                  onChange={(e) => updateSerialNumber(equipment.id, e.target.value)}
                  placeholder="Entrez le N° de série..."
                  className="h-9"
                />
              </div>
            </div>

            {/* Message si N° série non trouvé */}
            {equipment.serialNumberStatus === 'not-found' && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Numéro de série <strong>{equipment.serialNumber}</strong> non trouvé dans la base de données.
                </p>
              </div>
            )}

            {/* Avertissement si équipement déjà assigné */}
            {equipment.alreadyAssigned && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-800 dark:text-red-200 font-semibold">
                  🚫 ÉQUIPEMENT DÉJÀ ASSIGNÉ
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Cet équipement est déjà assigné à <strong>{equipment.assignedToUser}</strong>. 
                  Vous ne pouvez pas générer un bon de livraison avec cet équipement.
                </p>
              </div>
            )}

            {/* Informations auto-complétées si trouvé ET non assigné */}
            {equipment.serialNumberStatus === 'found' && equipment.foundData && !equipment.alreadyAssigned && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-2">
                <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                  ✓ Équipement trouvé dans la base de données
                </p>
                <div className="grid gap-2 text-sm text-green-700 dark:text-green-300">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-medium">Marque:</span> {equipment.brand}
                    </div>
                    <div>
                      <span className="font-medium">Modèle:</span> {equipment.model}
                    </div>
                  </div>
                  {equipment.description && (
                    <div>
                      <span className="font-medium">Description:</span> {equipment.description}
                    </div>
                  )}
                  {equipment.inventoryCode && (
                    <div>
                      <span className="font-medium">Code inventaire:</span> {equipment.inventoryCode}
                    </div>
                  )}
                  {'machineName' in equipment.foundData && (
                    <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-green-300 dark:border-green-700">
                      {equipment.foundData.cpu && (
                        <div>
                          <span className="font-medium">CPU:</span> {equipment.foundData.cpu}
                        </div>
                      )}
                      {equipment.foundData.ram && (
                        <div>
                          <span className="font-medium">RAM:</span> {equipment.foundData.ram}
                        </div>
                      )}
                      {equipment.foundData.disk && (
                        <div>
                          <span className="font-medium">Disque:</span> {equipment.foundData.disk}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Consommables */}
        <div className="mt-6">
            <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold">Consommables</Label>
            <Button type="button" onClick={addConsumable} size="sm" disabled={consumableNames.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un consommable
            </Button>
          </div>

          {consumables.length === 0 && (
            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg mt-4">
              Aucun consommable ajouté.
            </div>
          )}

          {consumables.map((c, idx) => (
            <div key={c.id} className="border rounded-lg p-4 space-y-3 mt-4 bg-card">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Consommable #{idx + 1}</h4>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeConsumable(c.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Nom / Type</Label>
                  <Select value={c.typeName ?? (consumableNames[0] ?? '')} onValueChange={(v) => updateConsumable(c.id, { typeName: v })}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {consumableNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Quantité</Label>
                  <Input type="number" className="h-9" value={c.quantity} onChange={(e) => updateConsumable(c.id, { quantity: Number(e.target.value) || 0 })} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {equipments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            Aucun équipement ajouté. Cliquez sur "Ajouter un équipement" pour commencer.
          </div>
        )}
      </div>

      {/* Aperçu */}
      {selectedUser && equipments.length > 0 && (
        <div className="border rounded-lg p-6 bg-secondary/20">
          <h3 className="font-semibold mb-4">Aperçu du Bon de Livraison</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium">Utilisateur:</p>
              <p className="text-muted-foreground">
                {users.find(u => u.id === selectedUser)?.firstName} {users.find(u => u.id === selectedUser)?.lastName}
              </p>
            </div>
            <div>
              <p className="font-medium">Équipements ({equipments.length}):</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                {equipments.map((eq) => (
                  <li key={eq.id}>
                    {eq.type}: {eq.serialNumber}
                    {eq.brand && ` - ${eq.brand}`}
                    {eq.model && ` ${eq.model}`}
                    {eq.serialNumberStatus === 'not-found' && ' ⚠️ Non trouvé'}
                    {eq.serialNumberStatus === 'found' && ' ✓'}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Bouton de génération */}
      <div className="flex flex-col gap-2">
        {equipments.some(e => e.alreadyAssigned) && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-800 dark:text-red-200 font-semibold">
              ⚠️ Impossible de générer le bon de livraison : un ou plusieurs équipements sont déjà assignés
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/delivery-notes")}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={(e) => {
              const hasAssigned = equipments.some(eq => eq.alreadyAssigned)
              console.log('🔍 Equipments:', equipments)
              console.log('🔍 Has assigned?', hasAssigned)
              if (hasAssigned) {
                e.preventDefault()
                e.stopPropagation()
                toast.error("Impossible de générer le bon de livraison : un ou plusieurs équipements sont déjà assignés")
                return false
              }
              handleGenerate()
            }}
            disabled={isLoading || equipments.some(e => e.alreadyAssigned === true)}
            aria-disabled={equipments.some(e => e.alreadyAssigned === true)}
            data-disabled={equipments.some(e => e.alreadyAssigned === true)}
          >
            {isLoading ? "Génération..." : "Générer le bon de livraison"}
          </Button>
        </div>
      </div>
    </div>
  )
}
