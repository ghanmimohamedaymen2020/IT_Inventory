"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Calendar, User, Package } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface ReturnNote {
  id: string
  noteNumber: string
  returnDate: string
  returnedBy: string
  reason: string | null
  destination: string
  notes: string | null
  pdfPath: string | null
  createdAt: string
  createdBy: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  equipments: Array<{
    id: string
    type: string
    serialNumber: string
    brand: string | null
    model: string | null
    inventoryCode: string | null
    previousUser: string | null
    condition: string | null
  }>
}

export default function ReturnNotesPage() {
  const router = useRouter()
  const [returnNotes, setReturnNotes] = useState<ReturnNote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReturnNotes()
  }, [])

  const fetchReturnNotes = async () => {
    try {
      const response = await fetch("/api/return-notes")
      if (!response.ok) throw new Error("Failed to fetch")
      const data = await response.json()
      setReturnNotes(data.returnNotes)
    } catch (error) {
      console.error("Error fetching return notes:", error)
    } finally {
      setLoading(false)
    }
  }

  const getDestinationBadge = (destination: string) => {
    const variants: { [key: string]: { label: string; variant: any } } = {
      stock: { label: "Stock", variant: "default" },
      reparation: { label: "Réparation", variant: "secondary" },
      rebut: { label: "Rebut", variant: "destructive" },
    }

    const config = variants[destination] || { label: destination, variant: "outline" }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-lg">Chargement...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bons de retour</h1>
          <p className="text-muted-foreground">
            Gérer les retours d'équipements au stock ou en réparation
          </p>
        </div>
        <Link href="/dashboard/return-notes/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau bon de retour
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des bons de retour</CardTitle>
          <CardDescription>
            {returnNotes.length} bon(s) de retour au total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {returnNotes.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun bon de retour</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Commencez par créer votre premier bon de retour
              </p>
              <Link href="/dashboard/return-notes/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un bon de retour
                </Button>
              </Link>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">N° Bon</TableHead>
                      <TableHead className="min-w-[110px]">Date</TableHead>
                      <TableHead className="min-w-[150px]">Retourné par</TableHead>
                      <TableHead className="min-w-[120px]">Destination</TableHead>
                      <TableHead className="min-w-[100px]">Équipements</TableHead>
                      <TableHead className="min-w-[150px]">Raison</TableHead>
                      <TableHead className="min-w-[150px]">Créé par</TableHead>
                      <TableHead className="min-w-[100px] sticky right-0 bg-background">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnNotes.map((note) => (
                      <TableRow key={note.id}>
                        <TableCell className="font-mono text-sm font-medium">
                          {note.noteNumber}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(note.returnDate).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{note.returnedBy}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getDestinationBadge(note.destination)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {note.equipments.length} équipement(s)
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {note.reason || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">
                              {note.createdBy.firstName} {note.createdBy.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(note.createdAt).toLocaleDateString("fr-FR")}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="sticky right-0 bg-background">
                          <Link href={`/dashboard/return-notes/${note.id}`}>
                            <Button variant="outline" size="sm">
                              <FileText className="mr-2 h-4 w-4" />
                              Détails
                            </Button>
                          </Link>
                        </TableCell>
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
