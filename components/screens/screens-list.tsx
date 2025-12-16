"use client"

import { useEffect, useState, useLayoutEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import ColumnSelector from "@/components/ui/column-selector"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu"
import { useMemo } from "react"

interface Screen {
  id: string
  brand: string
  serialNumber: string
  inventoryCode: string
  model: string | null
  size: string | null
  resolution: string | null
  purchaseDate: string | null
  warrantyDate: string | null
  machine: {
    machineName: string
    inventoryCode: string
    user: {
      id: string
      firstName: string
      lastName: string
      email: string
    } | null
  } | null
  company?: {
    id: string
    name?: string | null
    code?: string | null
  }
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
}

interface ScreensListProps {
  initialColumns?: string[]
}

export function ScreensList({ initialColumns }: ScreensListProps) {
  const router = useRouter()
  const [screens, setScreens] = useState<Screen[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const allColumns = [
    'assetStatus',
    'inventoryCode',
    'company',
    'brand',
    'model',
    'size',
    'resolution',
    'serialNumber',
    'purchaseDate',
    'warrantyDate',
    'machine',
    'user',
    'actions'
  ]

  const columnLabels: Record<string, string> = {
    assetStatus: 'Statut',
    inventoryCode: 'Code',
    company: 'Société',
    brand: 'Marque',
    model: 'Modèle',
    size: 'Taille',
    resolution: 'Résolution',
    serialNumber: "N° Série",
    purchaseDate: "Achat",
    warrantyDate: 'Garantie',
    machine: 'Machine',
    user: 'Utilisateur',
    actions: 'Actions'
  }

  const [selectedColumns, setSelectedColumns] = useState<string[]>(initialColumns && initialColumns.length > 0 ? initialColumns : allColumns)

  useLayoutEffect(() => {
    if (!initialColumns) {
      try {
        const raw = localStorage.getItem('screens_table_columns')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSelectedColumns(parsed)
          }
        }
      } catch (e) {}
    }
  }, [initialColumns])

  useEffect(() => {
    try {
      localStorage.setItem('screens_table_columns', JSON.stringify(selectedColumns))
    } catch (e) {}

    try {
      const cookieValue = encodeURIComponent(JSON.stringify(selectedColumns))
      document.cookie = `screens_table_columns=${cookieValue}; path=/; max-age=${60 * 60 * 24 * 365}`
    } catch (e) {}
  }, [selectedColumns])

  useEffect(() => {
    fetchScreens()
  }, [])

  const fetchScreens = async () => {
    try {
      const response = await fetch("/api/screens")
      if (response.ok) {
        const data = await response.json()
        setScreens(data.screens || [])
      }
    } catch (error) {
      console.error("Erreur lors du chargement des écrans:", error)
    } finally {
      setIsLoading(false)
    }
  }


  // derive filter lists
  const companies = useMemo(() => {
    const map = new Map<string, { id: string; name?: string; code?: string }>()
    screens.forEach(s => {
      const c = (s as any).company || (s.machine as any)?.company
      if (c && c.id && !map.has(c.id)) map.set(c.id, c)
    })
    return Array.from(map.values())
  }, [screens])

  const statusOptions = [
    { value: 'en_stock', label: 'En stock' },
    { value: 'en_service', label: 'En service' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'retiré', label: 'Retiré' },
  ]

  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  const toggleCompany = (id: string) => {
    setSelectedCompanies(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => prev.includes(status) ? prev.filter(x => x !== status) : [...prev, status])
  }

  const filteredScreens = useMemo(() => {
    return screens.filter(s => {
      const companyId = (s as any).company?.id || (s.machine as any)?.company?.id
      const status = (s as any).assetStatus || (s.machine as any)?.assetStatus || 'en_stock'
      const companyMatch = selectedCompanies.length === 0 || companyId == null || selectedCompanies.includes(companyId)
      const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(status)
      return companyMatch && statusMatch
    })
  }, [screens, selectedCompanies, selectedStatuses])

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Button onClick={() => router.push("/dashboard/screens/create") }>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un écran
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">Sociétés</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent sideOffset={6} className="w-[220px]">
              <DropdownMenuLabel>Filtrer par société</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {companies.map((c: any) => (
                <DropdownMenuCheckboxItem key={c.id} checked={selectedCompanies.includes(c.id)} onCheckedChange={() => toggleCompany(c.id)}>
                  {c.name ?? c.code ?? c.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">Statuts</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent sideOffset={6} className="w-[220px]">
              <DropdownMenuLabel>Filtrer par statut</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {statusOptions.map(s => (
                <DropdownMenuCheckboxItem key={s.value} checked={selectedStatuses.includes(s.value)} onCheckedChange={() => toggleStatus(s.value)}>
                  {s.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <ColumnSelector allColumns={allColumns} columnLabels={columnLabels} selectedColumns={selectedColumns} onChange={setSelectedColumns} />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {selectedColumns.includes('inventoryCode') && <TableHead className="w-[110px]">Code</TableHead>}
              {selectedColumns.includes('company') && <TableHead className="w-[150px]">Société</TableHead>}
              {selectedColumns.includes('brand') && <TableHead className="w-[100px]">Marque</TableHead>}
              {selectedColumns.includes('model') && <TableHead className="w-[100px]">Modèle</TableHead>}
              {selectedColumns.includes('size') && <TableHead className="w-[80px]">Taille</TableHead>}
              {selectedColumns.includes('resolution') && <TableHead className="w-[100px]">Résolution</TableHead>}
              {selectedColumns.includes('serialNumber') && <TableHead className="w-[120px]">N° Série</TableHead>}
              {selectedColumns.includes('purchaseDate') && <TableHead className="w-[100px]">Achat</TableHead>}
              {selectedColumns.includes('warrantyDate') && <TableHead className="w-[100px]">Garantie</TableHead>}
              {selectedColumns.includes('assetStatus') && <TableHead className="w-[110px]">Statut</TableHead>}
              {selectedColumns.includes('machine') && <TableHead className="w-[150px]">Machine</TableHead>}
              {selectedColumns.includes('user') && <TableHead className="w-[200px]">Utilisateur</TableHead>}
              {selectedColumns.includes('actions') && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredScreens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={Math.max(1, selectedColumns.length)} className="text-center text-muted-foreground">
                  Aucun écran trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredScreens.map((screen) => (
                <TableRow key={screen.id}>
                  {selectedColumns.includes('inventoryCode') && (
                    <TableCell className="font-mono text-xs">{screen.inventoryCode}</TableCell>
                  )}
                  {selectedColumns.includes('company') && (
                    <TableCell className="text-sm">{(screen as any).company?.name ?? (screen as any).company?.code ?? (screen.machine as any)?.company?.name ?? (screen.machine as any)?.company?.code ?? '-'}</TableCell>
                  )}
                  {selectedColumns.includes('brand') && (
                    <TableCell className="text-sm">{screen.brand}</TableCell>
                  )}
                  {selectedColumns.includes('model') && (
                    <TableCell className="text-sm">{screen.model || "-"}</TableCell>
                  )}
                  {selectedColumns.includes('size') && (
                    <TableCell className="text-center">{screen.size ? <Badge variant="secondary" className="text-xs">{screen.size}</Badge> : "-"}</TableCell>
                  )}
                  {selectedColumns.includes('resolution') && (
                    <TableCell className="text-center">{screen.resolution ? <Badge variant="outline" className="text-xs">{screen.resolution}</Badge> : "-"}</TableCell>
                  )}
                  {selectedColumns.includes('serialNumber') && (
                    <TableCell className="font-mono text-xs">{screen.serialNumber}</TableCell>
                  )}
                  {selectedColumns.includes('purchaseDate') && (
                    <TableCell className="text-xs">{screen.purchaseDate ? new Date(screen.purchaseDate).toLocaleDateString('fr-FR') : "-"}</TableCell>
                  )}
                  {selectedColumns.includes('warrantyDate') && (
                    <TableCell className="text-xs">{screen.warrantyDate ? new Date(screen.warrantyDate).toLocaleDateString('fr-FR') : "-"}</TableCell>
                  )}
                  {selectedColumns.includes('assetStatus') && (
                    <TableCell>
                      {(() => {
                        const status = (screen as any).assetStatus || (screen.machine as any)?.assetStatus || 'en_stock'
                        switch (status) {
                          case 'en_service': return <Badge className="bg-green-500">En service</Badge>
                          case 'maintenance': return <Badge className="bg-orange-500">Maintenance</Badge>
                          case 'en_stock': return <Badge variant="secondary">En stock</Badge>
                          case 'retiré': return <Badge variant="destructive">Retiré</Badge>
                          default: return <Badge variant="outline">{status}</Badge>
                        }
                      })()}
                    </TableCell>
                  )}
                  {selectedColumns.includes('machine') && (
                    <TableCell>{screen.machine ? <div className="text-xs"><div className="font-medium">{screen.machine.machineName}</div><div className="text-muted-foreground">{screen.machine.inventoryCode}</div></div> : "-"}</TableCell>
                  )}
                  {selectedColumns.includes('user') && (
                    <TableCell>{screen.user || screen.machine?.user ? <div className="text-xs"><div className="font-medium">{screen.user ? `${screen.user.firstName} ${screen.user.lastName}` : `${screen.machine?.user?.firstName} ${screen.machine?.user?.lastName}`}</div><div className="text-muted-foreground truncate max-w-[180px]">{screen.user?.email || screen.machine?.user?.email}</div></div> : <Badge variant="secondary" className="text-xs">Non assigné</Badge>}</TableCell>
                  )}
                  {selectedColumns.includes('actions') && (
                    <TableCell><Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/screens/${screen.id}`)}>Modifier</Button></TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
