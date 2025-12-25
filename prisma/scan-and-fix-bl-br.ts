import { prisma } from '../lib/db'

function destToStatus(dest: string) {
  const d = String(dest || '').toLowerCase()
  if (d === 'reparation' || d === 'réparation') return 'maintenance'
  if (d === 'rebut') return 'retiré'
  return 'en_stock'
}

async function run() {
  console.log('Scanning ReturnNotes...')
  const returnEquipments = await prisma.returnNoteEquipment.findMany({
    include: { returnNote: true },
  })

  let returnChecks = 0
  let returnFixed = 0

  for (const eq of returnEquipments) {
    returnChecks++
    const serial = eq.serialNumber
    const expectedStatus = destToStatus(eq.returnNote?.destination || 'stock')

    // Prefer machine; if not found, try screen
    const machine = await prisma.machine.findFirst({ where: { serialNumber: serial } })
    if (machine) {
      const needsStatus = machine.assetStatus !== expectedStatus
      const needsUnassign = machine.userId !== null
      if (needsStatus || needsUnassign) {
        await prisma.machine.updateMany({
          where: { serialNumber: serial },
          data: { assetStatus: expectedStatus, userId: null },
        })
        returnFixed++
      }
      continue
    }

    const screen = await prisma.screen.findFirst({ where: { serialNumber: serial } })
    if (screen) {
      const needsStatus = screen.assetStatus !== expectedStatus
      const needsUnassign = screen.userId !== null
      if (needsStatus || needsUnassign) {
        await prisma.screen.updateMany({
          where: { serialNumber: serial },
          data: { assetStatus: expectedStatus, userId: null },
        })
        returnFixed++
      }
      continue
    }
  }

  console.log(`ReturnNotes: checked ${returnChecks}, fixed ${returnFixed}`)

  console.log('Scanning DeliveryNotes...')
  const deliveryEquipments = await prisma.deliveryNoteEquipment.findMany({ include: { deliveryNote: true } })
  let deliveryChecks = 0
  let deliveryFixed = 0

  for (const eq of deliveryEquipments) {
    deliveryChecks++
    const serial = eq.serialNumber
    const assignUserId = eq.deliveryNote?.createdById || null

    const machine = await prisma.machine.findFirst({ where: { serialNumber: serial } })
    if (machine) {
      const needsAssign = machine.userId !== assignUserId
      const needsStatus = machine.assetStatus !== 'en_service'
      if (needsAssign || needsStatus) {
        await prisma.machine.updateMany({ where: { serialNumber: serial }, data: { userId: assignUserId, assetStatus: 'en_service' } })
        deliveryFixed++
      }
      continue
    }

    const screen = await prisma.screen.findFirst({ where: { serialNumber: serial } })
    if (screen) {
      const needsAssign = screen.userId !== assignUserId
      const needsStatus = screen.assetStatus !== 'en_service'
      if (needsAssign || needsStatus) {
        await prisma.screen.updateMany({ where: { serialNumber: serial }, data: { userId: assignUserId, assetStatus: 'en_service' } })
        deliveryFixed++
      }
      continue
    }
  }

  console.log(`DeliveryNotes: checked ${deliveryChecks}, fixed ${deliveryFixed}`)

  console.log('Done.')
}

run()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
