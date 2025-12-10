import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { jsPDF } from 'jspdf'
import fs from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const { userId, equipments } = await req.json()

    if (!userId || !equipments || equipments.length === 0) {
      return NextResponse.json(
        { error: 'Utilisateur et équipements requis' },
        { status: 400 }
      )
    }

    // Récupérer les informations de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
      }
    })

    if (!user || !user.company) {
      return NextResponse.json(
        { error: 'Utilisateur ou société non trouvé' },
        { status: 404 }
      )
    }

    // Créer le PDF avec un meilleur design
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    
    // Charger le logo de la société si disponible
    let logoData = null
    if (user.company.logoPath) {
      const logoPath = path.join(process.cwd(), 'public', user.company.logoPath)
      if (fs.existsSync(logoPath)) {
        try {
          const logoBuffer = fs.readFileSync(logoPath)
          const base64Logo = logoBuffer.toString('base64')
          const ext = path.extname(user.company.logoPath).toLowerCase()
          const format = ext === '.png' ? 'PNG' : 'JPEG'
          logoData = { data: base64Logo, format }
        } catch (err) {
          console.error('Erreur lecture logo:', err)
        }
      }
    }

    // Couleur principale
    const primaryColor = [41, 128, 185] // Bleu
    
    // En-tête avec fond coloré
    doc.setFillColor(...primaryColor)
    doc.rect(0, 0, pageWidth, 50, 'F')

    // Logo
    if (logoData) {
      try {
        doc.addImage(
          `data:image/${logoData.format.toLowerCase()};base64,${logoData.data}`,
          logoData.format,
          margin,
          10,
          50,
          25
        )
      } catch (err) {
        console.error('Erreur ajout logo:', err)
      }
    }

    // Titre
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('BON DE LIVRAISON', pageWidth - margin, 25, { align: 'right' })

    // Informations société (en blanc)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(user.company.name, pageWidth - margin, 35, { align: 'right' })

    // Retour à la couleur noire pour le reste
    doc.setTextColor(0, 0, 0)

    // Date et numéro de BL
    let yPos = 60
    const date = new Date().toLocaleDateString('fr-FR')
    const blNumber = `BL-${Date.now()}`
    
    doc.setFontSize(10)
    doc.text(`Date: ${date}`, margin, yPos)
    doc.text(`N° ${blNumber}`, pageWidth - margin, yPos, { align: 'right' })

    // Section Destinataire avec fond gris clair
    yPos += 15
    doc.setFillColor(245, 245, 245)
    doc.rect(margin, yPos, pageWidth - 2 * margin, 40, 'F')
    
    yPos += 8
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...primaryColor)
    doc.text('DESTINATAIRE', margin + 5, yPos)
    
    yPos += 7
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(`${user.firstName} ${user.lastName}`, margin + 5, yPos)
    
    yPos += 6
    doc.text(`Email: ${user.email}`, margin + 5, yPos)
    
    yPos += 6
    if (user.phone) {
      doc.text(`Tél: ${user.phone}`, margin + 5, yPos)
      yPos += 6
    }
    if (user.department && user.office) {
      doc.text(`${user.department} - Bureau ${user.office}`, margin + 5, yPos)
    } else if (user.department) {
      doc.text(user.department, margin + 5, yPos)
    } else if (user.office) {
      doc.text(`Bureau ${user.office}`, margin + 5, yPos)
    }

    // Section Équipements
    yPos += 20
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...primaryColor)
    doc.text('MATÉRIEL LIVRÉ', margin, yPos)

    yPos += 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)

    // Tableau des équipements
    for (let index = 0; index < equipments.length; index++) {
      const equipment: any = equipments[index]
      // Vérifier si on a besoin d'une nouvelle page
      if (yPos > pageHeight - 80) {
        doc.addPage()
        yPos = 20
      }

      // Fond alterné pour chaque équipement
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 30, 'F')
      }

      // Numéro et type
      doc.setFont('helvetica', 'bold')
      doc.text(`${index + 1}. ${equipment.type}`, margin + 5, yPos)
      
      yPos += 6
      doc.setFont('helvetica', 'normal')

      // Description
      if (equipment.brand) {
        doc.text(`   Marque: ${equipment.brand}`, margin + 5, yPos)
        yPos += 5
      }

      doc.text(`   Description: ${equipment.description}`, margin + 5, yPos)
      yPos += 5

      doc.text(`   N° Série: ${equipment.serialNumber}`, margin + 5, yPos)
      yPos += 4

      // Ajout du statut si l'équipement correspond à une machine retirée
      try {
        const existing = await prisma.machine.findUnique({ where: { serialNumber: equipment.serialNumber } })
        if (existing && existing.assetStatus === 'retiré') {
          doc.text(`   Statut: Matériel déjà retiré`, margin + 5, yPos)
          yPos += 8
        } else {
          yPos += 6
        }
      } catch (err) {
        console.warn('generate-v2: impossible de vérifier le statut de la machine', equipment.serialNumber, err)
        yPos += 6
      }
    }

    // Section Signatures
    yPos = pageHeight - 60
    doc.setLineWidth(0.5)
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    
    yPos += 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('SIGNATURES', margin, yPos)
    
    yPos += 15
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    
    // Deux colonnes pour les signatures
    const colWidth = (pageWidth - 2 * margin) / 2
    doc.text('Livreur:', margin + 5, yPos)
    doc.text('Date et signature', margin + 5, yPos + 5)
    
    doc.text('Bénéficiaire:', margin + colWidth + 5, yPos)
    doc.text('Date et signature', margin + colWidth + 5, yPos + 5)
    
    yPos += 15
    doc.line(margin, yPos, margin + colWidth - 10, yPos)
    doc.line(margin + colWidth, yPos, pageWidth - margin, yPos)

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    const footerText = `Généré le ${new Date().toLocaleString('fr-FR')} - ${blNumber}`
    doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' })

    // Sauvegarder le PDF
    const pdfDir = path.join(process.cwd(), 'public', 'delivery-notes')
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true })
    }

    const fileName = `${blNumber}.pdf`
    const filePath = path.join(pdfDir, fileName)
    const pdfBuffer = doc.output('arraybuffer')
    fs.writeFileSync(filePath, Buffer.from(pdfBuffer))

    return NextResponse.json({
      success: true,
      fileName,
      pdfUrl: `/delivery-notes/${fileName}`,
    })

  } catch (error) {
    console.error('Erreur génération bon de livraison:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
