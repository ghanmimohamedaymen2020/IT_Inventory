import ConsumableList from '@/components/consumables/consumable-list'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export default async function ConsumablesPage() {
  const companies = await prisma.company.findMany({ orderBy: { name: 'asc' } })

  const session = await auth()
  const isSuperAdmin = !!session?.user && session.user.role === 'super_admin'

  const nameRows = await prisma.consumable.findMany({ distinct: ['typeId'], select: { type: { select: { name: true } } }, orderBy: { type: { name: 'asc' } } })
  const consumableNames = nameRows.map(r => r.type?.name).filter(Boolean as any)

  const consumablesRaw = await prisma.consumable.findMany({ include: { type: true, company: true } })
  const items = consumablesRaw.map(i => ({ id: i.id, name: i.type?.name ?? 'Unknown', sku: null, quantity: i.quantity, minThreshold: i.minimumStock ?? null, companyId: i.companyId }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Consommables</h1>
        <p className="text-muted-foreground mt-1">Gérer les consommables par société</p>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <ConsumableList initialCompanies={companies} initialItems={items} initialNames={consumableNames} isSuperAdmin={isSuperAdmin} />
      </div>
    </div>
  )
}
