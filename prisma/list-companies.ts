import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const companies = await prisma.company.findMany({
    orderBy: { name: 'asc' }
  })

  console.log('\n📋 Sociétés existantes:')
  console.log('='.repeat(50))
  companies.forEach(c => {
    console.log(`  • ${c.name.padEnd(30)} (${c.code})`)
  })
  console.log('='.repeat(50))
  console.log(`\nTotal: ${companies.length} société(s)\n`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
