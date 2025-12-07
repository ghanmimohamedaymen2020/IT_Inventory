import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserEditForm } from "@/components/users/user-edit-form"
import { prisma } from "@/lib/db"

interface PageProps {
  params: {
    id: string
  }
}

export default async function UserEditPage({ params }: PageProps) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { 
      company: true,
      userEmails: true,
    }
  })

  if (!user) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Modifier l'utilisateur</h1>
        <p className="text-muted-foreground mt-1">
          Mettre à jour les informations de {user.firstName} {user.lastName}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations utilisateur</CardTitle>
          <CardDescription>
            Modifiez les informations de l'utilisateur. Les champs avec * sont obligatoires.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserEditForm user={user} />
        </CardContent>
      </Card>
    </div>
  )
}
