"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Download, Calendar, User, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DeliveryNoteDetailProps {
  noteId: string
}

interface Equipment {
  id: string
  type: string
  serialNumber: string
  brand: string
  model: string
  inventoryCode: string
}

interface DeliveryNoteData {
  id: string
  noteNumber: string
  createdAt: string
  deliveryDate: string
  pdfPath: string
  notes: string
  createdBy: {
    firstName: string
    lastName: string
    email: string
  }
  equipments: Equipment[]
}

export function DeliveryNoteDetail({ noteId }: DeliveryNoteDetailProps) {
  const router = useRouter()
  const [deliveryNote, setDeliveryNote] = useState<DeliveryNoteData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDeliveryNote()
  }, [noteId])

  const fetchDeliveryNote = async () => {
    try {
      const response = await fetch(`/api/delivery-notes/${noteId}`)
      if (response.ok) {
        const data = await response.json()
        setDeliveryNote(data)
      }
    } catch (error) {
      console.error("Erreur lors du chargement du bon de livraison:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  if (!deliveryNote) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Bon de livraison introuvable</p>
        <Button onClick={() => router.push("/dashboard/delivery-notes")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/dashboard/delivery-notes")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Button onClick={() => window.open(deliveryNote.pdfPath, '_blank')}>
          <Download className="h-4 w-4 mr-2" />
          Télécharger le PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-mono">{deliveryNote.noteNumber}</CardTitle>
              <CardDescription>Bon de livraison d'équipement</CardDescription>
            </div>
            <Badge variant="secondary" className="text-base px-4 py-2">
              {deliveryNote.equipments.length} équipements
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Bénéficiaire</p>
                  <p className="font-medium">
                    {deliveryNote.createdBy.firstName} {deliveryNote.createdBy.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{deliveryNote.createdBy.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Date de livraison</p>
                  <p className="font-medium">
                    {new Date(deliveryNote.deliveryDate).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {deliveryNote.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Notes</p>
              <p className="text-sm bg-muted p-3 rounded-md">{deliveryNote.notes}</p>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Équipements livrés</h3>
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Numéro de série</TableHead>
                    <TableHead>Marque</TableHead>
                    <TableHead>Modèle</TableHead>
                    <TableHead>Code inventaire</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryNote.equipments.map((equipment) => (
                    <TableRow key={equipment.id}>
                      <TableCell>
                        <Badge variant="outline">{equipment.type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{equipment.serialNumber}</TableCell>
                      <TableCell>{equipment.brand || '-'}</TableCell>
                      <TableCell>{equipment.model || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {equipment.inventoryCode || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
