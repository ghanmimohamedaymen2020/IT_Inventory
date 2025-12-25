import { prisma } from '../lib/db'

async function main() {
  const args = process.argv.slice(2)
  const execute = args.includes('--execute') || args.includes('-x')

  // Find users that look archived by email pattern or id prefix
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { endsWith: '@deleted.invalid' } },
        { id: { startsWith: 'ARCHIVED-' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  })

  if (users.length === 0) {
    console.log('No archived users found matching patterns.')
    return
  }

  console.log(`Found ${users.length} archived users:`)
  for (const u of users) {
    console.log(`- ${u.id}\t${u.email}\t${u.firstName || ''} ${u.lastName || ''}`)
  }

  if (!execute) {
    console.log('\nDry run — no deletion performed.')
    console.log('To delete these users run:')
    console.log('  npx tsx prisma/delete-archived-users.ts --execute')
    console.log('BACKUP NOTE: Ensure you have a DB dump before executing.')
    return
  }

  // Proceed to delete (deleteMany by id list)
  const ids = users.map((u) => u.id)
  const res = await prisma.user.deleteMany({ where: { id: { in: ids } } })
  console.log(`Deleted ${res.count} users.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
