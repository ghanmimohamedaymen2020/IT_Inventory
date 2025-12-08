"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { History, User, Calendar, FileText, Package, PackageOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface HistoryItem {
  id: string
  type: string
  serialNumber: string
  brand: string
  model: string
  inventoryCode: string
  createdAt: Date
  noteType: 'delivery' | 'return'
  note: {
    id: string
    noteNumber: string
    pdfPath: string | null
    createdBy: {
      firstName: string
      lastName: string
      email: string
    }
  }
  noteDate: Date
}

interface EquipmentHistoryProps {
  history: HistoryItem[]
  equipmentType: string
  equipmentName: string
}

export function EquipmentHistory({ history, equipmentType, equipmentName }: EquipmentHistoryProps) {
  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <CardTitle>Historique des mouvements</CardTitle>
          </div>
          <CardDescription>
            Suivi des assignations et mouvements de {equipmentName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <History className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Aucun historique disponible pour cet équipement
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <CardTitle>Historique des mouvements</CardTitle>
        </div>
        <CardDescription>
          {history.length} mouvement{history.length > 1 ? 's' : ''} enregistré{history.length > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((item, index) => {
            const isDelivery = item.noteType === 'delivery'
            const noteUrl = isDelivery 
              ? `/dashboard/delivery-notes/${item.note.id}`
              : `/dashboard/return-notes/${item.note.id}`
            
            return (
              <div
                key={item.id}
                className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="mt-1">
                  {isDelivery ? (
                    <Package className="h-5 w-5 text-green-500" />
                  ) : (
                    <PackageOpen className="h-5 w-5 text-orange-500" />
                  )}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className="font-mono"
                    >
                      {item.note.noteNumber}
                    </Badge>
                    <Badge variant={isDelivery ? "default" : "secondary"}>
                      {isDelivery ? "Livraison" : "Retour"}
                    </Badge>
                    {index === 0 && (
                      <Badge className="bg-green-500">Actuel</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span className="font-medium text-foreground">
                      {item.note.createdBy.firstName} {item.note.createdBy.lastName}
                    </span>
                    <span>•</span>
                    <span>{item.note.createdBy.email}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(item.noteDate).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {item.brand} {item.model}
                    </span>
                    {item.inventoryCode && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">
                          {item.inventoryCode}
                        </code>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {item.note.pdfPath && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href={item.note.pdfPath} target="_blank" rel="noopener noreferrer">
                        PDF
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <Link href={noteUrl}>
                      Détails
                    </Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
