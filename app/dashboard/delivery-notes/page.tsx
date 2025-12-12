import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Package, Plus } from "lucide-react"
import { DeliveryNotesList } from "@/components/delivery-notes/delivery-notes-list"
import { cookies } from 'next/headers'

export default function DeliveryNotesPage() {
  const cookieStore = cookies()
  const raw = cookieStore.get('delivery_notes_table_columns')
  let initialColumns: string[] | undefined = undefined
  if (raw?.value) {
    try {
      const parsed = JSON.parse(decodeURIComponent(raw.value))
      if (Array.isArray(parsed)) initialColumns = parsed
    } catch (e) {}
  }

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

      <DeliveryNotesList initialColumns={initialColumns} />
    </div>
  )
}
