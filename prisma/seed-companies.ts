import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const companies = [
  { name: "Green Tunisie", code: "GRN" },
  { name: "Transglory Tunisie", code: "TGL" },
  { name: "Seabridge Tunisie", code: "SBR" },
  { name: "Globalcontainer", code: "GLC" },
  { name: "Unimed Tunisie", code: "UMD" },
]

async function main() {
  console.log('🌱 Seeding companies...')

  for (const company of companies) {
    const existing = await prisma.company.findUnique({
      where: { code: company.code }
    })

    if (!existing) {
      await prisma.company.create({
        data: company
      })
      console.log(`✅ Created company: ${company.name} (${company.code})`)
    } else {
      console.log(`⏭️  Company already exists: ${company.name} (${company.code})`)
    }
  }

  console.log('✨ Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding companies:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
