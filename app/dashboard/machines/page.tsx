import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus, Search, Laptop as LaptopIcon } from "lucide-react"
import { ExportMenu } from "@/components/exports/export-menu"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"

async function getDevSession() {
  const cookieStore = await cookies()
  const devSession = cookieStore.get('dev-session')
  
  if (!devSession) return null
  
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "secret")
    const { payload } = await jwtVerify(devSession.value, secret)
    return {
      user: {
        id: payload.sub as string,
        email: payload.email as string,
        role: payload.role as string,
        companyId: payload.companyId as string,
      }
    }
  } catch (error) {
    return null
  }
}

export default async function MachinesPage() {
  const session = await getDevSession()
  
  if (!session) {
    return <div>Non autorisé</div>
  }

  // Récupérer les machines depuis PostgreSQL
  const machines = await prisma.machine.findMany({
    include: {
      company: true,
      user: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  type MachineWithRelations = typeof machines[number]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'en_service':
        return <Badge className="bg-green-500">En service</Badge>
      case 'maintenance':
        return <Badge className="bg-orange-500">Maintenance</Badge>
      case 'en_stock':
        return <Badge variant="secondary">En stock</Badge>
      case 'retiré':
        return <Badge variant="destructive">Retiré</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Machines</h1>
          <p className="text-muted-foreground mt-1">
            Gestion du parc informatique
          </p>
        </div>
        <div className="flex gap-2">
          <ExportMenu 
            data={machines} 
            filename="machines" 
            type="machines"
          />
          <Link href="/dashboard/machines/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle machine
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtres et recherche</CardTitle>
          <CardDescription>
            Rechercher par code inventaire, numéro de série, nom, etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Rechercher..."
                className="pl-8 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
            <Button variant="outline">
              Filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      {machines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Aucune machine</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
              Commencez par ajouter votre première machine ou importez-les depuis un bon de livraison.
            </p>
            <div className="flex gap-2">
              <Link href="/dashboard/machines/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une machine
                </Button>
              </Link>
              <Link href="/dashboard/delivery-notes">
                <Button variant="outline">
                  Voir les bons de livraison
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {machines.map((machine: MachineWithRelations) => (
            <Card key={machine.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">
                      {machine.inventoryCode}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {machine.machineName || "Sans nom"}
                    </p>
                  </div>
                  {getStatusBadge(machine.assetStatus)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium capitalize">{machine.machineType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Marque:</span>
                    <span className="font-medium">{machine.vendor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modèle:</span>
                    <span className="font-medium">{machine.model || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">N° Série:</span>
                    <span className="font-medium text-xs">{machine.serialNumber || "-"}</span>
                  </div>
                  {machine.user && (
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground">Affecté à:</span>
                      <span className="font-medium">{machine.user.name}</span>
                    </div>
                  )}
                  {machine.location && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Localisation:</span>
                      <span className="font-medium">{machine.location}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Link href={`/dashboard/machines/${machine.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Modifier
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm">
                    <span className="sr-only">Plus d&apos;options</span>
                    ...
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
