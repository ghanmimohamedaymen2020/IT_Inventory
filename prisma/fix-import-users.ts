import { prisma } from '../lib/db'
import fs from 'fs'
import path from 'path'

async function main() {
  const filePath = path.join(__dirname, '../usersupload.csv')
  const text = fs.readFileSync(filePath, 'utf8')
  const lines = text.split(/\r\n|[\r\n]/).map(l => l.trim()).filter(Boolean)
  console.log(`Found ${lines.length} non-empty lines in CSV`)

  if (lines.length === 0) return

  // Detect header: if first line does not contain an @ it's probably a header
  const firstLineIsHeader = !lines[0].includes('@')
  const data = firstLineIsHeader ? lines.slice(1) : lines

  let found = 0
  let created = 0
  let updated = 0
  let skipped = 0
  const missingEmails: string[] = []

  const company = await prisma.company.findFirst({ where: { code: { contains: 'TRANSGLORY', mode: 'insensitive' } } })
  const companyId = company ? company.id : (await prisma.company.findFirst())?.id

  for (const [idx, line] of data.entries()) {
    const cols = line.split(';').map(c => c.trim())
    if (cols.length < 2) { skipped++; continue }
    const email = cols[0]
    const fullName = cols[1] || ''
    if (!email || !email.includes('@')) { skipped++; continue }

    const [firstNameRaw, ...rest] = fullName.split(' ').filter(Boolean)
    const firstName = firstNameRaw || email.split('@')[0]
    const lastName = rest.join(' ') || ''

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      found++
      // ensure company set
      if (companyId && existing.companyId !== companyId) {
        await prisma.user.update({ where: { email }, data: { companyId } })
        updated++
      }
    } else {
      await prisma.user.create({ data: {
        email,
        firstName,
        lastName,
        role: 'viewer',
        companyId: companyId || ''
      }})
      created++
    }
  }

  console.log(`Results: found=${found}, created=${created}, updated=${updated}, skipped=${skipped}`)

  // list emails in CSV that are still missing (sanity)
  const csvEmails = data.map(l => l.split(';')[0].trim()).filter(Boolean)
  for (const e of csvEmails) {
    const u = await prisma.user.findUnique({ where: { email: e } })
    if (!u) missingEmails.push(e)
  }

  if (missingEmails.length) {
    console.log('Missing emails after upsert:', missingEmails.join(', '))
  } else {
    console.log('All CSV emails present in DB')
  }
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await prisma.$disconnect() })
