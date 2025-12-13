#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function run() {
  const id = process.argv[2]
  if (!id) {
    console.error('Usage: node scripts/find-duplicates.js <serialOrInventory>')
    process.exit(2)
  }

  console.log(`Searching for records matching: "${id}"\n`)

  const deliveries = await prisma.deliveryNoteEquipment.findMany({
    where: {
      OR: [
        { serialNumber: id },
        { inventoryCode: id }
      ]
    },
    include: {
      deliveryNote: true
    }
  })

  const returns = await prisma.returnNoteEquipment.findMany({
    where: {
      OR: [
        { serialNumber: id },
        { inventoryCode: id }
      ]
    },
    include: {
      returnNote: true
    }
  })

  const machines = await prisma.machine.findMany({
    where: {
      OR: [
        { serialNumber: id },
        { inventoryCode: id }
      ]
    }
  })

  console.log('DeliveryNoteEquipments:')
  console.log(JSON.stringify(deliveries, null, 2))
  console.log('\nReturnNoteEquipments:')
  console.log(JSON.stringify(returns, null, 2))
  console.log('\nMachines:')
  console.log(JSON.stringify(machines, null, 2))

  // Find duplicates by user (createdById or previousUser)
  const byUser = {}
  for (const d of deliveries) {
    const userKey = d.deliveryNote.createdById || d.deliveryNote.receivedBy || 'unknown'
    byUser[userKey] = byUser[userKey] || []
    byUser[userKey].push({ type: 'delivery', noteNumber: d.deliveryNote.noteNumber, date: d.deliveryNote.deliveryDate, id: d.deliveryNote.id })
  }
  for (const r of returns) {
    const userKey = r.previousUser || r.returnNote.createdById || 'unknown'
    byUser[userKey] = byUser[userKey] || []
    byUser[userKey].push({ type: 'return', noteNumber: r.returnNote.noteNumber, date: r.returnNote.returnDate, id: r.returnNote.id })
  }

  console.log('\nGrouped by user-like key:')
  console.log(JSON.stringify(byUser, null, 2))

  await prisma.$disconnect()
}

run().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1) })
