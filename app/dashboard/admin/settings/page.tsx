import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SettingsForm } from "@/components/admin/settings-form"
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

export default async function SettingsPage() {
  const session = await getDevSession()
  
  if (!session?.user || session.user.role !== 'super_admin') {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres système</h1>
        <p className="text-muted-foreground mt-1">
          Gérer les listes de sociétés et bureaux (Super Admin uniquement)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listes personnalisées</CardTitle>
          <CardDescription>
            Ajoutez, modifiez ou supprimez les sociétés et bureaux disponibles dans les formulaires
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm />
        </CardContent>
      </Card>
    </div>
  )
}
