"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus,
  AlertTriangle, 
  Package, 
  Building, 
  TrendingDown,
  RefreshCw,
  Filter,
  Clock
} from 'lucide-react'
import { Edit2, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'

type Consumable = {
  id: string
  name: string
  sku?: string | null
  quantity: number
  minThreshold?: number | null
  companyId: string
}

type Props = {
  initialCompanies?: Array<{ id: string; name: string }> | null
  initialItems?: Consumable[] | null
  initialNames?: string[] | null
  isSuperAdmin?: boolean
  canCreate?: boolean
  userRole?: string | null
  initialSelectedCompany?: string | null
  initialUserCompanyId?: string | null
}

export default function ConsumableList({ 
  initialCompanies = null, 
  initialItems = null, 
  initialNames = null, 
  isSuperAdmin = false,
  canCreate = false,
  userRole = null,
  initialSelectedCompany = null,
  initialUserCompanyId = null,
}: Props) {
  const [items, setItems] = useState<Consumable[]>(initialItems || [])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<string>(
    // prefer explicit user company id, else server-provided selected company, else 'all'
    (initialUserCompanyId && initialUserCompanyId !== 'all') ? initialUserCompanyId : ((typeof (initialSelectedCompany) !== 'undefined' && initialSelectedCompany !== null) ? initialSelectedCompany : 'all')
  )
  const [filterName, setFilterName] = useState<string>('')
  
  // New consumable form
  const [newName, setNewName] = useState<string>('')
  const [newSku, setNewSku] = useState<string>('')
  const [minThreshold, setMinThreshold] = useState<number>(5)
  const [newCompanyId, setNewCompanyId] = useState<string>(
    // default to server-provided selected company when available, else first company
    (typeof (initialSelectedCompany) !== 'undefined' && initialSelectedCompany && initialSelectedCompany !== 'all') ? initialSelectedCompany : ((initialCompanies && initialCompanies.length > 0) ? initialCompanies[0].id : '')
  )
  
  // Adjust dialog
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Consumable | null>(null)
  const [adjustValue, setAdjustValue] = useState<number>(0)
  const [reason, setReason] = useState<string>('')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editMinThreshold, setEditMinThreshold] = useState<number | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyEntries, setHistoryEntries] = useState<any[]>([])
  
  // Data
  const [consumableNames, setConsumableNames] = useState<string[]>(initialNames || [])
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>(initialCompanies || [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch names from API
      try {
        const namesRes = await fetch('/api/consumable-names')
        if (namesRes.ok) {
          const namesData = await namesRes.json()
          if (Array.isArray(namesData)) setConsumableNames(namesData)
        }
      } catch (err) {
        const saved = localStorage.getItem('custom_consumable_names')
        if (saved) setConsumableNames(JSON.parse(saved))
      }

      // Load companies if not provided
      if (!initialCompanies) {
        const companiesRes = await fetch('/api/companies')
        if (companiesRes.ok) {
          const companiesData = await companiesRes.json()
          setCompanies(Array.isArray(companiesData) ? companiesData : [])
        }
      }

        // If we fetched companies and no default company selected, pick first
        if (!newCompanyId && !initialCompanies) {
          try {
            const companiesRes2 = await fetch('/api/companies')
            if (companiesRes2.ok) {
              const companiesData2 = await companiesRes2.json()
              if (Array.isArray(companiesData2) && companiesData2.length > 0) {
                setNewCompanyId(companiesData2[0].id)
              }
            }
          } catch (e) {
            // ignore
          }
        }

      // Load consumables. If a specific company is selected, request server-side filtered list.
      const query = selectedCompany !== 'all' ? `?companyId=${selectedCompany}` : ''
      const res = await fetch(`/api/consumables${query}`)
      if (res.ok) {
        const data = await res.json()
        setItems(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      toast.error('Impossible de charger les données')
    } finally { 
      setLoading(false) 
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Filter items based on selected filters
  const filteredItems = items.filter(item => {
    if (selectedCompany !== 'all' && item.companyId !== selectedCompany) return false
    if (filterName && !item.name.toLowerCase().includes(filterName.toLowerCase())) return false
    return true
  })

  // Items with low stock
  const lowStockItems = filteredItems.filter(item => {
    const threshold = item.minThreshold || 5
    return item.quantity <= threshold && item.quantity > 0
  })

  // Out of stock items
  const outOfStockItems = filteredItems.filter(item => item.quantity === 0)

  const handleCreateConsumable = async () => {
    if (!newName.trim()) {
      toast.error('Le nom est requis')
      return
    }
    // If companies exist but no company selected, default to first
    const effectiveCompanyId = newCompanyId || (companies.length > 0 ? companies[0].id : undefined)
    if (!effectiveCompanyId && companies.length > 0) {
      toast.error('Veuillez sélectionner une société')
      return
    }

    setCreating(true)
    try {
      const payload = {
        name: newName.trim(),
        sku: newSku.trim() || undefined,
        minThreshold,
        companyId: effectiveCompanyId || undefined,
        quantity: 0 // Start with 0, adjust after creation
      }

      const res = await fetch('/api/consumables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Erreur lors de la création')

      toast.success('Consommable créé avec succès')
      
      // Reset form
      setNewName('')
      setNewSku('')
      setMinThreshold(5)
      if (companies.length > 0) setNewCompanyId(companies[0].id)
      
      // Refresh data
      await load()
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création')
    } finally {
      setCreating(false)
    }
  }

  const handleAdjustStock = async () => {
    if (!selectedItem) return
    if (adjustValue === 0) {
      toast.error('La valeur d\'ajustement ne peut pas être 0')
      return
    }
    if (!reason || !reason.trim()) {
      toast.error('La raison est obligatoire pour la traçabilité')
      return
    }

    // Prevent scoped admins from decrementing (server also enforces)
    if ((userRole === 'admin' || userRole === 'company_admin') && adjustValue < 0) {
      toast.error('Permissions insuffisantes pour décrémenter le stock')
      return
    }

    try {
      const res = await fetch(`/api/consumables/${selectedItem.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          change: adjustValue, 
          reason: reason || 'Ajustement manuel' 
        })
      })

      if (!res.ok) throw new Error('Erreur lors de l\'ajustement')

      toast.success(`Stock ajusté de ${adjustValue > 0 ? '+' : ''}${adjustValue}`)
      
      // Reset dialog
      setAdjustDialogOpen(false)
      setSelectedItem(null)
      setAdjustValue(0)
      setReason('')
      
      // Refresh data
      await load()
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'ajustement')
    }
  }

  // Edit minimum threshold handler
  const handleSaveMinThreshold = async () => {
    if (!selectedItem) return
    try {
      const res = await fetch(`/api/consumables/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minimumStock: editMinThreshold })
      })
      if (!res.ok) throw new Error('Erreur')
      toast.success('Seuil mis à jour')
      setEditDialogOpen(false)
      setSelectedItem(null)
      await load()
    } catch (err) {
      toast.error('Impossible de mettre à jour le seuil')
    }
  }

  const handleDeleteConsumable = async () => {
    if (!selectedItem) return
    try {
      const res = await fetch(`/api/consumables/${selectedItem.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur')
      toast.success('Consommable supprimé')
      setDeleteConfirmOpen(false)
      setSelectedItem(null)
      await load()
    } catch (err) {
      toast.error('Impossible de supprimer le consommable')
    }
  }

  const loadHistory = async (consumableId: string) => {
    try {
      const res = await fetch(`/api/consumables/${consumableId}/history`)
      if (!res.ok) throw new Error('Erreur chargement historique')
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      // Normalize user field to a string for safe rendering
      const normalized = list.map((h: any) => {
        let userStr = null
        if (!h) return h
        if (typeof h.user === 'string') userStr = h.user
        else if (h.user && typeof h.user === 'object') {
          const fn = h.user.firstName || ''
          const ln = h.user.lastName || ''
          userStr = `${fn} ${ln}`.trim() || null
        } else if (h.firstName || h.lastName) {
          userStr = `${h.firstName || ''} ${h.lastName || ''}`.trim() || null
        }
        // determine recipient string if present
        let recipientStr = null
        if (typeof h.recipient === 'string') recipientStr = h.recipient
        else if (h.recipient && typeof h.recipient === 'object') {
          const rfn = h.recipient.firstName || ''
          const rln = h.recipient.lastName || ''
          recipientStr = `${rfn} ${rln}`.trim() || null
        } else if (h.recipient_first || h.recipient_last) {
          recipientStr = `${h.recipient_first || ''} ${h.recipient_last || ''}`.trim() || null
        }

        return {
          id: h.id,
          change: h.change,
          reason: h.reason,
          user: userStr,
          recipient: recipientStr,
          deliveryNoteId: h.deliveryNoteId,
          returnNoteId: h.returnNoteId,
          createdAt: h.createdAt,
        }
      })
      setHistoryEntries(normalized)
      setHistoryOpen(true)
    } catch (err: any) {
      toast.error(err.message || 'Impossible de charger l\'historique')
    }
  }

  const getStockStatus = (item: Consumable) => {
    const threshold = item.minThreshold || 5
    if (item.quantity === 0) return { label: 'Rupture', variant: 'destructive' as const }
    if (item.quantity <= threshold) return { label: 'Stock bas', variant: 'warning' as const }
    return { label: 'Disponible', variant: 'success' as const }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Consommables</h1>
          <p className="text-muted-foreground">
            Surveillez et gérez votre stock de consommables
          </p>
        </div>
        <Button onClick={load} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>
      {/* Edit Threshold Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(o) => { if (!o) { setEditDialogOpen(false); setSelectedItem(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le seuil d'alerte</DialogTitle>
            <DialogDescription>
              {selectedItem ? selectedItem.name : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Seuil d'alerte</Label>
              <Input type="number" value={editMinThreshold ?? 5} onChange={(e) => setEditMinThreshold(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedItem(null) }}>Annuler</Button>
            <Button onClick={handleSaveMinThreshold}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={(o) => { if (!o) { setDeleteConfirmOpen(false); setSelectedItem(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le consommable</DialogTitle>
            <DialogDescription>Confirmez la suppression du consommable sélectionné.</DialogDescription>
          </DialogHeader>
          <div className="py-2">{selectedItem ? <p>Supprimer <strong>{selectedItem.name}</strong> ? Cette action est irréversible.</p> : null}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setSelectedItem(null) }}>Annuler</Button>
            <Button onClick={handleDeleteConsumable} className="bg-red-600">Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={(o) => { if (!o) { setHistoryOpen(false); setHistoryEntries([]) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Historique des ajustements</DialogTitle>
            <DialogDescription>
              {selectedItem ? `${selectedItem.name} — ${selectedItem.quantity} en stock` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-80 overflow-auto">
            {historyEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun historique trouvé.</p>
            ) : (
              <ul className="space-y-2">
                {historyEntries.map(h => (
                  <li key={h.id} className="border rounded p-2">
                    <div className="flex justify-between text-sm">
                      <div className="font-medium">{h.change > 0 ? `+${h.change}` : `${h.change}`}</div>
                      <div className="text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">{h.reason}</div>
                    <div className="text-xs text-muted-foreground mt-1">Par: {h.user || 'Inconnu'} {h.deliveryNoteId ? `• BL: ${h.deliveryNoteId}` : ''} {h.returnNoteId ? `• RN: ${h.returnNoteId}` : ''} {h.recipient ? `• Destinataire: ${h.recipient}` : ''}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setHistoryOpen(false); setHistoryEntries([]) }}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Consommables</p>
                <p className="text-2xl font-bold">{filteredItems.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stock Bas</p>
                <p className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En Rupture</p>
                <p className="text-2xl font-bold text-red-600">{outOfStockItems.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters & Create Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtres</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-filter">Société</Label>
                <Select value={selectedCompany} onValueChange={setSelectedCompany} disabled={!(isSuperAdmin || userRole === 'admin' || userRole === 'company_admin')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les sociétés" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les sociétés</SelectItem>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name-filter">Nom du consommable</Label>
                <Input
                  id="name-filter"
                  placeholder="Rechercher par nom..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {isSuperAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nouveau Consommable</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-name">Nom *</Label>
                  <Select value={newName} onValueChange={setNewName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner ou saisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {consumableNames.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="new-name"
                    placeholder="Ou saisir un nouveau nom..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-sku">Référence SKU (optionnel)</Label>
                  <Input
                    id="new-sku"
                    placeholder="SKU12345"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-threshold">Seuil d'alerte</Label>
                  <Input
                    id="min-threshold"
                    type="number"
                    min="0"
                    value={minThreshold}
                    onChange={(e) => setMinThreshold(Number(e.target.value))}
                  />
                </div>

                {isSuperAdmin && companies.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="company">Société</Label>
                    <Select 
                      value={newCompanyId} 
                      onValueChange={setNewCompanyId}
                      disabled={companies.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={companies.length > 0 ? "Sélectionner..." : "Chargement..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map(company => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button 
                  onClick={handleCreateConsumable} 
                  disabled={creating}
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {creating ? 'Création...' : 'Créer le consommable'}
                </Button>
              </CardContent>
            </Card>
          )}

          {!isSuperAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Création restreinte</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Seul le super admin peut créer des consommables. Contactez un administrateur si vous avez besoin d'un nouveau consommable.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Table */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Liste des Consommables</CardTitle>
                  <CardDescription>
                    {selectedCompany === 'all' 
                      ? 'Toutes les sociétés' 
                      : companies.find(c => c.id === selectedCompany)?.name}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  {filteredItems.length} élément{filteredItems.length !== 1 ? 's' : ''}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">Aucun consommable trouvé</h3>
                  <p className="text-muted-foreground mt-1">
                    Aucun consommable ne correspond à vos filtres
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Référence</TableHead>
                        <TableHead>Société</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead>Seuil min</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        const status = getStockStatus(item)
                        const company = companies.find(c => c.id === item.companyId)
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.sku || '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                {company?.name || 'Inconnue'}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{item.quantity}</TableCell>
                            <TableCell>{item.minThreshold || 5}</TableCell>
                            <TableCell>
                              <Badge variant={status.variant}>
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {/* Adjust dialog for admins and super_admin (scoped roles cannot decrement) */}
                                {(userRole === 'super_admin' || userRole === 'admin' || userRole === 'company_admin') && (
                                  <Dialog 
                                    open={adjustDialogOpen && selectedItem?.id === item.id} 
                                    onOpenChange={(open) => {
                                      if (!open) {
                                        setAdjustDialogOpen(false)
                                        setSelectedItem(null)
                                      } else {
                                        setSelectedItem(item)
                                        setAdjustDialogOpen(true)
                                      }
                                    }}
                                  >
                                    <DialogTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => setSelectedItem(item)}
                                      >
                                        Ajuster
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Ajuster le stock</DialogTitle>
                                        <DialogDescription>
                                          {item.name} - Stock actuel: {item.quantity}
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                          <Label htmlFor="adjust-value">
                                            Quantité (+ pour entrée, - pour sortie)
                                          </Label>
                                          <Input
                                            id="adjust-value"
                                            type="number"
                                            value={adjustValue}
                                            onChange={(e) => setAdjustValue(Number(e.target.value))}
                                            placeholder="Ex: +5 ou -3"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="reason">Raison (obligatoire)</Label>
                                          <Input
                                            id="reason"
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder="Ex: Commande fournisseur / Sortie pour intervention"
                                          />
                                        </div>
                                      </div>
                                      <DialogFooter>
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            setAdjustDialogOpen(false)
                                            setSelectedItem(null)
                                            setAdjustValue(0)
                                            setReason('')
                                          }}
                                        >
                                          Annuler
                                        </Button>
                                        <Button onClick={handleAdjustStock}>
                                          Enregistrer
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                )}
                                
                                <div className="flex gap-1 items-center">
                                  {/* Removed quick + / - buttons - only Ajuster remains for more controlled adjustments */}
                                  {/* Keep edit/delete icons for super_admin only */}
                                  {userRole === 'super_admin' && (
                                    <>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8"
                                        onClick={() => {
                                          setSelectedItem(item)
                                          setEditMinThreshold(item.minThreshold ?? 5)
                                          setEditDialogOpen(true)
                                        }}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>

                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-red-600"
                                        onClick={() => {
                                          setSelectedItem(item)
                                          setDeleteConfirmOpen(true)
                                        }}
                                      >
                                        <Trash className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}

                                  {/* History button - available to all roles */}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={() => { setSelectedItem(item); loadHistory(item.id) }}
                                  >
                                    <Clock className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}