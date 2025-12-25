import { prisma } from '../lib/db'

async function main() {
  const notes = await prisma.returnNote.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { equipments: true }
  })

  for (const n of notes) {
    console.log(`ReturnNote ${n.noteNumber} (${n.id}) - ${n.equipments.length} equipments`)
    for (const eq of n.equipments) {
      const serial = (eq.serialNumber || '').trim()
      const machine = serial ? await prisma.machine.findUnique({ where: { serialNumber: serial } }) : null
      console.log(` - equipment serial='${eq.serialNumber}' inventory='${eq.inventoryCode}' type=${eq.type}`)
      if (machine) {
        console.log(`   -> machine id=${machine.id} assetStatus=${machine.assetStatus} userId=${machine.userId}`)
      } else {
        console.log('   -> no machine found for this serial')
      }
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(async () => { await prisma.$disconnect() })
