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
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
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
    'inventoryCode',
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
    inventoryCode: 'Code',
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
      const c = (s.machine as any)?.company as any
      if (c && c.id && !map.has(c.id)) map.set(c.id, c)
    })
    return Array.from(map.values())
  }, [screens])

  const usersList = useMemo(() => {
    const map = new Map<string, { id: string; firstName: string; lastName: string; email: string }>()
    screens.forEach(s => {
      const u = s.user || s.machine?.user
      if (u && u.id && !map.has(u.id)) map.set(u.id, u)
    })
    return Array.from(map.values())
  }, [screens])

  const [selectedCompany, setSelectedCompany] = useState<string | null>("all")
  const [selectedUser, setSelectedUser] = useState<string | null>("all")

  const filteredScreens = useMemo(() => {
    return screens.filter(s => {
      const companyId = (s.machine as any)?.company?.id
      const userId = s.user?.id || (s.machine as any)?.user?.id
      const companyMatch = selectedCompany === 'all' || !selectedCompany || companyId === selectedCompany
      const userMatch = selectedUser === 'all' || !selectedUser || userId === selectedUser
      return companyMatch && userMatch
    })
  }, [screens, selectedCompany, selectedUser])

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-3">
            <Select value={selectedCompany ?? "all"} onValueChange={(v) => setSelectedCompany(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Toutes les sociétés" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les sociétés</SelectItem>
              {companies.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name ?? c.code ?? c.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedUser ?? "all"} onValueChange={(v) => setSelectedUser(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Tous les utilisateurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les utilisateurs</SelectItem>
              {usersList.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => router.push("/dashboard/screens/create") }>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un écran
          </Button>

          <ColumnSelector allColumns={allColumns} columnLabels={columnLabels} selectedColumns={selectedColumns} onChange={setSelectedColumns} />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {selectedColumns.includes('inventoryCode') && <TableHead className="w-[110px]">Code</TableHead>}
              {selectedColumns.includes('brand') && <TableHead className="w-[100px]">Marque</TableHead>}
              {selectedColumns.includes('model') && <TableHead className="w-[100px]">Modèle</TableHead>}
              {selectedColumns.includes('size') && <TableHead className="w-[80px]">Taille</TableHead>}
              {selectedColumns.includes('resolution') && <TableHead className="w-[100px]">Résolution</TableHead>}
              {selectedColumns.includes('serialNumber') && <TableHead className="w-[120px]">N° Série</TableHead>}
              {selectedColumns.includes('purchaseDate') && <TableHead className="w-[100px]">Achat</TableHead>}
              {selectedColumns.includes('warrantyDate') && <TableHead className="w-[100px]">Garantie</TableHead>}
              {selectedColumns.includes('machine') && <TableHead className="w-[150px]">Machine</TableHead>}
              {selectedColumns.includes('user') && <TableHead className="w-[200px]">Utilisateur</TableHead>}
              {selectedColumns.includes('actions') && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {screens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={Math.max(1, selectedColumns.length)} className="text-center text-muted-foreground">
                  Aucun écran trouvé
                </TableCell>
              </TableRow>
            ) : (
              screens.map((screen) => (
                <TableRow key={screen.id}>
                  {selectedColumns.includes('inventoryCode') && (
                    <TableCell className="font-mono text-xs">{screen.inventoryCode}</TableCell>
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
