import { ScreensList } from "@/components/screens/screens-list"
import { cookies } from 'next/headers'

export default function ScreensPage() {
  // Read persisted columns cookie so server-render matches user's preference
  const cookieStore = cookies()
  const raw = cookieStore.get('screens_table_columns')
  let initialColumns: string[] | undefined = undefined
  if (raw?.value) {
    try {
      const parsed = JSON.parse(decodeURIComponent(raw.value))
      if (Array.isArray(parsed)) initialColumns = parsed
    } catch (e) {}
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Écrans</h1>
          <p className="text-muted-foreground mt-2">
            Gestion des écrans et moniteurs
          </p>
        </div>
      </div>
      <ScreensList initialColumns={initialColumns} />
    </div>
  )
}
