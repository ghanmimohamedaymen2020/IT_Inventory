"use client"

import { useEffect, useState } from "react"
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

export function DeliveryNotesList() {
  const router = useRouter()
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">N° Bon</TableHead>
              <TableHead className="w-[150px]">Date</TableHead>
              <TableHead className="w-[250px]">Utilisateur</TableHead>
              <TableHead className="w-[100px]">Équipements</TableHead>
              <TableHead>Détails</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveryNotes.map((note) => (
              <TableRow key={note.id}>
                <TableCell className="font-mono text-sm font-medium">
                  {note.noteNumber}
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(note.createdAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">
                        {note.createdBy.firstName} {note.createdBy.lastName}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {note.createdBy.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {note.equipments.length} équip.
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="space-y-1">
                      {note.equipments.map((eq) => (
                        <div key={eq.id} className="text-xs">
                          <span className="font-medium">{eq.type}</span>
                          {eq.brand && ` - ${eq.brand}`}
                          {eq.model && ` ${eq.model}`}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(note.pdfPath, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/delivery-notes/${note.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Détails
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
