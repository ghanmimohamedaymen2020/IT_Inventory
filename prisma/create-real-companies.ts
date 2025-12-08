import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🏢 Création des sociétés réelles...\n')

  const companies = [
    { name: 'Green Tunisie', code: 'GREEN' },
    { name: 'Transglory Tunisie', code: 'TRANS' },
  ]

  for (const company of companies) {
    // Vérifier si la société existe déjà
    const existing = await prisma.company.findFirst({
      where: {
        OR: [
          { code: company.code },
          { name: company.name }
        ]
      }
    })

    if (existing) {
      console.log(`⚠️  ${company.name} existe déjà (ignoré)`)
      continue
    }

    // Créer la société
    const created = await prisma.company.create({
      data: company
    })

    console.log(`✅ ${created.name} (${created.code}) créée avec succès`)
  }

  // Afficher toutes les sociétés
  const allCompanies = await prisma.company.findMany({
    orderBy: { name: 'asc' }
  })

  console.log('\n📋 Liste des sociétés:')
  console.log('='.repeat(60))
  allCompanies.forEach((c, index) => {
    console.log(`  ${index + 1}. ${c.name.padEnd(40)} (${c.code})`)
  })
  console.log('='.repeat(60))
  console.log(`\nTotal: ${allCompanies.length} société(s)\n`)
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
