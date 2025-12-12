"use client"

import { useState, useMemo, useEffect, useLayoutEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Machine = {
  id: string
  inventoryCode: string
  machineName: string | null
  type: string
  vendor: string
  model: string | null
  serialNumber: string
  windowsVersion?: string | null
  acquisitionDate: Date | null
  warrantyDate: Date | null
  assetStatus: string
  company: {
    id: string
    name: string
    code: string
  } | null
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
}

interface MachinesFilterProps {
  machines: Machine[]
}

export function MachinesFilter({ machines }: MachinesFilterProps) {
  const [selectedCompany, setSelectedCompany] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const allColumns = [
    'inventoryCode',
    'machineName',
    'type',
    'vendor',
    'model',
    'windowsVersion',
    'serialNumber',
    'company',
    'acquisitionDate',
    'warrantyDate',
    'user',
    'assetStatus',
    'actions'
  ]

  const columnLabels: Record<string, string> = {
    inventoryCode: 'Code Inventaire',
    machineName: 'Nom',
    type: 'Type',
    vendor: 'Marque',
    model: 'Modèle',
    windowsVersion: 'OS',
    serialNumber: "N° Série",
    company: 'Société',
    acquisitionDate: "Date d'Achat",
    warrantyDate: 'Garantie',
    user: "Utilisateur Assigné",
    assetStatus: 'Statut',
    actions: 'Actions'
  }

  // Start with server-friendly default; read persisted selection on mount to avoid
  // hydration mismatch between server and client.
  const [selectedColumns, setSelectedColumns] = useState<string[]>(allColumns)

  // Load persisted columns before paint (client-only) to avoid visible reset on reload
  useLayoutEffect(() => {
    try {
      const raw = localStorage.getItem('machines_table_columns')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedColumns(parsed)
        }
      }
    } catch (e) {
      // ignore
    }
  }, [])

  // Persist selection
  useEffect(() => {
    try {
      localStorage.setItem('machines_table_columns', JSON.stringify(selectedColumns))
    } catch (e) {}
  }, [selectedColumns])

  // Extraire les sociétés uniques
  const companies = useMemo(() => {
    const uniqueCompanies = new Map()
    machines.forEach(machine => {
      if (machine.company && !uniqueCompanies.has(machine.company.id)) {
        uniqueCompanies.set(machine.company.id, machine.company)
      }
    })
    return Array.from(uniqueCompanies.values())
  }, [machines])

  // Filtrer les machines
  const filteredMachines = useMemo(() => {
    return machines.filter(machine => {
      const companyMatch = selectedCompany === "all" || machine.company?.id === selectedCompany
      const statusMatch = selectedStatus === "all" || machine.assetStatus === selectedStatus
      return companyMatch && statusMatch
    })
  }, [machines, selectedCompany, selectedStatus])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'en_service':
        return <Badge className="bg-green-500">En service</Badge>
      case 'maintenance':
        return <Badge className="bg-orange-500">Maintenance</Badge>
      case 'en_stock':
        return <Badge variant="secondary">En stock</Badge>
      case 'retiré':
        return <Badge variant="destructive">Retiré</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filtrer par société" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les sociétés</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name} ({company.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="en_stock">En stock</SelectItem>
              <SelectItem value="en_service">En service</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="retiré">Retiré</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredMachines.length} résultat{filteredMachines.length > 1 ? 's' : ''}
        </div>

        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="mr-2 h-4 w-4" /> Colonnes
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent sideOffset={6}>
              <DropdownMenuLabel>Afficher les colonnes</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allColumns.map(col => (
                <DropdownMenuCheckboxItem
                  key={col}
                  checked={selectedColumns.includes(col)}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedColumns(prev => Array.from(new Set([...prev, col])))
                    else setSelectedColumns(prev => prev.filter(c => c !== col))
                  }}
                >
                  {columnLabels[col] ?? col}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tableau */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                  {selectedColumns.includes('inventoryCode') && <TableHead>Code Inventaire</TableHead>}
                  {selectedColumns.includes('machineName') && <TableHead>Nom</TableHead>}
                  {selectedColumns.includes('type') && <TableHead>Type</TableHead>}
                  {selectedColumns.includes('vendor') && <TableHead>Marque</TableHead>}
                  {selectedColumns.includes('model') && <TableHead>Modèle</TableHead>}
                  {selectedColumns.includes('windowsVersion') && <TableHead>OS</TableHead>}
                  {selectedColumns.includes('serialNumber') && <TableHead>N° Série</TableHead>}
                  {selectedColumns.includes('company') && <TableHead>Société</TableHead>}
                  {selectedColumns.includes('acquisitionDate') && <TableHead>Date d'Achat</TableHead>}
                  {selectedColumns.includes('warrantyDate') && <TableHead>Garantie</TableHead>}
                  {selectedColumns.includes('user') && <TableHead>Utilisateur Assigné</TableHead>}
                  {selectedColumns.includes('assetStatus') && <TableHead>Statut</TableHead>}
                  {selectedColumns.includes('actions') && <TableHead className="sticky right-0 bg-background">Actions</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMachines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={Math.max(1, selectedColumns.length)} className="text-center text-muted-foreground py-8">
                    Aucune machine trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredMachines.map((machine) => (
                  <TableRow key={machine.id}>
                    {selectedColumns.includes('inventoryCode') && (
                      <TableCell className="font-mono text-sm">{machine.inventoryCode}</TableCell>
                    )}
                    {selectedColumns.includes('machineName') && (
                      <TableCell className="font-medium">{machine.machineName || "-"}</TableCell>
                    )}
                    {selectedColumns.includes('type') && (
                      <TableCell><Badge variant="outline">{machine.type}</Badge></TableCell>
                    )}
                    {selectedColumns.includes('vendor') && (
                      <TableCell>{machine.vendor}</TableCell>
                    )}
                    {selectedColumns.includes('model') && (
                      <TableCell>{machine.model || "-"}</TableCell>
                    )}
                    {selectedColumns.includes('windowsVersion') && (
                      <TableCell className="text-sm">{machine.windowsVersion || "-"}</TableCell>
                    )}
                    {selectedColumns.includes('serialNumber') && (
                      <TableCell className="font-mono text-xs">{machine.serialNumber}</TableCell>
                    )}
                    {selectedColumns.includes('company') && (
                      <TableCell>
                        {machine.company ? (
                          <div className="text-sm">
                            <div className="font-medium">{machine.company.name}</div>
                            <div className="text-muted-foreground text-xs">{machine.company.code}</div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    )}
                    {selectedColumns.includes('acquisitionDate') && (
                      <TableCell className="text-sm">
                        {machine.acquisitionDate ? new Date(machine.acquisitionDate).toLocaleDateString('fr-FR') : "-"}
                      </TableCell>
                    )}
                    {selectedColumns.includes('warrantyDate') && (
                      <TableCell className="text-sm">
                        {machine.warrantyDate ? new Date(machine.warrantyDate).toLocaleDateString('fr-FR') : "-"}
                      </TableCell>
                    )}
                    {selectedColumns.includes('user') && (
                      <TableCell>
                        {machine.user ? (
                          <div className="text-sm">
                            <div className="font-medium">{machine.user.firstName} {machine.user.lastName}</div>
                            <div className="text-muted-foreground text-xs">{machine.user.email}</div>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Non assigné</Badge>
                        )}
                      </TableCell>
                    )}
                    {selectedColumns.includes('assetStatus') && (
                      <TableCell>{getStatusBadge(machine.assetStatus)}</TableCell>
                    )}
                    {selectedColumns.includes('actions') && (
                      <TableCell className="sticky right-0 bg-background">
                        <Link href={`/dashboard/machines/${machine.id}`}>
                          <Button variant="outline" size="sm">Modifier</Button>
                        </Link>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
