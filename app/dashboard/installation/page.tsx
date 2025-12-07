import { Card, CardContent } from "@/components/ui/card"
import { ClipboardList } from "lucide-react"

export default function InstallationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fiches d'Installation</h1>
        <p className="text-muted-foreground mt-1">
          Suivi des déploiements et configurations
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            Module à implémenter
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
