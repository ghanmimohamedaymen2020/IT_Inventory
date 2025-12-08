import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Users as UsersIcon, Plus, Edit } from "lucide-react"
import { ExportMenu } from "@/components/exports/export-menu"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { prisma } from "@/lib/db"
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

export default async function UsersPage() {
  const session = await getDevSession()
  
  if (!session) {
    return <div>Non autorisé</div>
  }

  // Récupérer les utilisateurs depuis PostgreSQL
  const users = await prisma.user.findMany({
    include: {
      company: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge variant="destructive">Super Admin</Badge>
      case 'company_admin':
        return <Badge>Admin</Badge>
      case 'viewer':
        return <Badge variant="secondary">Viewer</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Utilisateurs</h1>
          <p className="text-muted-foreground mt-1">
            Gestion des utilisateurs et assignations
          </p>
        </div>
        <div className="flex gap-2">
          <ExportMenu 
            data={users} 
            filename="utilisateurs" 
            type="users"
          />
          <Link href="/dashboard/users/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvel utilisateur
            </Button>
          </Link>
        </div>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-3 mb-4">
              <UsersIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Aucun utilisateur</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
              Ajoutez des utilisateurs pour pouvoir leur assigner des machines et gérer les licences.
            </p>
            <Link href="/dashboard/users/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un utilisateur
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Société</TableHead>
                <TableHead>Département</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell className="text-sm">
                    {user.phone || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{user.company.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {user.company.code}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {user.department || '-'}
                  </TableCell>
                  <TableCell>
                    {getRoleBadge(user.role)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/users/${user.id}`}>
                      <Button variant="outline" size="sm">
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
