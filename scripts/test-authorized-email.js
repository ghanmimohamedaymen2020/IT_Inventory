const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  try {
    console.log('Prisma client loaded')
    console.log('authorizedEmail in client:', typeof (prisma.authorizedEmail) !== 'undefined')

    // show a sample of users
    const users = await prisma.user.findMany({ take: 5 })
    console.log('sample users count:', users.length)

    if (users.length === 0) {
      console.log('No users found. Creating a test super_admin user...')
      const defaultCompany = await prisma.company.findFirst() || await prisma.company.create({ data: { name: 'Default Co', code: 'DEF' } })
      const u = await prisma.user.create({ data: { firstName: 'Test', lastName: 'Admin', email: 'test-admin@example.com', companyId: defaultCompany.id, role: 'super_admin' } })
      await prisma.admin.create({ data: { userId: u.id, role: 'super_admin', companyId: null } })
      console.log('Created user', u.email)
    }

    // Try to create an authorizedEmail linked to existing user
    const targetEmail = 'test-admin@example.com'
    const existingUser = await prisma.user.findUnique({ where: { email: targetEmail } })
    if (existingUser) {
      const upsert = await prisma.authorizedEmail.upsert({ where: { email: targetEmail }, update: { isActive: true }, create: { email: targetEmail, isActive: true, createdById: existingUser.id } })
      console.log('Upserted authorizedEmail:', upsert)
    } else {
      console.log('Existing user not found for', targetEmail)
    }
  } catch (err) {
    console.error('Test script error:', err)
  } finally {
    await (new PrismaClient()).$disconnect().catch(()=>{})
    process.exit(0)
  }
}

main()
