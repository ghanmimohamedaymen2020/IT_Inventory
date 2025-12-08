import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      companyId: true,
    }
  })

  console.log('=== USERS ===')
  users.forEach(user => {
    console.log(`ID: ${user.id}`)
    console.log(`Name: ${user.firstName} ${user.lastName}`)
    console.log(`Email: ${user.email}`)
    console.log(`CompanyId: ${user.companyId}`)
    console.log('---')
  })

  await prisma.$disconnect()
}

main()
