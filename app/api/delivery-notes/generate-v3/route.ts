import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import jsPDF from "jspdf"
import fs from "fs"
import path from "path"
import Jimp from "jimp"

// Small k-means based dominant color extractor (returns array of RGB arrays)
async function extractDominantColorsFromImage(imgPath: string, k = 3, sampleLimit = 1500) {
  try {
    const img = await Jimp.read(imgPath)
    img.resize(40, 40)

    const pixels: number[][] = []
    for (let x = 0; x < img.bitmap.width; x++) {
      for (let y = 0; y < img.bitmap.height; y++) {
        const rgba = Jimp.intToRGBA(img.getPixelColor(x, y))
        if (rgba.a === 0) continue
        // ignore near-white
        if (rgba.r > 240 && rgba.g > 240 && rgba.b > 240) continue
        pixels.push([rgba.r, rgba.g, rgba.b])
      }
    }

    if (pixels.length === 0) return null

    // downsample if necessary
    let sample = pixels
    if (pixels.length > sampleLimit) {
      const step = Math.max(1, Math.floor(pixels.length / sampleLimit))
      sample = pixels.filter((_, i) => i % step === 0).slice(0, sampleLimit)
    }

    // init centers randomly
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
        // nearest center
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

    // compute final counts
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, equipments, notes } = body

    if (!userId || !equipments || equipments.length === 0) {
      return NextResponse.json(
        { error: "Données manquantes" },
        { status: 400 }
      )
    }

    // Validation: prevent duplicate equipments in the same delivery (by serialNumber or inventoryCode)
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

    // Récupérer les informations de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    // Créer le PDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    let yPos = margin

    // Couleurs par défaut (bleu)
    let primaryColor = [26, 35, 126]
    let accentColor = [33, 150, 243]
    let logoBase64 = null
    let logoFormat = "PNG"

    // Charger et analyser le logo si disponible
    if (user.company?.logoPath) {
      try {
        const logoPath = path.join(process.cwd(), "public", user.company.logoPath)
        if (fs.existsSync(logoPath)) {
          const logoData = fs.readFileSync(logoPath)
          logoBase64 = logoData.toString("base64")
          const logoExt = path.extname(user.company.logoPath).toLowerCase()
          logoFormat = logoExt === ".png" ? "PNG" : "JPEG"

          // sidecar color file next to the logo (explicit override)
          const logoBase = user.company.logoPath.replace(/\.[^/.]+$/, "")
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

          // If no sidecar, try dominant color extraction (k-means)
          if (!colorsResolved) {
            try {
              const centers = await extractDominantColorsFromImage(logoPath, 3)
              if (centers && centers.length > 0) {
                primaryColor = centers[0].map((v: number) => Math.round(v))
                if (centers.length > 1) {
                  accentColor = centers[1].map((v: number) => Math.round(v))
                } else {
                  const [r, g, b] = primaryColor
                  accentColor = [Math.min(255, r + 40), Math.min(255, g + 40), Math.min(255, b + 40)]
                }
                colorsResolved = true
              }
            } catch (err) {
              console.warn('Dominant color extraction failed for', logoPath, err)
            }
          }

          // final fallback: map by company code (ensure GRTU mapping present)
          if (!colorsResolved) {
            const companyColors: { [key: string]: { primary: number[], accent: number[] } } = {
              'GRTU': { primary: [27, 94, 32], accent: [76, 175, 80] },
              'GREEN': { primary: [27, 94, 32], accent: [76, 175, 80] },
              'TRANS': { primary: [0, 0, 0], accent: [220, 18, 18] },
            }
            const codeKey = user.company?.code ? user.company.code.toUpperCase() : null
            if (codeKey && companyColors[codeKey]) {
              primaryColor = companyColors[codeKey].primary
              accentColor = companyColors[codeKey].accent
              colorsResolved = true
            }
          }

          // Explicit override for Transglory: ensure black primary + red accent
          if (user.company?.code) {
            const code = user.company.code.toUpperCase();
            if (code === 'TRANS') {
              primaryColor = [0, 0, 0];
              accentColor = [220, 18, 18];
              colorsResolved = true;
            }
            // Force TRTU to use solid Transglory blue everywhere (no mixing)
            if (code === 'TRTU') {
              // Transglory blue: #1A237E
              primaryColor = [26, 35, 126];
              accentColor = [26, 35, 126];
              colorsResolved = true;
            }
          }
        }
      } catch (error) {
        console.error("Erreur chargement logo:", error)
      }
    }

    // === EN-TÊTE MODERNE ===
    // Fond blanc pour tout l'en-tête
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, pageWidth, 55, "F")

    // Logo à gauche
    if (logoBase64) {
      try {
        doc.addImage(`data:image/${logoFormat.toLowerCase()};base64,${logoBase64}`, logoFormat, margin, margin, 55, 25)
      } catch (error) {
        console.error("Erreur ajout logo:", error)
      }
    }

    // Titre "BON DE LIVRAISON" à droite
    doc.setFont("helvetica", "bold")
    doc.setFontSize(20)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text("BON DE LIVRAISON", pageWidth - margin, margin + 8, { align: "right" })

    // Générer un numéro de BL séquentiel
    const timestamp = Date.now()
    const year = new Date().getFullYear()
    
    // Obtenir ou créer le compteur pour l'année en cours
    const sequence = await prisma.deliveryNoteSequence.upsert({
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
    
    const noteNumber = `BL-${year}-${String(sequence.lastNumber).padStart(4, '0')}`
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`N° ${noteNumber}`, pageWidth - margin, margin + 15, { align: "right" })

    // Date et heure
    const currentDate = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    const currentTime = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    doc.text(`${currentDate} - ${currentTime}`, pageWidth - margin, margin + 21, { align: "right" })

    // Ligne de séparation colorée
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
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

    if (user.company) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      doc.text(user.company.name, margin + 5, yPos + 13)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(80, 80, 80)
      doc.text(`Code: ${user.company.code}`, margin + 5, yPos + 20)
    }

    // COLONNE DROITE - Bénéficiaire
    doc.setFillColor(248, 249, 250)
    doc.roundedRect(pageWidth / 2 + margin / 2, yPos, colWidth, 32, 3, 3, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text("À", pageWidth / 2 + margin / 2 + 5, yPos + 6)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text(`${user.firstName} ${user.lastName}`, pageWidth / 2 + margin / 2 + 5, yPos + 13)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    doc.text(user.email, pageWidth / 2 + margin / 2 + 5, yPos + 20)

    if (user.office) {
      doc.text(`Bureau: ${user.office}`, pageWidth / 2 + margin / 2 + 5, yPos + 27)
    }

    yPos += 40

    // === TABLEAU DES ÉQUIPEMENTS ===
    // Header du tableau
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(margin, yPos, pageWidth - 2 * margin, 10, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)

    // Compute column widths: #, TYPE, SN, Code Inv., DETAILS
    const tableWidth = pageWidth - 2 * margin
    // Use proportional widths so DETAILS gets enough space on different page sizes
    const colIndexW = Math.max(10, Math.round(tableWidth * 0.05))
    // make type smaller so we can give more width to DETAILS
    const colTypeW = Math.max(28, Math.round(tableWidth * 0.14))
    // allow SN and inventory columns to be smaller on narrow pages
    const colSNW = Math.max(36, Math.round(tableWidth * 0.13))
    const colInvW = Math.max(36, Math.round(tableWidth * 0.13))
    const colDetailsW = tableWidth - (colIndexW + colTypeW + colSNW + colInvW)

    // Compute column X positions for accurate top-aligned rendering
    const xIndex = margin
    const xType = xIndex + colIndexW
    const xSN = xType + colTypeW
    const xInv = xSN + colSNW
    const xDetails = xInv + colInvW

    // Header labels (use computed X positions)
    doc.text("#", xIndex + 3, yPos + 6.5)
    doc.text("TYPE", xType + 2, yPos + 6.5)
    doc.text("NUMÉRO DE SÉRIE", xSN + 2, yPos + 6.5)
    doc.text("Code inventaire", xInv + 2, yPos + 6.5)
    doc.text("DÉTAILS", xDetails + 2, yPos + 6.5)

    yPos += 10

    // Pour chaque équipement (lignes du tableau)
    equipments.forEach((equipment: any, index: number) => {

      // Build SN and Inventory columns separately
      const serialText = equipment.serialNumber || ''
      const invText = equipment.inventoryCode ? String(equipment.inventoryCode) : ''

      // Build details: RAM — Processeur | OS | Disque (order requested)
      const brand = equipment.brand || ''
      const model = equipment.model || ''
      const specsArr: string[] = []
      if (equipment.foundData && 'machineName' in equipment.foundData) {
        const m = equipment.foundData
        if (m.ram) specsArr.push(m.ram)
        if (m.cpu) specsArr.push(m.cpu)
        if (m.windowsVersion) specsArr.push(m.windowsVersion)
        if (m.disk) specsArr.push(m.disk)
      }
      const specsText = specsArr.filter(Boolean).join(' | ')
      const detailsMain = [brand, model].filter(Boolean).join(' ')
      const detailsFull = specsText ? (detailsMain ? `${detailsMain} — ${specsText}` : specsText) : detailsMain

      // Split into wrapped lines for SN, Inv and Details
      const paddingV = 6
      const lineH = 5.2 // slightly larger line height for readability
      const serialLines = doc.splitTextToSize(serialText, Math.max(30, colSNW - 10))
      const invLines = doc.splitTextToSize(invText, Math.max(30, colInvW - 10))
      const detailsLines = doc.splitTextToSize(detailsFull || '', Math.max(60, colDetailsW - 12))
      const maxLines = Math.max(serialLines.length, invLines.length, detailsLines.length, 1)
      const rowHeight = Math.max(18, maxLines * lineH + paddingV * 2)

      // Page break if needed
      if (yPos + rowHeight > pageHeight - 80) {
        doc.addPage()
        yPos = margin + 10
      }

      // Background alternating
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, yPos, tableWidth, rowHeight, "F")
      }

      // Bottom border
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.1)
      doc.line(margin, yPos + rowHeight, pageWidth - margin, yPos + rowHeight)

      // Top padding
      const textY = yPos + paddingV + lineH

      // Index
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.text(`${index + 1}`, xIndex + 3, textY)

      // Type
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text(equipment.type, xType + 2, textY)

      // SN (top-aligned)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      serialLines.forEach((ln: string, i: number) => {
        doc.text(ln, xSN + 2, textY + i * lineH)
      })

      // Inventory code (top-aligned)
      invLines.forEach((ln: string, i: number) => {
        doc.text(ln, xInv + 2, textY + i * lineH)
      })

      // Details (top-aligned)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      detailsLines.forEach((ln: string, i: number) => {
        doc.text(ln, xDetails + 2, textY + i * lineH)
      })

      yPos += rowHeight + 2
    })

    yPos += 15

    // === NOTES / DÉTAILS SUPPLÉMENTAIRES ===
    if (notes && notes.trim()) {
      if (yPos > pageHeight - 80) {
        doc.addPage()
        yPos = margin + 10
      }

      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.text("Notes / Détails supplémentaires", margin, yPos)
      yPos += 8

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      
      // Découper le texte en lignes
      const maxWidth = pageWidth - 2 * margin
      const lines = doc.splitTextToSize(notes.trim(), maxWidth)
      
      lines.forEach((line: string) => {
        if (yPos > pageHeight - 30) {
          doc.addPage()
          yPos = margin + 10
        }
        doc.text(line, margin, yPos)
        yPos += 5
      })

      yPos += 10
    }

    // === ZONE DE SIGNATURES ===
    if (yPos > pageHeight - 60) {
      doc.addPage()
      yPos = margin + 10
    }

    // Ligne de séparation
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 10

    // SIGNATURE LIVREUR
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text("Signature du livreur", margin, yPos)

    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.3)
    doc.line(margin, yPos + 18, margin + colWidth - 10, yPos + 18)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text("Date: ___/___/______", margin, yPos + 23)

    // SIGNATURE BÉNÉFICIAIRE
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text("Signature du bénéficiaire", pageWidth / 2 + margin / 2, yPos)

    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.3)
    doc.line(pageWidth / 2 + margin / 2, yPos + 18, pageWidth - margin, yPos + 18)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text("Date: ___/___/______", pageWidth / 2 + margin / 2, yPos + 23)

    // === PIED DE PAGE ===
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

    if (user.company) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.text(user.company.name, pageWidth / 2, pageHeight - 6, { align: "center" })
    }

    // Sauvegarder le PDF
    const publicDir = path.join(process.cwd(), "public", "delivery-notes")
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }

    const fileName = `BL-${timestamp}.pdf`
    const filePath = path.join(publicDir, fileName)
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"))
    fs.writeFileSync(filePath, pdfBuffer)

    // Mettre à jour les équipements dans la base de données
    // Assigner les machines et écrans à l'utilisateur
    for (const equipment of equipments) {
      if (equipment.serialNumberStatus === 'found' && equipment.foundData) {
        // Si c'est une machine (Laptop/PC)
        if ('machineName' in equipment.foundData) {
          try {
            await prisma.machine.update({
              where: { serialNumber: equipment.serialNumber },
              data: { 
                userId: userId,
                assetStatus: 'en_service'
              }
            })
          } catch (error) {
            console.error(`Erreur mise à jour machine ${equipment.serialNumber}:`, error)
          }
        }
        // Si c'est un écran
        else if ('brand' in equipment.foundData && equipment.type === 'Écran') {
          try {
            // Assigner directement l'utilisateur à l'écran
            await prisma.screen.update({
              where: { serialNumber: equipment.serialNumber },
              data: { 
                userId: userId
              }
            })
          } catch (error) {
            console.error(`Erreur mise à jour écran ${equipment.serialNumber}:`, error)
          }
        }
      }
    }

    // Sauvegarder le bon de livraison dans la base de données
    const deliveryNote = await prisma.deliveryNote.create({
      data: {
        noteNumber,
        createdById: userId,
        companyId: user.companyId,
        deliveryDate: new Date(),
        pdfPath: `/delivery-notes/${fileName}`,
        notes: notes || '',
        equipments: {
          create: equipments.map((equipment: any) => ({
            type: equipment.type,
            serialNumber: equipment.serialNumber,
            brand: equipment.brand || '',
            model: equipment.model || '',
            inventoryCode: equipment.inventoryCode || '',
          }))
        }
      }
    })

    return NextResponse.json({
      success: true,
      pdfUrl: `/delivery-notes/${fileName}`,
      fileName,
      deliveryNoteId: deliveryNote.id,
    })
  } catch (error) {
    console.error("Erreur génération bon de livraison:", error)
    return NextResponse.json(
      { error: "Impossible de générer le bon de livraison. Veuillez vérifier les données et réessayer." },
      { status: 500 }
    )
  }
}
