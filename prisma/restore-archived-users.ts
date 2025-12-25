import { prisma } from '../lib/db'

async function main() {
  const args = process.argv.slice(2)
  const execute = args.includes('--execute') || args.includes('-x')

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { endsWith: '@deleted.invalid' } },
        { role: 'archived' },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  })

  if (users.length === 0) {
    console.log('No archived users found to restore.')
    return
  }

  console.log(`Found ${users.length} archived users:`)
  for (const u of users) {
    console.log(`- ${u.id}\t${u.email}\t${u.firstName || ''} ${u.lastName || ''}`)
  }

  if (!execute) {
    console.log('\nDry run — no changes performed.')
    console.log('To restore these users run:')
    console.log('  npx tsx prisma/restore-archived-users.ts --execute')
    return
  }

  let restored = 0
  for (const u of users) {
    const first = (u.firstName && u.firstName.startsWith('ARCHIVED-')) ? u.firstName.replace(/^ARCHIVED-/, '') : ''
    const newEmail = `restored+${u.id}@restored.invalid`

    try {
      await prisma.user.update({
        where: { id: u.id },
        data: {
          role: 'viewer',
          firstName: first || '',
          lastName: '',
          email: newEmail,
        },
      })
      restored++
    } catch (err) {
      console.error('Failed to restore', u.id, err)
    }
  }

  console.log(`Done — restored ${restored} users.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
