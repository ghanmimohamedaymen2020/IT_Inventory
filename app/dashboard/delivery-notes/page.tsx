import { Card, CardContent } from "@/components/ui/card"
import { Package } from "lucide-react"

export default function DeliveryNotesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bons de Livraison</h1>
        <p className="text-muted-foreground mt-1">
          Gestion des réceptions et équipements
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            Module à implémenter
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
