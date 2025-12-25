import { prisma } from '../lib/db'

async function main() {
  const serial = process.argv[2] || 'JHHGYUg'
  console.log(`Applying return-note updates for serial: ${serial}`)

  const equipments = await prisma.returnNoteEquipment.findMany({
    where: { serialNumber: { equals: serial, mode: 'insensitive' } },
    include: { returnNote: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!equipments || equipments.length === 0) {
    console.log('No return-note equipments found for', serial)
    return
  }

  const destToStatus = (dest: string) => {
    const d = String(dest || '').toLowerCase()
    if (d === 'reparation' || d === 'réparation') return 'maintenance'
    if (d === 'rebut') return 'retiré'
    return 'en_stock'
  }

  let updated = 0
  for (const eq of equipments) {
    const destination = eq.returnNote?.destination || 'stock'
    const targetStatus = destToStatus(destination)

    // If record relates to a screen-like type, try screen update, else machine
    const t = String(eq.type || '').toLowerCase()
    const screenTypes = ['screen', 'écran', 'ecran']

    if (screenTypes.includes(t)) {
      const res = await prisma.screen.updateMany({
        where: { serialNumber: eq.serialNumber },
        data: { userId: null, assetStatus: targetStatus },
      })
      if (res.count > 0) updated += res.count
    } else {
      const res = await prisma.machine.updateMany({
        where: { serialNumber: eq.serialNumber },
        data: { userId: null, assetStatus: targetStatus },
      })
      if (res.count > 0) updated += res.count
    }
  }

  console.log(`Done — updated ${updated} records for serial ${serial}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
