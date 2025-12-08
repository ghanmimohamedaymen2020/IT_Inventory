import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Package, Plus } from "lucide-react"
import { DeliveryNotesList } from "@/components/delivery-notes/delivery-notes-list"

export default function DeliveryNotesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bons de Livraison</h1>
          <p className="text-muted-foreground mt-1">
            Générez des bons de livraison PDF avec logo de société
          </p>
        </div>
        <Link href="/dashboard/delivery-notes/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Bon de Livraison
          </Button>
        </Link>
      </div>

      <DeliveryNotesList />
    </div>
  )
}
