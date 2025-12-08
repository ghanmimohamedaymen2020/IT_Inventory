import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Attribution des sociétés aux machines et utilisateurs...\n')

  // Récupérer la première société disponible
  const firstCompany = await prisma.company.findFirst({
    orderBy: { createdAt: 'asc' }
  })

  if (!firstCompany) {
    console.log('❌ Aucune société trouvée. Créez d\'abord une société.')
    return
  }

  console.log(`✓ Société par défaut: ${firstCompany.name} (${firstCompany.code})`)

  // Mettre à jour toutes les machines avec cette société
  const machinesUpdated = await prisma.machine.updateMany({
    data: {
      companyId: firstCompany.id
    }
  })

  console.log(`✓ ${machinesUpdated.count} machine(s) assignée(s) à ${firstCompany.name}`)

  // Mettre à jour tous les utilisateurs avec cette société
  const usersUpdated = await prisma.user.updateMany({
    data: {
      companyId: firstCompany.id
    }
  })

  console.log(`✓ ${usersUpdated.count} utilisateur(s) assigné(s) à ${firstCompany.name}`)

  // Afficher le résumé
  const totalMachines = await prisma.machine.count()
  const totalUsers = await prisma.user.count()
  const totalCompanies = await prisma.company.count()

  console.log('\n📊 Résumé:')
  console.log(`   - ${totalCompanies} société(s)`)
  console.log(`   - ${totalMachines} machine(s)`)
  console.log(`   - ${totalUsers} utilisateur(s)`)
  
  console.log('\n✨ Attribution terminée!')
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
