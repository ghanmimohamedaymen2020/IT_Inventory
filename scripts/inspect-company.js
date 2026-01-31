#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const raw = process.argv[2]
  if (!raw) {
    console.error('Usage: node scripts/inspect-company.js <code|--code=CODE|--id=ID>')
    process.exit(1)
  }

  let where = {}
  if (raw.startsWith('--id=')) {
    where = { id: raw.slice(5) }
  } else if (raw.startsWith('--code=')) {
    where = { code: raw.slice(7).toUpperCase() }
  } else {
    // assume company code
    where = { code: raw.toUpperCase() }
  }

  try {
    const company = await prisma.company.findFirst({ where })
    if (!company) {
      console.log('Company not found for', where)
    } else {
      console.log(JSON.stringify(company, null, 2))
    }
  } catch (err) {
    console.error('Error querying company:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
