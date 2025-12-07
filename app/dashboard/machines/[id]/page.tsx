import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { MachineEditForm } from "@/components/machines/machine-edit-form"
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

export default async function MachineEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getDevSession()
  
  if (!session) {
    redirect("/auth/login")
  }

  const { id } = await params
  
  const machine = await prisma.machine.findUnique({
    where: { id },
    include: {
      company: true,
      user: true,
    }
  })

  if (!machine) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Modifier la Machine</h1>
        <p className="text-muted-foreground mt-1">
          {machine.inventoryCode} - {machine.machineName || "Sans nom"}
        </p>
      </div>

      <MachineEditForm machine={machine} />
    </div>
  )
}
