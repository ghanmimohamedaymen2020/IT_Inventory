import ConsumableList from '@/components/consumables/consumable-list'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

export default async function ConsumablesPage() {
  const companies = await prisma.company.findMany({ orderBy: { name: 'asc' } })

  async function getDevSession() {
    const cookieStore = await cookies()
    const devSession = cookieStore.get('dev-session')
    if (!devSession) return null
    try {
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'secret')
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

  // Prefer dev-session cookie (dev login) then fallback to NextAuth
  let session = await getDevSession()
  if (!session) {
    session = await auth()
  }

  const role = session?.user?.role
  // Treat both 'super_admin' and 'admin' as global admins for consumable listings
  const isGlobalAdmin = !!session?.user && (role === 'super_admin' || role === 'admin' || role === 'company_admin')
  // Keep explicit super admin flag for other UI distinctions
  const isSuperAdmin = !!session?.user && role === 'super_admin'
  // Allow both 'admin' and 'company_admin' to create consumables
  const canCreate = !!session?.user && (role === 'admin' || role === 'company_admin' || role === 'super_admin')
  const userRole = role

  // Global admins (super_admin and admin) should see consumables across all companies
  const companyId = isGlobalAdmin ? undefined : session?.user?.companyId || undefined
  const userCompanyId = session?.user?.companyId ?? null

  const nameRows = await prisma.consumable.findMany({
    where: companyId ? { companyId } : undefined,
    distinct: ['typeId'],
    select: { type: { select: { name: true } } },
    orderBy: { type: { name: 'asc' } }
  })
  const consumableNames = nameRows.map(r => r.type?.name).filter(Boolean as any)

  const consumablesRaw = await prisma.consumable.findMany({ where: companyId ? { companyId } : undefined, include: { type: true, company: true } })
  const items = consumablesRaw.map(i => ({ id: i.id, name: i.type?.name ?? 'Unknown', sku: null, quantity: i.quantity, minThreshold: i.minimumStock ?? null, companyId: i.companyId }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Consommables</h1>
        <p className="text-muted-foreground mt-1">Gérer les consommables par société</p>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <ConsumableList
          initialCompanies={companies}
          initialItems={items}
          initialNames={consumableNames}
          isSuperAdmin={isSuperAdmin}
          canCreate={canCreate}
          userRole={userRole}
          initialSelectedCompany={companyId ?? 'all'}
          initialUserCompanyId={isGlobalAdmin ? null : userCompanyId}
        />
      </div>
    </div>
  )
}
