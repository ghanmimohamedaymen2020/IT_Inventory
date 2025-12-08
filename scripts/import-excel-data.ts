import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import * as path from 'path'

const prisma = new PrismaClient()

// Mapping des services
const serviceMapping: Record<string, string> = {
  'DocumentationTG': 'Transglory Tunisie',
  'Documentation TG': 'Transglory Tunisie',
  'DocumentationGT': 'Green Tunisie',
  'Documentation GT': 'Green Tunisie',
}

// Fonction pour normaliser le nom du service
function normalizeService(service: string | undefined): string {
  if (!service) return ''
  const trimmed = service.trim()
  return serviceMapping[trimmed] || trimmed
}

// Fonction pour parser CPU/RAM/Hard Drive
function parseCpuRamDisk(value: string | undefined): { cpu?: string, ram?: string, disk?: string } {
  if (!value) return {}
  
  const parts = value.toString().split('/')
  return {
    cpu: parts[0]?.trim() || undefined,
    ram: parts[1]?.trim() || undefined,
    disk: parts[2]?.trim() || undefined,
  }
}

// Fonction pour parser la date
function parseDate(value: any): Date | undefined {
  if (!value) return undefined
  
  // Si c'est déjà une date
  if (value instanceof Date) return value
  
  // Si c'est un nombre Excel (nombre de jours depuis 1900-01-01)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    return new Date(date.y, date.m - 1, date.d)
  }
  
  // Si c'est une string
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? undefined : parsed
  }
  
  return undefined
}

async function importExcelData(filePath: string) {
  try {
    console.log('📖 Lecture du fichier Excel...')
    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Lire avec range pour sauter les lignes vides et utiliser la première ligne comme en-têtes
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
    
    // La première ligne contient les vrais en-têtes dans les valeurs
    if (rawData.length === 0) {
      console.error('❌ Fichier Excel vide')
      return
    }
    
    // Extraire les en-têtes de la première ligne
    const firstRow = rawData[0]
    const headers: string[] = []
    Object.values(firstRow).forEach((value: any) => {
      if (value && value.toString().trim()) {
        headers.push(value.toString().trim())
      }
    })
    
    console.log('📋 En-têtes détectés:', headers.join(', '))
    
    // Convertir les lignes suivantes en utilisant les bons en-têtes
    const data: any[] = []
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i]
      const values = Object.values(row)
      const newRow: any = {}
      
      headers.forEach((header, index) => {
        newRow[header] = values[index] || ''
      })
      
      // Ne garder que les lignes avec au moins un numéro de série
      if (newRow['S/N'] && newRow['S/N'].toString().trim()) {
        data.push(newRow)
      }
    }

    console.log(`✅ ${data.length} lignes de données trouvées (${rawData.length - 1} total, ${rawData.length - 1 - data.length} lignes vides ignorées)`)

    // Récupérer toutes les compagnies
    const companies = await prisma.company.findMany()
    const companyMap = new Map(companies.map((c: any) => [c.name, c]))

    let created = 0
    let errors = 0

    for (let i = 0; i < data.length; i++) {
      const row: any = data[i]
      
      try {
        console.log(`\n📝 Traitement ligne ${i + 1}/${data.length}`)
        
        // Extraire les données avec conversion explicite en string
        const service = normalizeService(row['Service'])
        const userName = row['Utilisateur']?.toString().trim()
        const type = row['Type']?.toString().trim()
        const vendor = row['Constructeur']?.toString().trim()
        const model = row['Model']?.toString().trim()
        const acquisitionDate = parseDate(row["date d'acqusition"])
        const serialNumber = row['S/N']?.toString().trim()
        const machineName = row['Nom de machine']?.toString().trim() || `PC-${serialNumber}`
        const inventoryTicketRaw = row['Ticket inventaire']?.toString().toLowerCase().trim()
        const inventoryTicket = inventoryTicketRaw === 'oui' || inventoryTicketRaw === 'yes' || inventoryTicketRaw === '1' || inventoryTicketRaw === 'true'
        const screenInfo = row['ECRAN']?.toString().trim()
        const windowsVersion = row['version Windows']?.toString().trim()
        const warrantyDate = parseDate(row['Garantie'])
        const productKey = row['clé Produit']?.toString().trim()
        const cpuRamDiskRaw = row['CPU/RAM/Hard Drive']
        const inventoryCodeUC = row['Inventaire UC']?.toString().trim()
        const inventoryCodeScreen = row['Inventaire  Ecran']?.toString().trim()
        const screen1SN = row[' Ecran 1 :  S/N']?.toString().trim()
        const screen2SN = row[' Ecran 2 :  S/N']?.toString().trim()

        // Parser CPU/RAM/Disk
        const { cpu, ram, disk } = parseCpuRamDisk(cpuRamDiskRaw)

        // Déterminer la compagnie en fonction du service
        let companyId: string
        if (service.includes('Transglory')) {
          const tg: any = companyMap.get('Transglory Tunisie')
          if (!tg) {
            console.error(`❌ Compagnie Transglory Tunisie non trouvée`)
            errors++
            continue
          }
          companyId = tg.id
        } else if (service.includes('Green')) {
          const gt: any = companyMap.get('Green Tunisie')
          if (!gt) {
            console.error(`❌ Compagnie Green Tunisie non trouvée`)
            errors++
            continue
          }
          companyId = gt.id
        } else {
          console.warn(`⚠️  Service non reconnu: ${service}, utilisation de la première compagnie`)
          companyId = companies[0].id
        }

        // Chercher ou créer l'utilisateur si un nom est fourni
        let userId: string | null = null
        if (userName) {
          // Essayer de parser le nom (format: "Prénom Nom")
          const nameParts = userName.split(' ')
          const firstName = nameParts[0] || ''
          const lastName = nameParts.slice(1).join(' ') || ''
          
          // Générer un email temporaire
          const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@temp.com`.replace(/\s+/g, '')
          
          // Chercher l'utilisateur existant
          let user = await prisma.user.findFirst({
            where: {
              firstName: firstName,
              lastName: lastName,
              companyId: companyId,
            }
          })

          // Créer l'utilisateur s'il n'existe pas
          if (!user) {
            user = await prisma.user.create({
              data: {
                email: email,
                firstName: firstName,
                lastName: lastName,
                companyId: companyId,
                role: 'user',
                department: service,
              }
            })
            console.log(`   ✅ Utilisateur créé: ${firstName} ${lastName}`)
          } else {
            console.log(`   ℹ️  Utilisateur existant: ${firstName} ${lastName}`)
          }

          userId = user.id
        }

        // Créer la machine si on a les données nécessaires
        if (serialNumber && type) {
          // Vérifier si la machine existe déjà
          const existingMachine = await prisma.machine.findFirst({
            where: { serialNumber: serialNumber }
          })

          if (existingMachine) {
            console.log(`   ⚠️  Machine ${serialNumber} existe déjà, on la met à jour`)
            await prisma.machine.update({
              where: { id: existingMachine.id },
              data: {
                machineName: machineName,
                type: type,
                vendor: vendor || undefined,
                model: model || undefined,
                acquisitionDate: acquisitionDate || new Date(),
                windowsVersion: windowsVersion || undefined,
                productKey: productKey || undefined,
                cpu: cpu || undefined,
                ram: ram || undefined,
                disk: disk || undefined,
                inventoryTicket: inventoryTicket,
                warrantyDate: warrantyDate || undefined,
                inventoryCode: inventoryCodeUC || undefined,
                userId: userId || undefined,
                companyId: companyId,
                assetStatus: userId ? 'affecte' : 'en_stock',
              }
            })
          } else {
            const machine = await prisma.machine.create({
              data: {
                serialNumber: serialNumber,
                machineName: machineName,
                type: type,
                vendor: vendor || undefined,
                model: model || undefined,
                acquisitionDate: acquisitionDate || new Date(),
                windowsVersion: windowsVersion || undefined,
                productKey: productKey || undefined,
                cpu: cpu || undefined,
                ram: ram || undefined,
                disk: disk || undefined,
                inventoryTicket: inventoryTicket,
                warrantyDate: warrantyDate || undefined,
                inventoryCode: inventoryCodeUC || `M${Date.now()}`,
                userId: userId || undefined,
                companyId: companyId,
                assetStatus: userId ? 'affecte' : 'en_stock',
              }
            })
            console.log(`   ✅ Machine créée: ${serialNumber}`)
          }
        }

        // Créer les écrans
        const screenSerialNumbers = [screen1SN, screen2SN].filter(Boolean)
        for (const screenSN of screenSerialNumbers) {
          if (screenSN) {
            const existingScreen = await prisma.screen.findFirst({
              where: { serialNumber: screenSN }
            })

            if (existingScreen) {
              console.log(`   ⚠️  Écran ${screenSN} existe déjà`)
            } else {
              await prisma.screen.create({
                data: {
                  serialNumber: screenSN,
                  brand: vendor || 'Unknown',
                  model: screenInfo || undefined,
                  inventoryCode: inventoryCodeScreen || `S${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  companyId: companyId,
                  userId: userId || undefined,
                }
              })
              console.log(`   ✅ Écran créé: ${screenSN}`)
            }
          }
        }

        created++
        
      } catch (error) {
        console.error(`❌ Erreur ligne ${i + 1}:`, error)
        errors++
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log(`✅ Importation terminée: ${created} lignes traitées, ${errors} erreurs`)
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'importation:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Utilisation
const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('Usage: ts-node import-excel-data.ts <chemin-vers-fichier.xlsx>')
  process.exit(1)
}

const filePath = path.resolve(args[0])
importExcelData(filePath)
