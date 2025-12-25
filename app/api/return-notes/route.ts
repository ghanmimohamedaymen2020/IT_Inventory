
import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { auth } from "@/lib/auth"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import jsPDF from "jspdf"
import fs from "fs"
import path from "path"
import Jimp from "jimp"

// Color extraction helper (function, not top-level code)
async function extractDominantColorsFromImage(imgPath: string, k = 3, sampleLimit = 1500) {
  try {
    const img = await Jimp.read(imgPath)
    img.resize(40, 40)
    const pixels: number[][] = []
    for (let x = 0; x < img.bitmap.width; x++) {
      for (let y = 0; y < img.bitmap.height; y++) {
        const rgba = Jimp.intToRGBA(img.getPixelColor(x, y))
        if (rgba.a === 0) continue
        if (rgba.r > 240 && rgba.g > 240 && rgba.b > 240) continue
        pixels.push([rgba.r, rgba.g, rgba.b])
      }
    }
    if (pixels.length === 0) return null
    let sample = pixels
    if (pixels.length > sampleLimit) {
      const step = Math.max(1, Math.floor(pixels.length / sampleLimit))
      sample = pixels.filter((_, i) => i % step === 0).slice(0, sampleLimit)
    }
    const centers: number[][] = []
    const used = new Set<number>()
    while (centers.length < k && used.size < sample.length) {
      const idx = Math.floor(Math.random() * sample.length)
      if (!used.has(idx)) {
        used.add(idx)
        centers.push(sample[idx].slice())
      }
    }
    const maxIter = 8
    for (let iter = 0; iter < maxIter; iter++) {
      const sums = Array(centers.length).fill(0).map(() => [0, 0, 0])
      const counts = Array(centers.length).fill(0)
      for (const p of sample) {
        let best = 0
        let bestDist = Infinity
        for (let c = 0; c < centers.length; c++) {
          const dx = p[0] - centers[c][0]
          const dy = p[1] - centers[c][1]
          const dz = p[2] - centers[c][2]
          const d = dx * dx + dy * dy + dz * dz
          if (d < bestDist) {
            bestDist = d
            best = c
          }
        }
        sums[best][0] += p[0]
        sums[best][1] += p[1]
        sums[best][2] += p[2]
        counts[best]++
      }
      let moved = false
      for (let c = 0; c < centers.length; c++) {
        if (counts[c] === 0) continue
        const nr = Math.round(sums[c][0] / counts[c])
        const ng = Math.round(sums[c][1] / counts[c])
        const nb = Math.round(sums[c][2] / counts[c])
        if (nr !== centers[c][0] || ng !== centers[c][1] || nb !== centers[c][2]) {
          centers[c] = [nr, ng, nb]
          moved = true
        }
      }
      if (!moved) break
    }
    const finalCounts = Array(centers.length).fill(0)
    for (const p of sample) {
      let best = 0
      let bestDist = Infinity
      for (let c = 0; c < centers.length; c++) {
        const dx = p[0] - centers[c][0]
        const dy = p[1] - centers[c][1]
        const dz = p[2] - centers[c][2]
        const d = dx * dx + dy * dy + dz * dz
        if (d < bestDist) {
          bestDist = d
          best = c
        }
      }
      finalCounts[best]++
    }
    const clusters = centers.map((c, i) => ({ center: c, count: finalCounts[i] }))
    clusters.sort((a, b) => b.count - a.count)
    return clusters.map(c => c.center)
  } catch (err) {
    console.warn('extractDominantColorsFromImage failed', imgPath, err)
    return null
  }
}

const prisma = new PrismaClient()

async function getDevSession() {
  const cookieStore = await cookies()
  const devSession = cookieStore.get('dev-session')
  
  if (!devSession) return null
  
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "secret")
    const { payload } = await jwtVerify(devSession.value, secret)
    return {
      user: {
        id: payload.sub as string,
        email: payload.email as string,
        role: payload.role as string,
        companyId: payload.companyId as string,
      }
    }
  } catch (error) {
    return null
  }
}

async function resolveSession() {
  const devSession = await getDevSession()
  if (devSession?.user) {
    return devSession
  }

  const nextAuthSession = await auth()
  if (nextAuthSession?.user) {
    return nextAuthSession
  }

  return null
}

export async function GET() {
  try {
    const returnNotes = await prisma.returnNote.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        equipments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ returnNotes })
  } catch (error) {
    console.error("Erreur lors de la récupération des bons de retour:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des bons de retour" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(req: Request) {
  try {
    const session = await resolveSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await req.json()
    const { returnDate, returnedByUserId, reason, destination, notes, equipments } = body

    if (!returnedByUserId || !destination || !equipments || equipments.length === 0) {
      return NextResponse.json(
        { error: "Données manquantes" },
        { status: 400 }
      )
    }

    // Validation: prevent duplicate equipments in the same return note (by serialNumber or inventoryCode)
    const seenKeys = new Set()
    const dupes: string[] = []
    for (const e of equipments) {
      const key = (e.serialNumber || '').toString().trim() || (e.inventoryCode || '').toString().trim()
      if (!key) continue
      if (seenKeys.has(key)) {
        dupes.push(key)
      } else {
        seenKeys.add(key)
      }
    }
    if (dupes.length > 0) {
      const uniqueDupes = Array.from(new Set(dupes))
      return NextResponse.json({ error: `Doublons détectés dans la liste d'équipements: ${uniqueDupes.join(', ')}` }, { status: 400 })
    }

    // Récupérer l'utilisateur qui retourne les équipements
    const returnedByUser = await prisma.user.findUnique({
      where: { id: returnedByUserId },
      include: {
        company: true,
      },
    })

    if (!returnedByUser) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    let company = returnedByUser.company

    if (!company) {
      // Créer ou récupérer une compagnie par défaut et rattacher l'utilisateur
      console.warn(`POST /api/return-notes: user ${returnedByUser.id} has no company. Creating default company.`);

      let defaultCompany = await prisma.company.findFirst({ where: { name: 'Compagnie par défaut' } })
      if (!defaultCompany) {
        defaultCompany = await prisma.company.create({ data: { name: 'Compagnie par défaut', code: 'DEFAULT' } })
      }

      try {
        await prisma.user.update({ where: { id: returnedByUser.id }, data: { companyId: defaultCompany.id } })
      } catch (err) {
        console.error('Erreur rattachement compagnie par défaut à l\'utilisateur:', err)
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
      }

      company = defaultCompany
    }

    // Ensure the session user exists in DB — if not, fall back to returnedByUser as creator
    let creatorId = session.user.id
    const creatorUser = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!creatorUser) {
      console.warn(`Session user ${session.user.id} not found; using returnedByUser as creator`);
      creatorId = returnedByUser.id
    }

    // Générer un numéro de bon de retour séquentiel
    const year = new Date().getFullYear()
    
    const sequence = await prisma.returnNoteSequence.upsert({
      where: { 
        year: year
      },
      create: { 
        year: year,
        lastNumber: 1
      },
      update: { 
        lastNumber: { increment: 1 } 
      }
    })
    
    const noteNumber = `BR-${year}-${String(sequence.lastNumber).padStart(4, '0')}`

    // Créer le bon de retour avec les équipements
    const returnNote = await prisma.returnNote.create({
      data: {
        noteNumber,
        returnDate: returnDate ? new Date(returnDate) : new Date(),
        returnedBy: `${returnedByUser.firstName} ${returnedByUser.lastName}`,
        reason: reason || null,
        destination,
        notes: notes || null,
        companyId: company.id,
        createdById: creatorId,
        equipments: {
          create: equipments.map((eq: any) => ({
            type: eq.type,
            serialNumber: eq.serialNumber,
            brand: eq.brand || null,
            model: eq.model || null,
            inventoryCode: eq.inventoryCode || null,
            previousUser: eq.previousUser || null,
            condition: eq.condition || null,
          })),
        },
      },
      include: {
        equipments: true,
        createdBy: true,
      },
    })

    // Mettre à jour le statut des équipements selon la destination
    const destToStatus = (dest: string) => {
      const d = String(dest || '').toLowerCase()
      if (d === 'reparation' || d === 'réparation') return 'maintenance'
      if (d === 'rebut') return 'retiré'
      return 'en_stock'
    }

    const targetStatus = destToStatus(destination)

    for (const equipment of equipments) {
      const t = String(equipment.type || '').toLowerCase()
      const screenTypes = ['screen', 'écran', 'ecran']

      if (screenTypes.includes(t)) {
        // Mettre à jour l'écran (prise en charge des variantes FR/EN)
        await prisma.screen.updateMany({
          where: { serialNumber: equipment.serialNumber },
          data: {
            userId: null,
            assetStatus: targetStatus,
          },
        })
      } else {
        // Par défaut, traiter comme une machine (Desktop, Laptop, Machine, etc.)
        await prisma.machine.updateMany({
          where: { serialNumber: equipment.serialNumber },
          data: {
            assetStatus: targetStatus,
            userId: null, // Désassigner l'utilisateur
          },
        })
      }
    }

    // Générer le PDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 15
    let yPos = margin

    // Charger le logo si disponible
    let logoBase64 = null
    let logoFormat = "PNG"
    let primaryColor = [26, 35, 126]
    let accentColor = [33, 150, 243]

    if (company.logoPath) {
      try {
        const logoPath = path.join(process.cwd(), "public", company.logoPath)
        if (fs.existsSync(logoPath)) {
          const logoData = fs.readFileSync(logoPath)
          logoBase64 = logoData.toString("base64")
          const logoExt = path.extname(company.logoPath).toLowerCase()
          logoFormat = logoExt === ".png" ? "PNG" : "JPEG"

          // Try to load a sidecar color file next to the logo
          const logoBase = company.logoPath.replace(/\.[^/.]+$/, "")
          const sidecarPath = path.join(process.cwd(), "public", `${logoBase}.color.json`)
          let colorsResolved = false
          if (fs.existsSync(sidecarPath)) {
            try {
              const raw = fs.readFileSync(sidecarPath, "utf8")
              const parsed = JSON.parse(raw)
              if (parsed.primary && parsed.accent && Array.isArray(parsed.primary) && Array.isArray(parsed.accent)) {
                primaryColor = parsed.primary
                accentColor = parsed.accent
                colorsResolved = true
              } else if (parsed.color && typeof parsed.color === 'string') {
                const hex = parsed.color.replace(/^#/, '')
                if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
                  const r = parseInt(hex.substring(0,2), 16)
                  const g = parseInt(hex.substring(2,4), 16)
                  const b = parseInt(hex.substring(4,6), 16)
                  primaryColor = [r,g,b]
                  accentColor = [Math.min(255, r + 40), Math.min(255, g + 40), Math.min(255, b + 40)]
                  colorsResolved = true
                }
              }
            } catch (err) {
              console.warn('Impossible de parser la sidecar couleur:', sidecarPath, err)
            }
          }

          if (!colorsResolved) {
            try {
              const img = await Jimp.read(logoPath)
              img.resize(20, 20)
              let r = 0, g = 0, b = 0, count = 0
              for (let x = 0; x < img.bitmap.width; x++) {
                for (let y = 0; y < img.bitmap.height; y++) {
                  const rgba = Jimp.intToRGBA(img.getPixelColor(x, y))
                  // ignore fully transparent pixels
                  if (rgba.a === 0) continue
                  // ignore near-white pixels (likely background)
                  if (rgba.r > 240 && rgba.g > 240 && rgba.b > 240) continue
                  r += rgba.r
                  g += rgba.g
                  b += rgba.b
                  count++
                }
              }
              if (count > 0) {
                const avgR = Math.round(r / count)
                const avgG = Math.round(g / count)
                const avgB = Math.round(b / count)
                primaryColor = [avgR, avgG, avgB]
                accentColor = [Math.min(255, avgR + 40), Math.min(255, avgG + 40), Math.min(255, avgB + 40)]
                colorsResolved = true
              }
            } catch (err) {
              console.warn('Extraction couleur automatique impossible pour', logoPath, err)
            }
          }

          if (!colorsResolved) {
            const companyColors: { [key: string]: { primary: number[], accent: number[] } } = {
              'GREEN': { primary: [27, 94, 32], accent: [76, 175, 80] },
              'TRANS': { primary: [13, 71, 161], accent: [33, 150, 243] },
            }

            if (company.code && companyColors[company.code]) {
              primaryColor = companyColors[company.code].primary
              accentColor = companyColors[company.code].accent
            }
            // Explicit override for Transglory: ensure black primary + red accent
            if (company.code) {
              const code = company.code.toUpperCase();
              if (code === 'TRANS') {
                primaryColor = [0, 0, 0];
                accentColor = [220, 18, 18];
                colorsResolved = true;
              }
            }
              // FINAL ENFORCEMENT: For TRTU, force all colors to solid Transglory blue after all color logic
              if (company.code && company.code.toUpperCase() === 'TRTU') {
                primaryColor = [26, 35, 126];
                accentColor = [26, 35, 126];
              }
          }
        }
      } catch (error) {
        console.error("Erreur chargement logo:", error)
      }
    }

    // En-tête
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, pageWidth, 55, "F")

    if (logoBase64) {
      try {
        doc.addImage(`data:image/${logoFormat.toLowerCase()};base64,${logoBase64}`, logoFormat, margin, margin, 55, 25)
      } catch (error) {
        console.error("Erreur ajout logo:", error)
      }
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(20)
    // Force header text color for all companies (no mixing)
    if (company.code) {
      const code = company.code.toUpperCase();
      // Add more company codes/colors here as needed
      const companyColors: Record<string, [number, number, number]> = {
        'TRTU': [26, 35, 126], // Transglory blue
        'GRTU': [27, 94, 32],  // Green Tunisie
        // Add more: 'CODE': [R, G, B]
      };
      if (Object.prototype.hasOwnProperty.call(companyColors, code)) {
        const c = companyColors[code as keyof typeof companyColors] as [number, number, number]
        doc.setTextColor(c[0], c[1], c[2]);
      } else {
        doc.setTextColor(33, 150, 243); // Default blue
      }
    } else {
      doc.setTextColor(33, 150, 243); // Default blue
    }
    doc.text("BON DE RETOUR", pageWidth - margin, margin + 8, { align: "right" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`N° ${noteNumber}`, pageWidth - margin, margin + 15, { align: "right" })

    const currentDate = new Date(returnNote.returnDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    const currentTime = new Date(returnNote.returnDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    doc.text(`${currentDate} - ${currentTime}`, pageWidth - margin, margin + 21, { align: "right" })

    // Ligne de séparation colorée (no mixing)
    if (company.code) {
      const code = company.code.toUpperCase();
      const companyColors = {
        'TRTU': [26, 35, 126],
        'GRTU': [27, 94, 32],
        // Add more: 'CODE': [R, G, B]
      };
      if (Object.prototype.hasOwnProperty.call(companyColors, code)) {
        const c = companyColors[code as keyof typeof companyColors] as [number, number, number]
        doc.setDrawColor(c[0], c[1], c[2]);
      } else {
        doc.setDrawColor(33, 150, 243); // Default blue
      }
    } else {
      doc.setDrawColor(33, 150, 243); // Default blue
    }
    doc.setLineWidth(2)
    doc.line(margin, 48, pageWidth - margin, 48)

    yPos = 58

    // === INFORMATIONS EN DEUX COLONNES ===
    const colWidth = (pageWidth - 3 * margin) / 2

    // COLONNE GAUCHE - Société
    doc.setFillColor(248, 249, 250)
    doc.roundedRect(margin, yPos, colWidth, 32, 3, 3, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text("DE", margin + 5, yPos + 6)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text(company.name || "", margin + 5, yPos + 13)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    if (company.code) {
      doc.text(`Code: ${company.code}`, margin + 5, yPos + 20)
    }

    // COLONNE DROITE - Retourné par
    doc.setFillColor(248, 249, 250)
    doc.roundedRect(pageWidth / 2 + margin / 2, yPos, colWidth, 32, 3, 3, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text("RETOURNÉ PAR", pageWidth / 2 + margin / 2 + 5, yPos + 6)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text(returnNote.returnedBy, pageWidth / 2 + margin / 2 + 5, yPos + 13)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    doc.text(`Destination: ${destination.toUpperCase()}`, pageWidth / 2 + margin / 2 + 5, yPos + 20)
    if (reason) {
      doc.text(`Raison: ${reason}`, pageWidth / 2 + margin / 2 + 5, yPos + 27)
    }

    yPos += 40

    // === TABLEAU DES ÉQUIPEMENTS ===
    // En-tête du tableau (no mixing)
    if (company.code) {
      const code = company.code.toUpperCase();
      const companyColors = {
        'TRTU': [26, 35, 126],
        'GRTU': [27, 94, 32],
        // Add more: 'CODE': [R, G, B]
      };
      if (Object.prototype.hasOwnProperty.call(companyColors, code)) {
        const c = companyColors[code as keyof typeof companyColors] as [number, number, number]
        doc.setFillColor(c[0], c[1], c[2]);
      } else {
        doc.setFillColor(33, 150, 243); // Default blue
      }
    } else {
      doc.setFillColor(33, 150, 243); // Default blue
    }
    doc.rect(margin, yPos, pageWidth - 2 * margin, 10, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)

    // Compute column widths: #, TYPE, SN, Code Inv., DETAILS (match delivery note proportions)
    const tableWidth = pageWidth - 2 * margin
    const colIndexW = Math.max(10, Math.round(tableWidth * 0.05))
    // make type smaller so DETAILS gets more space (match delivery note)
    const colTypeW = Math.max(28, Math.round(tableWidth * 0.14))
    const colSNW = Math.max(36, Math.round(tableWidth * 0.13))
    const colInvW = Math.max(36, Math.round(tableWidth * 0.13))
    const colDetailsW = tableWidth - (colIndexW + colTypeW + colSNW + colInvW)

    const xIndex = margin
    const xType = xIndex + colIndexW
    const xSN = xType + colTypeW
    const xInv = xSN + colSNW
    const xDetails = xInv + colInvW

    doc.text("#", xIndex + 3, yPos + 6.5)
    doc.text("TYPE", xType + 2, yPos + 6.5)
    doc.text("NUMÉRO DE SÉRIE", xSN + 2, yPos + 6.5)
    doc.text("Code inventaire", xInv + 2, yPos + 6.5)
    doc.text("DÉTAILS", xDetails + 2, yPos + 6.5)

    yPos += 10

    for (let index = 0; index < returnNote.equipments.length; index++) {
      const eq = returnNote.equipments[index]
      const serialText = eq.serialNumber || ''
      const invText = eq.inventoryCode ? String(eq.inventoryCode) : ''

      const brand = eq.brand || ''
      const model = eq.model || ''
      // Try to enrich with Machine data when possible
      let machineData: any = null
      if (eq.type === 'machine') {
        try {
          machineData = await prisma.machine.findUnique({ where: { serialNumber: eq.serialNumber } })
        } catch (err) {
          console.warn('Unable to fetch machine for return-note PDF enrichment', eq.serialNumber, err)
        }
      }

      // Build labelled specs lines (RAM / CPU / Disk) using machine data first, fallback to eq fields
      const detailsPieces: Array<{ type: 'text' | 'spec', text?: string, label?: string, value?: string }> = []
      const detailsMain = [brand, model].filter(Boolean).join(' ')
      if (detailsMain) detailsPieces.push({ type: 'text', text: detailsMain })

      const ramVal = (machineData && machineData.ram) ? machineData.ram : ((eq as any).ram || null)
      const cpuVal = (machineData && machineData.cpu) ? machineData.cpu : ((eq as any).cpu || null)
      const diskVal = (machineData && machineData.disk) ? machineData.disk : ((eq as any).disk || null)

      if (ramVal) detailsPieces.push({ type: 'spec', label: 'RAM', value: ramVal })
      if (cpuVal) detailsPieces.push({ type: 'spec', label: 'CPU', value: cpuVal })
      if (diskVal) detailsPieces.push({ type: 'spec', label: 'Disk', value: diskVal })

      const paddingV = 6
      const lineH = 5.2
      const serialLines = doc.splitTextToSize(serialText, Math.max(30, colSNW - 10))
      const invLines = doc.splitTextToSize(invText, Math.max(30, colInvW - 10))

      const detailsVisualLines: string[] = []
      for (const piece of detailsPieces) {
        if (piece.type === 'text' && piece.text) {
          const wrapped = doc.splitTextToSize(piece.text, Math.max(60, colDetailsW - 12))
          if (Array.isArray(wrapped)) detailsVisualLines.push(...wrapped)
          else detailsVisualLines.push(String(wrapped))
        } else if (piece.type === 'spec' && piece.label && piece.value) {
          const labelWidth = doc.getTextWidth(`${piece.label}: `)
          const available = Math.max(40, colDetailsW - 12 - labelWidth)
          const wrappedValue = doc.splitTextToSize(piece.value, available)
          if (Array.isArray(wrappedValue)) {
            detailsVisualLines.push(`${piece.label}: ${wrappedValue[0]}`)
            for (let i = 1; i < wrappedValue.length; i++) detailsVisualLines.push(`  ${wrappedValue[i]}`)
          } else {
            detailsVisualLines.push(`${piece.label}: ${wrappedValue}`)
          }
        }
      }

      const maxLines = Math.max(serialLines.length, invLines.length, detailsVisualLines.length || 1, 1)
      const rowHeight = Math.max(18, maxLines * lineH + paddingV * 2)

      if (yPos + rowHeight > 270) {
        doc.addPage()
        yPos = margin
      }

      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, yPos, tableWidth, rowHeight, "F")
      }

      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.1)
      doc.line(margin, yPos + rowHeight, pageWidth - margin, yPos + rowHeight)

      const textY = yPos + paddingV + lineH

      // Index
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.text(`${index + 1}`, xIndex + 3, textY)

      // Type (prefer specific machine subtype when available)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const computeDisplayType = (rawType: any, machine?: any) => {
        if (machine && machine.type) {
          const t = machine.type.toString().toLowerCase()
          switch (t) {
            case 'laptop': return 'Portable'
            case 'desktop': return 'Bureau'
            case 'server': return 'Serveur'
            case 'workstation': return 'Station de travail'
            default: return t.charAt(0).toUpperCase() + t.slice(1)
          }
        }
        if (!rawType) return ''
        if (rawType === 'machine') return 'Machine'
        if (rawType === 'screen' || rawType === 'Écran') return 'Écran'
        return rawType.toString().charAt(0).toUpperCase() + rawType.toString().slice(1)
      }

      const displayType = computeDisplayType(eq.type, machineData)
      doc.text(displayType, xType + 2, textY)

      // Serial
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      serialLines.forEach((ln: string, i: number) => {
        doc.text(ln, xSN + 2, textY + i * lineH)
      })

      // Inventory
      invLines.forEach((ln: string, i: number) => {
        doc.text(ln, xInv + 2, textY + i * lineH)
      })

      // Details — render brand/model and labelled specs with bold labels
      doc.setFontSize(8)
      const detailsStartX = xDetails + 2
      for (let i = 0; i < detailsVisualLines.length; i++) {
        const ln = detailsVisualLines[i]
        const specMatch = ln.match(/^([A-Za-z]+:)\s*(.*)$/)
        if (specMatch) {
          const label = specMatch[1]
          const rest = specMatch[2]
          doc.setFont("helvetica", "bold")
          doc.setTextColor(0, 0, 0)
          doc.text(label, detailsStartX, textY + i * lineH)
          const lw = doc.getTextWidth(label + ' ')
          doc.setFont("helvetica", "normal")
          doc.setTextColor(100, 100, 100)
          doc.text(rest, detailsStartX + lw, textY + i * lineH)
        } else {
          doc.setFont("helvetica", "normal")
          doc.setTextColor(100, 100, 100)
          doc.text(ln, detailsStartX, textY + i * lineH)
        }
      }

      yPos += rowHeight + 2
    }

    // Notes
    if (notes) {
      yPos += 10
      if (yPos > 250) {
        doc.addPage()
        yPos = margin
      }
      
      doc.setFillColor(250, 250, 250)
      doc.rect(margin, yPos - 3, pageWidth - 2 * margin, 5, "F")
      
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.text("REMARQUES", margin + 2, yPos + 2)
      yPos += 8
      
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
      const splitNotes = doc.splitTextToSize(notes, pageWidth - 2 * margin - 4)
      doc.text(splitNotes, margin + 2, yPos)
      yPos += splitNotes.length * 5 + 5
    }

    // === ZONE DE SIGNATURES ===
    const pageHeight = doc.internal.pageSize.getHeight()
    if (yPos > pageHeight - 60) {
      doc.addPage()
      yPos = margin + 10
    }

    yPos += 10

    // Ligne de séparation
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 10

    const signatureColWidth = (pageWidth - 2 * margin) / 2

    // SIGNATURE ÉMETTEUR (celui qui retourne)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text("Signature de l'émetteur", margin, yPos)

    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.3)
    doc.line(margin, yPos + 18, margin + signatureColWidth - 10, yPos + 18)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text("Date: ___/___/______", margin, yPos + 23)

    // SIGNATURE RÉCEPTIONNAIRE (celui qui reçoit le retour)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text("Signature du réceptionnaire", pageWidth / 2 + margin / 2, yPos)

    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.3)
    doc.line(pageWidth / 2 + margin / 2, yPos + 18, pageWidth - margin, yPos + 18)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text("Date: ___/___/______", pageWidth / 2 + margin / 2, yPos + 23)

    // Pied de page
    const pageCount = doc.internal.pages.length - 1
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      
      // Ligne de séparation
      doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
      doc.setLineWidth(1.5)
      doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18)

      // Informations
      doc.setFontSize(7)
      doc.setTextColor(100, 100, 100)
      doc.setFont("helvetica", "italic")
      const footerText = `Document généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
      doc.text(footerText, pageWidth / 2, pageHeight - 12, { align: "center" })

      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.text(company.name, pageWidth / 2, pageHeight - 6, { align: "center" })
      
      // Numéro de page (en haut à droite aussi)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Page ${i}/${pageCount}`,
        pageWidth - margin,
        doc.internal.pageSize.getHeight() - 10,
        { align: "right" }
      )
    }

    // Sauvegarder le PDF
    const fileName = `${noteNumber}.pdf`
    const publicDir = path.join(process.cwd(), "public", "return-notes")
    
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }

    const filePath = path.join(publicDir, fileName)
    fs.writeFileSync(filePath, Buffer.from(doc.output("arraybuffer")))

    // Mettre à jour le bon de retour avec le chemin du PDF
    await prisma.returnNote.update({
      where: { id: returnNote.id },
      data: { pdfPath: `/return-notes/${fileName}` }
    })

    return NextResponse.json({ 
      returnNote: {
        ...returnNote,
        pdfPath: `/return-notes/${fileName}`
      },
      pdfUrl: `/return-notes/${fileName}`
    }, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de la création du bon de retour:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du bon de retour" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
