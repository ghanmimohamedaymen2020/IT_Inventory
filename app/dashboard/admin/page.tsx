import { Card, CardContent } from "@/components/ui/card"
import { Settings } from "lucide-react"

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Administration</h1>
        <p className="text-muted-foreground mt-1">
          Gestion des compagnies, utilisateurs et rôles
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Settings className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            Module à implémenter
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
