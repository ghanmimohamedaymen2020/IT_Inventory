import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Laptop, Users, Package, Settings } from "lucide-react"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { DashboardStats } from "@/components/reports/dashboard-stats"
import { prisma } from '@/lib/db'

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

export default async function DashboardPage() {
  // Essayer d'abord la session de développement
  let session = await getDevSession()
  
  // Sinon, essayer NextAuth
  if (!session) {
    const authSession = await auth()
    if (authSession?.user) {
      session = {
        user: {
          id: authSession.user.id || '',
          email: authSession.user.email || '',
          name: authSession.user.name || '',
          role: (authSession.user as any).role || 'viewer',
          companyId: (authSession.user as any).companyId || '',
          company: (authSession.user as any).company || null
        }
      }
    }
  }
  
  if (!session?.user) {
    redirect("/auth/login")
  }

  // Récupérer des stats réelles depuis la base
  const companyFilter: any = {}
  if (session.user.role !== 'super_admin' && session.user.companyId) {
    companyFilter.companyId = session.user.companyId
  }

  const [totalMachines, activeMachines, totalUsers, pendingDeliveries] = await Promise.all([
    prisma.machine.count({ where: companyFilter }),
    prisma.machine.count({ where: { ...companyFilter, assetStatus: 'en_service' } }),
    prisma.user.count({ where: session.user.role === 'super_admin' ? {} : { companyId: session.user.companyId } }),
    prisma.deliveryNote.count({ where: session.user.role === 'super_admin' ? { status: 'pending' } : { ...companyFilter, status: 'pending' } }),
  ])

  const stats = {
    totalMachines,
    activeMachines,
    totalUsers,
    pendingDeliveries,
  }

  // Fetch lists for visualizations
  const machinesRaw = await prisma.machine.findMany({
    where: companyFilter,
    select: { type: true, assetStatus: true }
  })

  // Map DB fields to the shape the DashboardStats component expects
  const machines = machinesRaw.map(m => ({
    type: m.type,
    status: m.assetStatus === 'en_service' ? 'active' : (m.assetStatus === 'maintenance' ? 'maintenance' : (m.assetStatus === 'retiré' || m.assetStatus === 'retire' ? 'retired' : 'stock'))
  }))

  const usersList = await prisma.user.findMany({ where: session.user.role === 'super_admin' ? {} : { companyId: session.user.companyId }, select: { id: true } })

  // Delivery notes for last 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  const deliveryNotes = await prisma.deliveryNote.findMany({
    where: {
      ...(session.user.role === 'super_admin' ? {} : { companyId: session.user.companyId }),
      deliveryDate: { gte: sixMonthsAgo }
    },
    select: { deliveryDate: true }
  })

  // Low-stock consumables for notification banner
  const consumableWhere: any = {}
  if (session.user.role !== 'super_admin' && session.user.companyId) consumableWhere.companyId = session.user.companyId
  // fetch consumables that have a minimumStock defined, then filter by quantity <= minimumStock
  const lowRaw = await prisma.consumable.findMany({ where: consumableWhere, include: { type: true } })
  const lowConsumables = lowRaw.filter(c => c.minimumStock !== null && c.quantity <= (c.minimumStock as number))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-1">Tableau de bord</h1>
          <p className="text-xl font-medium text-gray-700 mb-2">
            Bienvenue, {session.user.name || session.user.email}
          </p>
        </div>
        <Badge variant="outline" className="text-base font-semibold">
          {session.user.role === 'super_admin' && 'Super Administrateur'}
          {session.user.role === 'company_admin' && 'Administrateur'}
          {session.user.role === 'viewer' && 'Lecteur'}
        </Badge>
      </div>

      {session.user.company && (
        <Card className="bg-white shadow-sm border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">Compagnie</CardTitle>
            <CardDescription className="text-base text-gray-700 font-semibold">
              {session.user.company.name} ({session.user.company.code})
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Machines
            </CardTitle>
            <Laptop className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMachines}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeMachines} en service
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Utilisateurs
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Total des utilisateurs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Bons de livraison
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              En attente de réception
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Configuration
            </CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Projet initialisé avec succès
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prochaines étapes</CardTitle>
          <CardDescription>
            Configuration et mise en route du système
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-start space-x-2">
            <Badge variant="outline">1</Badge>
            <p className="text-sm">Configurer la connexion à PostgreSQL dans le fichier .env</p>
          </div>
          <div className="flex items-start space-x-2">
            <Badge variant="outline">2</Badge>
            <p className="text-sm">Configurer Google OAuth (CLIENT_ID et CLIENT_SECRET)</p>
          </div>
          <div className="flex items-start space-x-2">
            <Badge variant="outline">3</Badge>
            <p className="text-sm">Pousser le schéma Prisma: npm run db:push</p>
          </div>
          <div className="flex items-start space-x-2">
            <Badge variant="outline">4</Badge>
            <p className="text-sm">Créer les premières compagnies et utilisateurs</p>
          </div>
        </CardContent>
      </Card>

      {lowConsumables.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle>Consommables en faible stock</CardTitle>
            <CardDescription>Action requise: réapprovisionnement recommandé</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5">
              {lowConsumables.map(c => (
                <li key={c.id} className="text-sm">
                  {c.type?.name ?? 'Inconnu'} — {c.quantity} / {c.minimumStock}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <DashboardStats 
        machines={machines}
        users={usersList}
        deliveryNotes={deliveryNotes}
      />
    </div>
  )
}
