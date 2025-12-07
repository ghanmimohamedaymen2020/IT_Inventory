import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Créer une company par défaut
  const company = await prisma.company.upsert({
    where: { code: "DEV" },
    update: {},
    create: {
      name: "Dev Company",
      code: "DEV"
    }
  })

  console.log('✅ Company créée:', company)

  // Créer un utilisateur admin par défaut
  const user = await prisma.user.upsert({
    where: { email: 'ghanmimohamedaymen@gmail.com' },
    update: {},
    create: {
      email: 'ghanmimohamedaymen@gmail.com',
      firstName: 'Mohamed Aymen',
      lastName: 'GHANMI',
      role: 'super_admin',
      companyId: company.id
    }
  })

  console.log('✅ Utilisateur créé:', user)
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
