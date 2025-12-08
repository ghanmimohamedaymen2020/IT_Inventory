import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Nettoyage de Dev Company...\n')

  // Trouver Dev Company
  const devCompany = await prisma.company.findFirst({
    where: { code: 'DEV' }
  })

  if (!devCompany) {
    console.log('✓ Dev Company n\'existe pas')
    return
  }

  console.log(`Trouvé: ${devCompany.name} (${devCompany.code})`)

  // Trouver la première société valide (Green, Transglory, etc.)
  const validCompany = await prisma.company.findFirst({
    where: {
      code: {
        in: ['GRN', 'TGL', 'SBR', 'GLC', 'UMD']
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  if (!validCompany) {
    console.log('❌ Aucune société valide trouvée. Exécutez d\'abord seed-companies.ts')
    return
  }

  console.log(`Société de remplacement: ${validCompany.name} (${validCompany.code})`)

  // Mettre à jour toutes les machines qui ont Dev Company
  const machinesUpdated = await prisma.machine.updateMany({
    where: { companyId: devCompany.id },
    data: { companyId: validCompany.id }
  })

  console.log(`✓ ${machinesUpdated.count} machine(s) réassignée(s)`)

  // Mettre à jour tous les utilisateurs qui ont Dev Company
  const usersUpdated = await prisma.user.updateMany({
    where: { companyId: devCompany.id },
    data: { companyId: validCompany.id }
  })

  console.log(`✓ ${usersUpdated.count} utilisateur(s) réassigné(s)`)

  // Supprimer Dev Company
  await prisma.company.delete({
    where: { id: devCompany.id }
  })

  console.log(`✓ Dev Company supprimée`)

  // Afficher le résumé
  const companies = await prisma.company.findMany({
    orderBy: { name: 'asc' }
  })

  console.log('\n📊 Sociétés restantes:')
  companies.forEach(c => {
    console.log(`   - ${c.name} (${c.code})`)
  })

  console.log('\n✨ Nettoyage terminé!')
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
