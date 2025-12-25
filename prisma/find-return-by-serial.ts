import { prisma } from '../lib/db'

async function main() {
  const serial = process.argv[2] || 'JHHGYUg'
  console.log(`Searching for ReturnNotes with serial: ${serial}`)

  const equipments = await prisma.returnNoteEquipment.findMany({
    where: { serialNumber: { equals: serial, mode: 'insensitive' } },
    include: { returnNote: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!equipments || equipments.length === 0) {
    console.log('No ReturnNoteEquipment found for serial')
    process.exit(0)
  }

  console.log(JSON.stringify(equipments, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
