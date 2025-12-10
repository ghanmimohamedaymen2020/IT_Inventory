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
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-1">Modifier l'utilisateur</h1>
        <p className="text-xl font-medium text-gray-700 mb-2">
          Mettre à jour les informations de {user.firstName} {user.lastName}
        </p>
      </div>

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900">Informations utilisateur</CardTitle>
          <CardDescription className="text-base text-gray-700">
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
