import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { auth } from "@/lib/auth"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import jsPDF from "jspdf"
import fs from "fs"
import path from "path"

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
      console.warn(`POST /api/return-notes: user ${returnedByUser.id} has no company. Creating default company.`)

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
      console.warn(`Session user ${session.user.id} not found; using returnedByUser as creator`)
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

    // Mettre à jour le statut des équipements
    for (const equipment of equipments) {
      if (equipment.type === 'machine') {
        // Mettre à jour la machine
        await prisma.machine.updateMany({
          where: { serialNumber: equipment.serialNumber },
          data: {
            assetStatus: 'en_stock',
            userId: null, // Désassigner l'utilisateur
          },
        })
      } else if (equipment.type === 'screen') {
        // Mettre à jour l'écran
        await prisma.screen.updateMany({
          where: { serialNumber: equipment.serialNumber },
          data: {
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

          const companyColors: { [key: string]: { primary: number[], accent: number[] } } = {
            'GREEN': { primary: [27, 94, 32], accent: [76, 175, 80] },
            'TRANS': { primary: [13, 71, 161], accent: [33, 150, 243] },
          }

          if (company.code && companyColors[company.code]) {
            primaryColor = companyColors[company.code].primary
            accentColor = companyColors[company.code].accent
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
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text("BON DE RETOUR", pageWidth - margin, margin + 8, { align: "right" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`N° ${noteNumber}`, pageWidth - margin, margin + 15, { align: "right" })

    const currentDate = new Date(returnNote.returnDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    const currentTime = new Date(returnNote.returnDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
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

    returnNote.equipments.forEach((eq: any, index: number) => {
      const lineHeight = 18

      // Vérifier si on a besoin d'une nouvelle page
      if (yPos + lineHeight > 270) {
        doc.addPage()
        yPos = margin
      }

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
      doc.text(eq.type === "machine" ? "Machine" : "Écran", margin + 12, yPos)

      // Numéro de série
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      doc.text(eq.serialNumber || "", margin + 45, yPos)

      // Détails (ligne suivante)
      yPos += 5
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)

      let details = []
      if (eq.brand) details.push(eq.brand)
      if (eq.model) details.push(eq.model)
      if (eq.inventoryCode) details.push(`#${eq.inventoryCode}`)

      if (details.length > 0) {
        doc.text(details.join(' • '), margin + 12, yPos)
      }

      yPos += lineHeight - 9
    })

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
