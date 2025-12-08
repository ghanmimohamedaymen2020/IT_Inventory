import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import jsPDF from "jspdf"
import fs from "fs"
import path from "path"

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

          // Couleurs prédéfinies par société
          const companyColors: { [key: string]: { primary: number[], accent: number[] } } = {
            'GREEN': { primary: [27, 94, 32], accent: [76, 175, 80] },
            'TRANS': { primary: [13, 71, 161], accent: [33, 150, 243] },
          }

          if (user.company.code && companyColors[user.company.code]) {
            primaryColor = companyColors[user.company.code].primary
            accentColor = companyColors[user.company.code].accent
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
    // En-tête du tableau
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(margin, yPos, pageWidth - 2 * margin, 10, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text("#", margin + 3, yPos + 6.5)
    doc.text("TYPE", margin + 12, yPos + 6.5)
    doc.text("NUMÉRO DE SÉRIE", margin + 45, yPos + 6.5)
    doc.text("DÉTAILS", pageWidth - margin - 45, yPos + 6.5)

    yPos += 10

    // Pour chaque équipement (lignes du tableau)
    equipments.forEach((equipment: any, index: number) => {
      // Vérifier si on a assez d'espace, sinon nouvelle page
      if (yPos > pageHeight - 80) {
        doc.addPage()
        yPos = margin + 10
      }

      const lineHeight = equipment.serialNumberStatus === 'found' && equipment.foundData ? 18 : 12

      // Fond alterné pour les lignes
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, yPos, pageWidth - 2 * margin, lineHeight, "F")
      }

      // Bordures des cellules
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.1)
      doc.line(margin, yPos + lineHeight, pageWidth - margin, yPos + lineHeight)

      yPos += 4

      // Numéro
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.text(`${index + 1}`, margin + 5, yPos)

      // Type
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text(equipment.type, margin + 12, yPos)

      // Numéro de série
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      doc.text(equipment.serialNumber, margin + 45, yPos)

      // Détails si trouvé
      if (equipment.serialNumberStatus === 'found') {
        yPos += 5
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)

        let details = []
        if (equipment.brand) details.push(equipment.brand)
        if (equipment.model) details.push(equipment.model)
        if (equipment.inventoryCode) details.push(`#${equipment.inventoryCode}`)

        if (details.length > 0) {
          doc.text(details.join(' • '), margin + 12, yPos)
        }

        // Spécifications techniques (CPU/RAM/Disque)
        if (equipment.foundData && 'machineName' in equipment.foundData) {
          const machine = equipment.foundData
          const specs = []
          if (machine.cpu) specs.push(machine.cpu)
          if (machine.ram) specs.push(machine.ram)
          if (machine.disk) specs.push(machine.disk)

          if (specs.length > 0) {
            yPos += 4
            doc.setFontSize(7)
            doc.setTextColor(120, 120, 120)
            doc.text(specs.join(' | '), margin + 12, yPos)
          }
        }
      }

      yPos += lineHeight - 3
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
          create: equipments.map((equipment) => ({
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
      { error: "Erreur lors de la génération du PDF" },
      { status: 500 }
    )
  }
}
