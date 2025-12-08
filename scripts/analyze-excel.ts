import * as XLSX from 'xlsx'

const wb = XLSX.readFile('F:\\Project\\Classeur1.xlsx')
const ws = wb.Sheets[wb.SheetNames[0]]
const data = XLSX.utils.sheet_to_json(ws, { defval: '' })

console.log('📊 Analyse du fichier Excel')
console.log('='.repeat(60))
console.log(`\n✅ Nombre de lignes: ${data.length}`)

if (data.length > 0) {
  console.log('\n📋 Colonnes détectées:')
  Object.keys(data[0] as any).forEach((col, i) => {
    console.log(`  ${i + 1}. ${col}`)
  })
  
  console.log('\n📝 Exemple - Première ligne:')
  console.log('='.repeat(60))
  console.log(JSON.stringify(data[0], null, 2))
  
  console.log('\n📝 Exemple - Deuxième ligne:')
  console.log('='.repeat(60))
  if (data.length > 1) {
    console.log(JSON.stringify(data[1], null, 2))
  }
}
