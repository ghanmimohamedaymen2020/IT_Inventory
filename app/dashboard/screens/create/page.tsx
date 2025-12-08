import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { ScreenCreateForm } from "@/components/screens/screen-create-form"

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

export default async function ScreenCreatePage() {
  const session = await getDevSession()
  
  if (!session) {
    redirect("/auth/login")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nouvel Écran</h1>
        <p className="text-muted-foreground mt-1">
          Ajouter un nouvel écran au parc informatique
        </p>
      </div>

      <ScreenCreateForm />
    </div>
  )
}
