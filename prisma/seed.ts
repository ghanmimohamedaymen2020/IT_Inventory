import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Début du seed...')

  // Créer une company par défaut
  const company = await prisma.company.upsert({
    where: { code: "DEV" },
    update: {},
    create: {
      name: "Dev Company",
      code: "DEV"
    }
  })

  console.log('✅ Company créée:', company.name)

  // Créer un utilisateur admin par défaut
  const admin = await prisma.user.upsert({
    where: { email: 'ghanmimohamedaymen@gmail.com' },
    update: {},
    create: {
      email: 'ghanmimohamedaymen@gmail.com',
      firstName: 'Mohamed Aymen',
      lastName: 'GHANMI',
      role: 'super_admin',
      companyId: company.id
    }
  })

  console.log('✅ Utilisateur admin créé:', admin.email)

  // Créer des utilisateurs de test
  const user1 = await prisma.user.upsert({
    where: { email: 'user1@dev.com' },
    update: {},
    create: {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'user1@dev.com',
      companyId: company.id,
      role: 'user',
      department: 'IT',
      office: 'Paris',
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'user2@dev.com' },
    update: {},
    create: {
      firstName: 'Marie',
      lastName: 'Martin',
      email: 'user2@dev.com',
      companyId: company.id,
      role: 'user',
      department: 'Comptabilité',
      office: 'Lyon',
    },
  })

  console.log('✅ Utilisateurs de test créés')

  // Créer des machines de test
  const machines = [
    {
      inventoryCode: `${company.code}-ASSET-0001`,
      serialNumber: 'SN-LAPTOP-001',
      machineName: 'Dell Latitude 7420',
      type: 'Laptop',
      vendor: 'Dell',
      model: 'Latitude 7420',
      acquisitionDate: new Date('2023-01-15'),
      warrantyDate: new Date('2026-01-15'),
      windowsVersion: 'Windows 11 Pro',
      cpu: 'Intel Core i7-1185G7',
      ram: '16 GB',
      disk: '512 GB SSD',
      assetStatus: 'en_service',
      companyId: company.id,
      userId: user1.id,
    },
    {
      inventoryCode: `${company.code}-ASSET-0002`,
      serialNumber: 'SN-DESKTOP-001',
      machineName: 'HP EliteDesk 800',
      type: 'Desktop',
      vendor: 'HP',
      model: 'EliteDesk 800 G6',
      acquisitionDate: new Date('2023-03-20'),
      warrantyDate: new Date('2026-03-20'),
      windowsVersion: 'Windows 11 Pro',
      cpu: 'Intel Core i5-10500',
      ram: '32 GB',
      disk: '1 TB SSD',
      assetStatus: 'en_service',
      companyId: company.id,
      userId: user2.id,
    },
    {
      inventoryCode: `${company.code}-ASSET-0003`,
      serialNumber: 'SN-LAPTOP-002',
      machineName: 'Lenovo ThinkPad X1',
      type: 'Laptop',
      vendor: 'Lenovo',
      model: 'ThinkPad X1 Carbon Gen 9',
      acquisitionDate: new Date('2023-06-10'),
      warrantyDate: new Date('2026-06-10'),
      windowsVersion: 'Windows 11 Pro',
      cpu: 'Intel Core i7-1165G7',
      ram: '16 GB',
      disk: '512 GB SSD',
      assetStatus: 'en_stock',
      companyId: company.id,
      userId: null,
    },
  ]

  for (const machineData of machines) {
    const existing = await prisma.machine.findUnique({
      where: { inventoryCode: machineData.inventoryCode },
    })

    if (!existing) {
      await prisma.machine.create({ data: machineData })
      console.log(`✅ Machine créée: ${machineData.machineName}`)
    } else {
      console.log(`ℹ️ Machine déjà existante: ${machineData.machineName}`)
    }
  }

  // Créer des écrans de test
  const screens = [
    {
      inventoryCode: `${company.code}-SCREEN-0001`,
      serialNumber: 'SN-SCREEN-001',
      brand: 'Dell',
      model: 'P2419H',
      size: '24"',
      resolution: '1920x1080',
      purchaseDate: new Date('2023-01-15'),
      warrantyDate: new Date('2026-01-15'),
    },
    {
      inventoryCode: `${company.code}-SCREEN-0002`,
      serialNumber: 'SN-SCREEN-002',
      brand: 'Samsung',
      model: 'S27F350',
      size: '27"',
      resolution: '1920x1080',
      purchaseDate: new Date('2023-02-20'),
      warrantyDate: new Date('2026-02-20'),
    },
    {
      inventoryCode: `${company.code}-SCREEN-0003`,
      serialNumber: 'SN-SCREEN-003',
      brand: 'LG',
      model: '27UK850-W',
      size: '27"',
      resolution: '3840x2160',
      purchaseDate: new Date('2023-03-25'),
      warrantyDate: new Date('2026-03-25'),
    },
    {
      inventoryCode: `${company.code}-SCREEN-0004`,
      serialNumber: 'SN-SCREEN-004',
      brand: 'BenQ',
      model: 'GW2480',
      size: '23.8"',
      resolution: '1920x1080',
      purchaseDate: new Date('2023-05-10'),
      warrantyDate: new Date('2026-05-10'),
    },
  ]

  for (const screenData of screens) {
    const existing = await prisma.screen.findUnique({
      where: { inventoryCode: screenData.inventoryCode },
    })

    if (!existing) {
      await prisma.screen.create({ data: screenData })
      console.log(`✅ Écran créé: ${screenData.brand} ${screenData.model}`)
    } else {
      console.log(`ℹ️ Écran déjà existant: ${screenData.brand} ${screenData.model}`)
    }
  }

  // Mettre à jour les séquences d'inventaire
  await prisma.inventorySequence.upsert({
    where: {
      companyCode_assetType: {
        companyCode: company.code,
        assetType: 'ASSET',
      },
    },
    create: {
      companyCode: company.code,
      assetType: 'ASSET',
      lastNumber: 3,
    },
    update: {
      lastNumber: 3,
    },
  })

  await prisma.inventorySequence.upsert({
    where: {
      companyCode_assetType: {
        companyCode: company.code,
        assetType: 'SCREEN',
      },
    },
    create: {
      companyCode: company.code,
      assetType: 'SCREEN',
      lastNumber: 4,
    },
    update: {
      lastNumber: 4,
    },
  })

  console.log('✅ Séquences d\'inventaire mises à jour')
  console.log('✅ Seed terminé avec succès!')
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
