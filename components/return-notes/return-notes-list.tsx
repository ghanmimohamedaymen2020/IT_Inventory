"use client"

import { useLayoutEffect, useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import ColumnSelector from "@/components/ui/column-selector"
import { FileText, User, Package } from "lucide-react"

type ReturnNote = {
  id: string
  noteNumber: string
  returnDate: string
  returnedBy: string
  destination: string
  reason: string | null
  createdAt: string
  createdBy: { firstName: string; lastName: string }
  equipments: Array<any>
  pdfPath?: string | null
}

interface ReturnNotesListProps {
  returnNotes: ReturnNote[]
  initialColumns?: string[]
}

export default function ReturnNotesList({ returnNotes, initialColumns }: ReturnNotesListProps) {
  const allColumns = ['noteNumber','returnDate','returnedBy','destination','equipments','reason','createdBy','actions']
  const columnLabels: Record<string,string> = {
    noteNumber: 'N° Bon',
    returnDate: 'Date',
    returnedBy: 'Retourné par',
    destination: 'Destination',
    equipments: 'Équipements',
    reason: 'Raison',
    createdBy: 'Créé par',
    actions: 'Actions'
  }

  const [selectedColumns, setSelectedColumns] = useState<string[]>(initialColumns && initialColumns.length > 0 ? initialColumns : allColumns)

  useLayoutEffect(() => {
    if (!initialColumns) {
      try {
        const raw = localStorage.getItem('return_notes_table_columns')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed) && parsed.length > 0) setSelectedColumns(parsed)
        }
      } catch (e) {}
    }
  }, [initialColumns])

  useEffect(() => {
    try { localStorage.setItem('return_notes_table_columns', JSON.stringify(selectedColumns)) } catch (e) {}
    try { const cookieValue = encodeURIComponent(JSON.stringify(selectedColumns)); document.cookie = `return_notes_table_columns=${cookieValue}; path=/; max-age=${60*60*24*365}` } catch (e) {}
  }, [selectedColumns])

  const getDestinationBadge = (destination: string) => {
    const variants: { [key: string]: { label: string; variant: any } } = {
      stock: { label: "Stock", variant: "default" },
      reparation: { label: "Réparation", variant: "secondary" },
      rebut: { label: "Rebut", variant: "destructive" },
    }
    const config = variants[destination] || { label: destination, variant: "outline" }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ColumnSelector allColumns={allColumns} columnLabels={columnLabels} selectedColumns={selectedColumns} onChange={setSelectedColumns} />
      </div>

      <Card>
        <CardContent>
          {returnNotes.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun bon de retour</h3>
              <p className="text-sm text-muted-foreground mb-4">Commencez par créer votre premier bon de retour</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {selectedColumns.includes('noteNumber') && <TableHead className="min-w-[140px]">N° Bon</TableHead>}
                      {selectedColumns.includes('returnDate') && <TableHead className="min-w-[110px]">Date</TableHead>}
                      {selectedColumns.includes('returnedBy') && <TableHead className="min-w-[150px]">Retourné par</TableHead>}
                      {selectedColumns.includes('destination') && <TableHead className="min-w-[120px]">Destination</TableHead>}
                      {selectedColumns.includes('equipments') && <TableHead className="min-w-[100px]">Équipements</TableHead>}
                      {selectedColumns.includes('reason') && <TableHead className="min-w-[150px]">Raison</TableHead>}
                      {selectedColumns.includes('createdBy') && <TableHead className="min-w-[150px]">Créé par</TableHead>}
                      {selectedColumns.includes('actions') && <TableHead className="min-w-[100px] sticky right-0 bg-background">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnNotes.map((note) => (
                      <TableRow key={note.id}>
                        {selectedColumns.includes('noteNumber') && <TableCell className="font-mono text-sm font-medium">{note.noteNumber}</TableCell>}
                        {selectedColumns.includes('returnDate') && <TableCell className="text-sm">{new Date(note.returnDate).toLocaleDateString("fr-FR")}</TableCell>}
                        {selectedColumns.includes('returnedBy') && <TableCell><div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{note.returnedBy}</span></div></TableCell>}
                        {selectedColumns.includes('destination') && <TableCell>{getDestinationBadge(note.destination)}</TableCell>}
                        {selectedColumns.includes('equipments') && <TableCell><Badge variant="outline">{note.equipments.length} équipement(s)</Badge></TableCell>}
                        {selectedColumns.includes('reason') && <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{note.reason || "-"}</TableCell>}
                        {selectedColumns.includes('createdBy') && <TableCell><div className="text-sm"><div className="font-medium">{note.createdBy.firstName} {note.createdBy.lastName}</div><div className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleDateString("fr-FR")}</div></div></TableCell>}
                        {selectedColumns.includes('actions') && <TableCell className="sticky right-0 bg-background"><Link href={`/dashboard/return-notes/${note.id}`}><Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4"/>Détails</Button></Link></TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
