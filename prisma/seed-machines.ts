import { prisma } from '../lib/db'

async function main() {
  console.log('🌱 Ajout de machines de test...')

  // Récupérer la compagnie et quelques utilisateurs
  const company = await prisma.company.findFirst()
  
  if (!company) {
    console.error('❌ Aucune compagnie trouvée')
    return
  }

  const users = await prisma.user.findMany({
    take: 10,
    include: { company: true }
  })

  if (users.length === 0) {
    console.error('❌ Aucun utilisateur trouvé')
    return
  }

  const machineTypes = ['desktop', 'laptop', 'server']
  const brands = ['Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'Apple', 'Microsoft']
  const processors = ['Intel Core i5-10400', 'Intel Core i7-11700', 'Intel Core i9-12900', 'AMD Ryzen 5 5600', 'AMD Ryzen 7 5800X']
  const rams = ['8GB DDR4', '16GB DDR4', '32GB DDR4', '64GB DDR4']
  const disks = ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD', '512GB NVMe']
  const windowsVersions = ['Windows 10 Pro', 'Windows 11 Pro', 'Windows Server 2019', 'Windows Server 2022']
  const statuses = ['en_service', 'maintenance', 'en_stock']

  const machines = []

  for (let i = 1; i <= 30; i++) {
    const brand = brands[Math.floor(Math.random() * brands.length)]
    const type = machineTypes[Math.floor(Math.random() * machineTypes.length)]
    const user = users[Math.floor(Math.random() * users.length)]
    
    // Générer un code d'inventaire
    const sequence = await prisma.inventorySequence.upsert({
      where: { 
        companyCode_assetType: {
          companyCode: company.code,
          assetType: 'ASSET'
        }
      },
      create: { 
        companyCode: company.code,
        assetType: 'ASSET',
        lastNumber: i
      },
      update: { 
        lastNumber: { increment: 1 } 
      }
    })

    const inventoryCode = `${company.code}-ASSET-${String(sequence.lastNumber).padStart(4, '0')}`

    try {
      const machine = await prisma.machine.create({
        data: {
          inventoryCode,
          serialNumber: `SN${brand.substring(0, 3).toUpperCase()}${Date.now()}${i}`,
          machineName: `${brand} ${type} ${i}`,
          type,
          vendor: brand,
          model: type === 'laptop' ? `${brand} ${type} Pro ${i}` : `${brand} Optiplex ${3000 + i}`,
          acquisitionDate: new Date(2023 + Math.floor(i / 10), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          windowsVersion: windowsVersions[Math.floor(Math.random() * windowsVersions.length)],
          productKey: `XXXXX-XXXXX-XXXXX-XXXXX-${String(i).padStart(5, '0')}`,
          cpu: processors[Math.floor(Math.random() * processors.length)],
          ram: rams[Math.floor(Math.random() * rams.length)],
          disk: disks[Math.floor(Math.random() * disks.length)],
          warrantyDate: new Date(2025 + Math.floor(i / 10), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          assetStatus: statuses[Math.floor(Math.random() * statuses.length)],
          companyId: company.id,
          userId: user.id,
        }
      })

      machines.push(machine)
      console.log(`✅ ${i}/30 - ${machine.machineName} (${machine.inventoryCode}) - Assigné à ${user.firstName} ${user.lastName}`)
    } catch (error: any) {
      console.error(`❌ Erreur pour la machine ${i}:`, error.message)
    }
  }

  console.log(`\n✅ ${machines.length} machines créées avec succès!`)
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
