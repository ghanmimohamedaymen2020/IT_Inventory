"use client"

import { useState, useMemo } from "react"
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
      </div>

      {/* Tableau */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code Inventaire</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Marque</TableHead>
                <TableHead>Modèle</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>N° Série</TableHead>
                <TableHead>Société</TableHead>
                <TableHead>Date d'Achat</TableHead>
                <TableHead>Garantie</TableHead>
                <TableHead>Utilisateur Assigné</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="sticky right-0 bg-background">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMachines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                    Aucune machine trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredMachines.map((machine) => (
                  <TableRow key={machine.id}>
                    <TableCell className="font-mono text-sm">
                      {machine.inventoryCode}
                    </TableCell>
                    <TableCell className="font-medium">
                      {machine.machineName || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{machine.type}</Badge>
                    </TableCell>
                    <TableCell>{machine.vendor}</TableCell>
                    <TableCell>{machine.model || "-"}</TableCell>
                    <TableCell className="text-sm">
                      {machine.windowsVersion || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {machine.serialNumber}
                    </TableCell>
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
                    <TableCell className="text-sm">
                      {machine.acquisitionDate 
                        ? new Date(machine.acquisitionDate).toLocaleDateString('fr-FR')
                        : "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {machine.warrantyDate 
                        ? new Date(machine.warrantyDate).toLocaleDateString('fr-FR')
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {machine.user ? (
                        <div className="text-sm">
                          <div className="font-medium">
                            {machine.user.firstName} {machine.user.lastName}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {machine.user.email}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Non assigné
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(machine.assetStatus)}
                    </TableCell>
                    <TableCell className="sticky right-0 bg-background">
                      <Link href={`/dashboard/machines/${machine.id}`}>
                        <Button variant="outline" size="sm">
                          Modifier
                        </Button>
                      </Link>
                    </TableCell>
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
