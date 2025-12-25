import { prisma } from '../lib/db'

const domainMap: Record<string, { name: string; code: string }> = {
  'transglory.com': { name: 'Transglory Tunisie', code: 'TRANSGLORY' },
  'greeniberica.com': { name: 'Green Tunisie', code: 'GREEN' },
  'seabidge.com': { name: 'Seabridge Tunisie', code: 'SEABRIDGE' },
}

async function ensureCompany(name: string, code: string) {
  try {
    const existing = await prisma.company.findUnique({ where: { name } })
    if (existing) return existing
    return await prisma.company.create({ data: { name, code } })
  } catch (e) {
    // fallback: try findFirst
    const found = await prisma.company.findFirst({ where: { name } })
    if (found) return found
    throw e
  }
}

async function main() {
  let totalUpdated = 0
  for (const [domain, meta] of Object.entries(domainMap)) {
    const company = await ensureCompany(meta.name, meta.code)
    const res = await prisma.user.updateMany({
      where: { email: { endsWith: `@${domain}` } },
      data: { companyId: company.id },
    })
    console.log(`${res.count} users assigned to ${company.name} by domain ${domain}`)
    totalUpdated += res.count
  }

  console.log(`Total users updated: ${totalUpdated}`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
