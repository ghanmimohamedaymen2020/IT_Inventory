import { ScreensList } from "@/components/screens/screens-list"

export default function ScreensPage() {
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
      <ScreensList />
    </div>
  )
}
