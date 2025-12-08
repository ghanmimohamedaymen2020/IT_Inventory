import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const screens = await prisma.screen.findMany({
    include: { company: true }
  })

  console.log('\n📺 État des écrans:\n')
  screens.forEach(s => {
    console.log(`  ${s.inventoryCode.padEnd(20)} → Société: ${s.company?.name || '❌ NULL'}`)
  })
  console.log('')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
