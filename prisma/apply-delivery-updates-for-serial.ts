import { prisma } from '../lib/db'

async function main() {
  const serial = process.argv[2] || 'JHHGYUg'
  console.log(`Applying delivery-note updates for serial: ${serial}`)

  const equipments = await prisma.deliveryNoteEquipment.findMany({
    where: { serialNumber: { equals: serial, mode: 'insensitive' } },
    include: { deliveryNote: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!equipments || equipments.length === 0) {
    console.log('No delivery-note equipments found for', serial)
    return
  }

  let updated = 0
  const screenTypes = ['screen', 'écran', 'ecran']

  for (const eq of equipments) {
    // If delivery note links company different from machine company, still apply by serial
    // Prefer to set userId to delivery note creator if available (createdById)
    const userId = eq.deliveryNote?.createdById || undefined

    try {
      // Heuristic: if the equipment type string looks like a screen, update screen, else machine
      const t = String(eq.type || '').toLowerCase()
      if (screenTypes.includes(t)) {
        const res = await prisma.screen.updateMany({ where: { serialNumber: eq.serialNumber }, data: { userId: userId || null, assetStatus: 'en_service' } })
        if (res.count > 0) updated += res.count
      } else {
        const res = await prisma.machine.updateMany({ where: { serialNumber: eq.serialNumber }, data: { userId: userId || null, assetStatus: 'en_service' } })
        if (res.count > 0) updated += res.count
      }
    } catch (err) {
      console.error('Error applying delivery update for', eq.serialNumber, err)
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
