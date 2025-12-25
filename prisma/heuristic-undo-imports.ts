import { prisma } from '../lib/db'

async function main() {
  // Heuristic: target recent viewer users likely created by CSV import
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7) // last 7 days

  const candidates = await prisma.user.findMany({
    where: {
      role: 'viewer',
      createdAt: { gte: cutoff },
    },
  })

  console.log(`Found ${candidates.length} viewer users created since ${cutoff.toISOString()}`)

  let unassignedMachines = 0
  let archivedUsers = 0

  for (const u of candidates) {
    const res = await prisma.machine.updateMany({
      where: { userId: u.id },
      data: { userId: null, assetStatus: 'en_stock' },
    })
    unassignedMachines += res.count ?? 0

    // Archive user instead of deleting to avoid FK issues
    await prisma.user.update({
      where: { id: u.id },
      data: {
        role: 'archived',
        firstName: `ARCHIVED-${u.id}`,
        lastName: '',
        email: `archived+${u.id}@deleted.invalid`,
      },
    })
    archivedUsers++
    console.log(`Archived user ${u.email} (${u.id}), unassigned ${res.count ?? 0} machines`)
  }

  console.log(`Done — machines unassigned: ${unassignedMachines}, users archived: ${archivedUsers}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
