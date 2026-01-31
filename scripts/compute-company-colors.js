const { PrismaClient } = require('@prisma/client')
const Jimp = require('jimp')
const path = require('path')
const fs = require('fs')

async function computeAverageHex(logoFullPath) {
  const img = await Jimp.read(logoFullPath)
  img.resize(40, 40)
  let r = 0, g = 0, b = 0, count = 0
  for (let x = 0; x < img.bitmap.width; x++) {
    for (let y = 0; y < img.bitmap.height; y++) {
      const rgba = Jimp.intToRGBA(img.getPixelColor(x, y))
      if (rgba.a === 0) continue
      // skip near-white
      if (rgba.r > 245 && rgba.g > 245 && rgba.b > 245) continue
      r += rgba.r
      g += rgba.g
      b += rgba.b
      count++
    }
  }
  if (count === 0) return null
  r = Math.round(r / count)
  g = Math.round(g / count)
  b = Math.round(b / count)
  const toHex = v => v.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

async function main() {
  const prisma = new PrismaClient()
  try {
    const companies = await prisma.company.findMany({ where: { logoPath: { not: null } } })
    console.log(`Found ${companies.length} companies with logoPath.`)
    for (const c of companies) {
      try {
        const logoPath = path.join(process.cwd(), 'public', c.logoPath)
        if (!fs.existsSync(logoPath)) {
          console.warn(`Logo file missing for company ${c.id}: ${c.logoPath}`)
          continue
        }
        process.stdout.write(`Computing for ${c.id} (${c.name})... `)
        const hex = await computeAverageHex(logoPath)
        if (!hex) {
          console.warn('no color')
          continue
        }
        await prisma.company.update({ where: { id: c.id }, data: { primaryColor: hex, primaryColorAuto: true } })
        console.log(`saved ${hex}`)
      } catch (err) {
        console.error('failed for', c.id, err)
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
