import { prisma } from '../lib/db'

async function main() {
  const search = 'Transglory'

  let company = await prisma.company.findFirst({
    where: {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ],
    },
  })

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Transglory Tunisie',
        code: 'TRANSGLORY',
      },
    })
    console.log(`Created company: ${company.name} (${company.id})`)
  } else {
    console.log(`Found company: ${company.name} (${company.id})`)
  }

  const result = await prisma.user.updateMany({
    where: {},
    data: { companyId: company.id },
  })

  console.log(`Updated ${result.count} users to company ${company.name}`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
