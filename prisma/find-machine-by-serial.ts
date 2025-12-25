import { prisma } from '../lib/db'

async function main() {
  const serial = process.argv[2] || 'JHHGYUg'
  console.log(`Searching for machine with serial: ${serial}`)

  const machine = await prisma.machine.findFirst({
    where: { serialNumber: { equals: serial, mode: 'insensitive' } },
    include: { user: true, company: true, deliveryNote: true },
  })

  if (!machine) {
    console.log('Machine not found')
    process.exit(0)
  }

  console.log(JSON.stringify(machine, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
