import { prisma } from '../lib/db'

async function main() {
  const machines = await prisma.machine.findMany({
    where: { assetStatus: 'en_service', userId: { not: null } },
    take: 50,
    include: { company: true }
  })
  console.log(`Found ${machines.length} machines with assetStatus=en_service and assigned user:`)
  for (const m of machines) {
    console.log(`${m.inventoryCode} / SN=${m.serialNumber} id=${m.id} company=${m.company?.name || m.companyId} userId=${m.userId}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(async () => { await prisma.$disconnect() })
