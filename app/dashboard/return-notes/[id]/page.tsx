"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FileText, Download } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface ReturnNoteEquipment {
  id: string
  type: string
  serialNumber: string
  brand: string | null
  model: string | null
  inventoryCode: string | null
  previousUser: string | null
  condition: string | null
}

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
  equipments: ReturnNoteEquipment[]
}

export default function ReturnNoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [returnNote, setReturnNote] = useState<ReturnNote | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReturnNote()
  }, [params.id])

  const fetchReturnNote = async () => {
    try {
      const response = await fetch(`/api/return-notes/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setReturnNote(data.returnNote)
      }
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8">Chargement...</div>
  }

  if (!returnNote) {
    return <div className="p-8">Bon de retour non trouvé</div>
  }

  const destinationLabels: Record<string, string> = {
    stock: "Stock",
    reparation: "Réparation",
    rebut: "Rebut"
  }

  const destinationVariants: Record<string, "default" | "secondary" | "destructive"> = {
    stock: "default",
    reparation: "secondary",
    rebut: "destructive"
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/return-notes")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{returnNote.noteNumber}</h1>
              <p className="text-sm text-muted-foreground">
                Créé le {format(new Date(returnNote.createdAt), "PPP 'à' HH:mm", { locale: fr })}
              </p>
            </div>
          </div>
          {returnNote.pdfPath && (
            <Button onClick={() => window.open(returnNote.pdfPath!, "_blank")}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger PDF
            </Button>
          )}
        </div>

        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date de retour</p>
                <p className="text-base">
                  {format(new Date(returnNote.returnDate), "PPP", { locale: fr })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Retourné par</p>
                <p className="text-base">{returnNote.returnedBy}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Destination</p>
                <Badge variant={destinationVariants[returnNote.destination]}>
                  {destinationLabels[returnNote.destination]}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Créé par</p>
                <p className="text-base">
                  {returnNote.createdBy.firstName} {returnNote.createdBy.lastName}
                </p>
              </div>
            </div>
            {returnNote.reason && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Raison</p>
                <p className="text-base">{returnNote.reason}</p>
              </div>
            )}
            {returnNote.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="text-base whitespace-pre-wrap">{returnNote.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Équipements */}
        <Card>
          <CardHeader>
            <CardTitle>Équipements retournés ({returnNote.equipments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {returnNote.equipments.map((equipment) => (
                <div
                  key={equipment.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {(() => {
                          const t = equipment.type || ''
                          const lt = t.toString().toLowerCase()
                          switch (lt) {
                            case 'laptop': return 'Portable'
                            case 'desktop': return 'Bureau'
                            case 'server': return 'Serveur'
                            case 'workstation': return 'Station de travail'
                            case 'machine': return 'Machine'
                            case 'screen': return 'Écran'
                            case 'écran': return 'Écran'
                            default: return t.charAt(0).toUpperCase() + t.slice(1)
                          }
                        })()}
                      </Badge>
                      <span className="font-medium">{equipment.serialNumber}</span>
                    </div>
                    {equipment.condition && (
                      <Badge variant="secondary">{equipment.condition}</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {equipment.brand && (
                      <div>
                        <span className="text-muted-foreground">Marque: </span>
                        {equipment.brand}
                      </div>
                    )}
                    {equipment.model && (
                      <div>
                        <span className="text-muted-foreground">Modèle: </span>
                        {equipment.model}
                      </div>
                    )}
                    {equipment.inventoryCode && (
                      <div>
                        <span className="text-muted-foreground">Code inventaire: </span>
                        {equipment.inventoryCode}
                      </div>
                    )}
                    {equipment.previousUser && (
                      <div>
                        <span className="text-muted-foreground">Utilisateur précédent: </span>
                        {equipment.previousUser}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
