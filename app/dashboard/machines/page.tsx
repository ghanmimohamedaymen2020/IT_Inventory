import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { ExportMenu } from "@/components/exports/export-menu"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { MachinesFilter } from "@/components/machines/machines-filter"

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

  // Lire la préférence de colonnes depuis le cookie si présent, pour que
  // le rendu serveur corresponde à la préférence de l'utilisateur.
  const cookieStore = await cookies()
  const colsCookie = cookieStore.get('machines_table_columns')
  let initialColumns: string[] | undefined = undefined
  if (colsCookie?.value) {
    try {
      const parsed = JSON.parse(decodeURIComponent(colsCookie.value))
      if (Array.isArray(parsed)) initialColumns = parsed
    } catch (e) {
      // ignore parse errors
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

      <MachinesFilter machines={machines} initialColumns={initialColumns} />
    </div>
  )
}
