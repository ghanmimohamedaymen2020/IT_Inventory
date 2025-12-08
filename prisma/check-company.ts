import { prisma } from "../lib/db"

async function main() {
  const companies = await prisma.company.findMany({
    orderBy: { name: 'asc' }
  })
  console.log('All companies:', companies)
}

main()
  .catch((error) => {
    console.error(error)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })