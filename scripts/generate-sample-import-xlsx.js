const xlsx = require('xlsx')
const fs = require('fs')

const data = [
  ['Email','FirstName','LastName','CompanyCode','Role'],
  ['superadmin@example.com','Admin','Principal','DEFAULT','super_admin'],
  ['alice@example.com','Alice','Martin','ACME','company_admin'],
  ['bob@example.com','Bob','Durand','ACME','viewer'],
  ['charlie@example.com','Charlie','Petit','DEFAULT','viewer'],
]

const ws = xlsx.utils.aoa_to_sheet(data)
const wb = xlsx.utils.book_new()
xlsx.utils.book_append_sheet(wb, ws, 'users')
const out = 'public/samples/users-import-sample.xlsx'

if (!fs.existsSync('public/samples')) fs.mkdirSync('public/samples', { recursive: true })

xlsx.writeFile(wb, out)
console.log('Wrote', out)
