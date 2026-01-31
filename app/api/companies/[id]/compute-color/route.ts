import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import path from 'path'
import fs from 'fs'
import Jimp from 'jimp'

async function computeAverageColorFromPath(logoPath: string) {
  const full = path.join(process.cwd(), 'public', logoPath)
  if (!fs.existsSync(full)) return null
  const img = await Jimp.read(full)
  img.resize(40, 40)
  let r = 0, g = 0, b = 0, count = 0
  for (let x = 0; x < img.bitmap.width; x++) {
    for (let y = 0; y < img.bitmap.height; y++) {
      const rgba = Jimp.intToRGBA(img.getPixelColor(x, y))
      if (rgba.a === 0) continue
      // skip near-white pixels
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
  const toHex = (v: number) => v.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const company = await prisma.company.findUnique({ where: { id: params.id } })
    if (!company) return NextResponse.json({ error: 'Société introuvable' }, { status: 404 })
    if (!company.logoPath) return NextResponse.json({ error: 'Aucun logo disponible' }, { status: 400 })

    const color = await computeAverageColorFromPath(company.logoPath)
    if (!color) return NextResponse.json({ error: 'Impossible de calculer la couleur' }, { status: 500 })

    return NextResponse.json({ color })
  } catch (err) {
    console.error('Erreur compute-color:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
