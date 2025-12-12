import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { cookies } from 'next/headers'
import ReturnNotesList from "@/components/return-notes/return-notes-list"
import { notFound } from 'next/navigation'
import { prisma } from "@/lib/db"
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

export default async function ReturnNotesPage() {
  // Server-side: query return notes directly from the database
  const returnNotes = await prisma.returnNote.findMany({
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      equipments: true,
    },
    orderBy: { createdAt: 'desc' }
  })

  const cookieStore = cookies()
  const raw = cookieStore.get('return_notes_table_columns')
  let initialColumns: string[] | undefined = undefined
  if (raw?.value) {
    try {
      const parsed = JSON.parse(decodeURIComponent(raw.value))
      if (Array.isArray(parsed)) initialColumns = parsed
    } catch (e) {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bons de retour</h1>
          <p className="text-muted-foreground">Gérer les retours d'équipements au stock ou en réparation</p>
        </div>
        <Link href="/dashboard/return-notes/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau bon de retour
          </Button>
        </Link>
      </div>

      <ReturnNotesList returnNotes={returnNotes} initialColumns={initialColumns} />
    </div>
  )
}
