import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus } from "lucide-react"
import { ExportMenu } from "@/components/exports/export-menu"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code Inventaire</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Marque</TableHead>
              <TableHead>Modèle</TableHead>
              <TableHead>N° Série</TableHead>
              <TableHead>Date d'Achat</TableHead>
              <TableHead>Garantie</TableHead>
              <TableHead>Utilisateur Assigné</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {machines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                  Aucune machine trouvée
                </TableCell>
              </TableRow>
            ) : (
              machines.map((machine: MachineWithRelations) => (
                <TableRow key={machine.id}>
                  <TableCell className="font-mono text-sm">
                    {machine.inventoryCode}
                  </TableCell>
                  <TableCell className="font-medium">
                    {machine.machineName || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{machine.type}</Badge>
                  </TableCell>
                  <TableCell>{machine.vendor}</TableCell>
                  <TableCell>{machine.model || "-"}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {machine.serialNumber}
                  </TableCell>
                  <TableCell className="text-sm">
                    {machine.acquisitionDate 
                      ? new Date(machine.acquisitionDate).toLocaleDateString('fr-FR')
                      : "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {machine.warrantyDate 
                      ? new Date(machine.warrantyDate).toLocaleDateString('fr-FR')
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {machine.user ? (
                      <div className="text-sm">
                        <div className="font-medium">
                          {machine.user.firstName} {machine.user.lastName}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {machine.user.email}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Non assigné
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(machine.assetStatus)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/machines/${machine.id}`}>
                      <Button variant="outline" size="sm">
                        Modifier
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
