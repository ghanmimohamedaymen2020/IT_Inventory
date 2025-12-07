import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserForm } from "@/components/users/user-form"
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
        name: payload.email as string,
        role: payload.role as string,
        companyId: payload.companyId as string,
        company: payload.company as any,
      }
    }
  } catch (error) {
    return null
  }
}

export default async function CreateUserPage() {
  // Essayer d'abord la session de développement
  let session = await getDevSession()
  
  // Sinon, essayer NextAuth
  if (!session) {
    session = await auth()
  }
  
  if (!session?.user) {
    redirect("/auth/login")
  }

  // Vérifier les permissions
  if (session.user.role !== "super_admin" && session.user.role !== "company_admin") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nouvel Utilisateur</h1>
        <p className="text-muted-foreground">
          Créer un nouveau compte utilisateur
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations utilisateur</CardTitle>
          <CardDescription>
            Remplissez les informations de l'utilisateur. Les champs avec * sont obligatoires.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm />
        </CardContent>
      </Card>
    </div>
  )
}
