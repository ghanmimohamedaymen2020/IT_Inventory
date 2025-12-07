import { prisma } from './db'

export type AssetType = 'ASSET' | 'SCREEN' | 'PERIPH'

/**
 * Génère un code inventaire unique au format: IT-{TYPE}-{COMPANY}-{SEQ}
 * Exemple: IT-ASSET-ABC-0001
 */
export async function generateInventoryCode(
  companyCode: string,
  assetType: AssetType
): Promise<string> {
  // Récupérer ou créer la séquence pour cette compagnie + type
  const sequence = await prisma.inventorySequence.upsert({
    where: {
      companyCode_assetType: {
        companyCode,
        assetType,
      },
    },
    update: {
      lastNumber: {
        increment: 1,
      },
    },
    create: {
      companyCode,
      assetType,
      lastNumber: 1,
    },
  })

  // Formater le code avec padding de 4 chiffres
  const seqNumber = sequence.lastNumber.toString().padStart(4, '0')
  return `IT-${assetType}-${companyCode}-${seqNumber}`
}

/**
 * Valide le format d'un code inventaire
 */
export function validateInventoryCode(code: string): boolean {
  const pattern = /^IT-(ASSET|SCREEN|PERIPH)-[A-Z]{2,4}-\d{4}$/
  return pattern.test(code)
}

/**
 * Parse un code inventaire pour extraire ses composants
 */
export function parseInventoryCode(code: string): {
  type: string
  companyCode: string
  sequence: number
} | null {
  const match = code.match(/^IT-(ASSET|SCREEN|PERIPH)-([A-Z]{2,4})-(\d{4})$/)
  if (!match) return null

  return {
    type: match[1],
    companyCode: match[2],
    sequence: parseInt(match[3], 10),
  }
}
