import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Récupérer la company existante
  const company = await prisma.company.findFirst()
  
  if (!company) {
    console.error('Aucune company trouvée')
    return
  }

  console.log('Company trouvée:', company.name)

  // Créer l'utilisateur admin
  const user = await prisma.user.create({
    data: {
      email: 'ghanmimohamedaymen@gmail.com',
      firstName: 'Mohamed Aymen',
      lastName: 'Ghanmi',
      role: 'super_admin',
      companyId: company.id,
    }
  })

  console.log('✅ Utilisateur créé avec succès:')
  console.log('ID:', user.id)
  console.log('Email:', user.email)
  console.log('Name:', user.firstName, user.lastName)
  console.log('Role:', user.role)
  console.log('CompanyId:', user.companyId)

  await prisma.$disconnect()
}

main()
