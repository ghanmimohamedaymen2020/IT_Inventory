import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/db'

async function csvChecks() {
  const p = path.join(__dirname, '../usersupload.csv')
  const s = fs.readFileSync(p, 'utf8')
  const lines = s.split(/\r\n|[\r\n]/).map(l => l.trim()).filter(Boolean)
  const header = lines[0]
  const data = lines.slice(1)

  const emailCounts: Record<string, number> = {}
  const nameCounts: Record<string, number> = {}
  const serialCounts: Record<string, number> = {}

  for (const line of data) {
    const cols = line.split(';').map(c => c.trim())
    const email = cols[0] || ''
    const name = cols[1] || ''
    const serial = cols[7] || cols[cols.length -1] || ''

    if (email) emailCounts[email] = (emailCounts[email] || 0) + 1
    if (name) nameCounts[name] = (nameCounts[name] || 0) + 1
    if (serial) serialCounts[serial] = (serialCounts[serial] || 0) + 1
  }

  const emailDups = Object.entries(emailCounts).filter(([,c]) => c>1)
  const nameDups = Object.entries(nameCounts).filter(([,c]) => c>1)
  const serialDups = Object.entries(serialCounts).filter(([,c]) => c>1)

  return { totalLines: data.length, emailDups, nameDups, serialDups }
}

async function dbChecks() {
  // duplicate emails should not exist due to unique constraint, but check names
  const names = await prisma.user.findMany({ select: { firstName: true, lastName: true, email: true } })
  const nameMap: Record<string, string[]> = {}
  for (const u of names) {
    const key = `${u.firstName.trim().toLowerCase()}|${u.lastName.trim().toLowerCase()}`
    nameMap[key] = nameMap[key] || []
    nameMap[key].push(u.email)
  }
  const nameDups = Object.entries(nameMap).filter(([,emails]) => emails.length>1)
  return { totalUsers: names.length, nameDups }
}

async function main(){
  const csv = await csvChecks()
  const db = await dbChecks()
  console.log('\nCSV summary:')
  console.log('Total CSV rows:', csv.totalLines)
  console.log('Duplicate emails in CSV:', csv.emailDups.length)
  if (csv.emailDups.length) console.log(csv.emailDups.slice(0,50))
  console.log('Duplicate full names in CSV:', csv.nameDups.length)
  if (csv.nameDups.length) console.log(csv.nameDups.slice(0,50))
  console.log('Duplicate serials in CSV:', csv.serialDups.length)
  if (csv.serialDups.length) console.log(csv.serialDups.slice(0,50))

  console.log('\nDB summary:')
  console.log('Total users in DB:', db.totalUsers)
  console.log('Users sharing same first+last name:', db.nameDups.length)
  if (db.nameDups.length) {
    console.log(db.nameDups.slice(0,50).map(([name, emails]) => ({ name, emails })))
  }
}

main().catch(e=>{ console.error(e); process.exit(1) }).finally(()=>prisma.$disconnect())
