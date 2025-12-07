import { prisma } from '../lib/db'

async function main() {
  console.log('🌱 Ajout de 50 utilisateurs de test...')

  // Récupérer la compagnie existante
  const company = await prisma.company.findFirst()
  
  if (!company) {
    console.error('❌ Aucune compagnie trouvée. Exécutez d\'abord le seed principal.')
    return
  }

  console.log(`📦 Compagnie trouvée: ${company.name} (${company.code})`)

  const roles = ['viewer', 'company_admin', 'viewer']
  const departments = ['IT', 'RH', 'Finance', 'Marketing', 'Ventes', 'Support', 'Production']
  const positions = ['Développeur', 'Manager', 'Analyste', 'Technicien', 'Consultant', 'Chef de projet', 'Assistant']
  
  const firstNames = [
    'Jean', 'Marie', 'Pierre', 'Sophie', 'Luc', 'Camille', 'Thomas', 'Julie',
    'Nicolas', 'Emma', 'Alexandre', 'Sarah', 'Laurent', 'Léa', 'David', 'Chloé',
    'Antoine', 'Laura', 'Julien', 'Alice', 'Maxime', 'Charlotte', 'Benjamin', 'Manon',
    'Romain', 'Mathilde', 'Hugo', 'Pauline', 'Lucas', 'Clara', 'Arthur', 'Inès',
    'Louis', 'Jade', 'Paul', 'Zoé', 'Gabriel', 'Anaïs', 'Raphaël', 'Louise',
    'Adam', 'Océane', 'Tom', 'Lola', 'Théo', 'Elise', 'Nathan', 'Eva', 'Samuel', 'Anna'
  ]
  
  const lastNames = [
    'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand',
    'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David',
    'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Lefevre',
    'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand', 'Garnier',
    'Faure', 'Rousseau', 'Blanc', 'Guerin', 'Muller', 'Henry', 'Roussel', 'Nicolas',
    'Perrin', 'Morin', 'Mathieu', 'Clement', 'Gauthier', 'Dumont', 'Lopez', 'Fontaine', 'Chevalier', 'Robin'
  ]

  const users = []
  
  for (let i = 1; i <= 50; i++) {
    const firstName = firstNames[i - 1]
    const lastName = lastNames[i - 1]
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.code.toLowerCase()}.fr`
    const role = roles[i % roles.length]
    const department = departments[i % departments.length]
    const position = positions[i % positions.length]
    
    try {
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          phone: `+33 6 ${String(i).padStart(2, '0')} ${String(i * 2).padStart(2, '0')} ${String(i * 3).padStart(2, '0')} ${String(i * 4).padStart(2, '0')}`,
          role,
          companyId: company.id,
          office365Subscription: i % 3 === 0, // 1/3 ont Office 365
        }
      })
      
      users.push(user)
      console.log(`✅ ${i}/50 - ${firstName} ${lastName} (${email}) - ${role}`)
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⚠️  ${i}/50 - ${email} existe déjà, ignoré`)
      } else {
        console.error(`❌ Erreur pour ${email}:`, error.message)
      }
    }
  }

  console.log(`\n✅ ${users.length} utilisateurs créés avec succès!`)
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
