"use client"

import { useEffect, useState, useLayoutEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Download, Eye, Package } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import ColumnSelector from "@/components/ui/column-selector"

interface DeliveryNote {
  id: string
  noteNumber: string
  createdAt: string
  pdfPath: string
  notes?: string
  createdBy: {
    firstName: string
    lastName: string
    email: string
  }
  equipments: Array<{
    id: string
    type: string
    serialNumber: string
    brand: string
    model: string
    inventoryCode: string
  }>
}

interface DeliveryNotesListProps {
  initialColumns?: string[]
}

export function DeliveryNotesList({ initialColumns }: DeliveryNotesListProps) {
  const router = useRouter()
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const allColumns = ['noteNumber','createdAt','createdBy','equipments','details','actions']
  const columnLabels: Record<string,string> = {
    noteNumber: 'N° Bon',
    createdAt: 'Date',
    createdBy: 'Utilisateur',
    equipments: 'Équipements',
    details: 'Détails',
    actions: 'Actions'
  }

  const [selectedColumns, setSelectedColumns] = useState<string[]>(initialColumns && initialColumns.length > 0 ? initialColumns : allColumns)

  useLayoutEffect(() => {
    if (!initialColumns) {
      try {
        const raw = localStorage.getItem('delivery_notes_table_columns')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed) && parsed.length > 0) setSelectedColumns(parsed)
        }
      } catch (e) {}
    }
  }, [initialColumns])

  useEffect(() => {
    try { localStorage.setItem('delivery_notes_table_columns', JSON.stringify(selectedColumns)) } catch (e) {}
    try { const cookieValue = encodeURIComponent(JSON.stringify(selectedColumns)); document.cookie = `delivery_notes_table_columns=${cookieValue}; path=/; max-age=${60*60*24*365}` } catch (e) {}
  }, [selectedColumns])

  useEffect(() => {
    fetchDeliveryNotes()
  }, [])

  const fetchDeliveryNotes = async () => {
    try {
      const response = await fetch("/api/delivery-notes")
      if (response.ok) {
        const data = await response.json()
        setDeliveryNotes(data)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des bons de livraison:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  if (deliveryNotes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            Aucun bon de livraison généré pour le moment
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div />
        <div>
          <ColumnSelector allColumns={allColumns} columnLabels={columnLabels} selectedColumns={selectedColumns} onChange={setSelectedColumns} />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {selectedColumns.includes('noteNumber') && <TableHead className="w-[150px]">N° Bon</TableHead>}
              {selectedColumns.includes('createdAt') && <TableHead className="w-[150px]">Date</TableHead>}
              {selectedColumns.includes('createdBy') && <TableHead className="w-[250px]">Utilisateur</TableHead>}
              {selectedColumns.includes('equipments') && <TableHead className="w-[100px]">Équipements</TableHead>}
              {selectedColumns.includes('details') && <TableHead>Détails</TableHead>}
              {selectedColumns.includes('actions') && <TableHead className="w-[150px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveryNotes.map((note) => (
              <TableRow key={note.id}>
                {selectedColumns.includes('noteNumber') && (
                  <TableCell className="font-mono text-sm font-medium">{note.noteNumber}</TableCell>
                )}
                {selectedColumns.includes('createdAt') && (
                  <TableCell className="text-sm">{new Date(note.createdAt).toLocaleDateString('fr-FR', {day: '2-digit',month: '2-digit',year: 'numeric',hour: '2-digit',minute: '2-digit'})}</TableCell>
                )}
                {selectedColumns.includes('createdBy') && (
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{note.createdBy.firstName} {note.createdBy.lastName}</div>
                      <div className="text-muted-foreground text-xs">{note.createdBy.email}</div>
                    </div>
                  </TableCell>
                )}
                {selectedColumns.includes('equipments') && (
                  <TableCell><Badge variant="secondary">{note.equipments.length} équip.</Badge></TableCell>
                )}
                {selectedColumns.includes('details') && (
                  <TableCell className="text-sm"><div className="space-y-1">{note.equipments.map((eq) => (<div key={eq.id} className="text-xs"><span className="font-medium">{eq.type}</span>{eq.brand && ` - ${eq.brand}`}{eq.model && ` ${eq.model}`}</div>))}</div></TableCell>
                )}
                {selectedColumns.includes('actions') && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => window.open(note.pdfPath, '_blank')}><Download className="h-4 w-4 mr-1"/>PDF</Button>
                      <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/delivery-notes/${note.id}`)}><Eye className="h-4 w-4 mr-1"/>Détails</Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
