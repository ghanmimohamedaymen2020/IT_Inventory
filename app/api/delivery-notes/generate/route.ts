import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { jsPDF } from 'jspdf'
import fs from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const { machineId, userId } = await req.json()

    if (!machineId || !userId) {
      return NextResponse.json(
        { error: 'Machine et utilisateur requis' },
        { status: 400 }
      )
    }

    // Récupérer les informations de la machine avec écrans
    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      include: {
        company: true,
        user: true,
        screens: true,
      }
    })

    if (!machine) {
      return NextResponse.json(
        { error: 'Machine non trouvée' },
        { status: 404 }
      )
    }

    // Récupérer les informations de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Créer le PDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    
    // Charger le logo de la société si disponible
    let logoData = null
    if (machine.company.logoPath) {
      const logoPath = path.join(process.cwd(), 'public', machine.company.logoPath)
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath)
        const base64Logo = logoBuffer.toString('base64')
        const ext = path.extname(machine.company.logoPath).toLowerCase()
        const format = ext === '.png' ? 'PNG' : 'JPEG'
        logoData = { data: base64Logo, format }
      }
    }

    // En-tête avec logo
    if (logoData) {
      try {
        doc.addImage(`data:image/${logoData.format.toLowerCase()};base64,${logoData.data}`, logoData.format, 15, 15, 40, 20)
      } catch (err) {
        console.error('Erreur ajout logo:', err)
      }
    }

    // Titre
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('BON DE LIVRAISON', pageWidth / 2, 30, { align: 'center' })

    // Informations société
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(machine.company.name, pageWidth - 15, 20, { align: 'right' })
    
    // Ligne de séparation
    doc.setLineWidth(0.5)
    doc.line(15, 45, pageWidth - 15, 45)

    // Date et numéro
    const date = new Date().toLocaleDateString('fr-FR')
    doc.setFontSize(10)
    doc.text(`Date: ${date}`, 15, 55)
    doc.text(`N° BL: BL-${Date.now()}`, pageWidth - 15, 55, { align: 'right' })

    // Section Utilisateur
    let yPos = 70
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('DESTINATAIRE', 15, yPos)
    
    yPos += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Nom: ${user.firstName} ${user.lastName}`, 15, yPos)
    yPos += 6
    doc.text(`Email: ${user.email}`, 15, yPos)
    yPos += 6
    if (user.phone) {
      doc.text(`Téléphone: ${user.phone}`, 15, yPos)
      yPos += 6
    }
    if (user.department) {
      doc.text(`Département: ${user.department}`, 15, yPos)
      yPos += 6
    }
    if (user.office) {
      doc.text(`Bureau: ${user.office}`, 15, yPos)
      yPos += 6
    }

    // Section Machine
    yPos += 10
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('MATÉRIEL LIVRÉ', 15, yPos)

    yPos += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    // Tableau des informations machine
    const machineInfo = [
      ['Code Inventaire:', machine.inventoryCode],
      ['Numéro de Série:', machine.serialNumber],
      ['Nom de la Machine:', machine.machineName],
      ['Type:', machine.type],
      ['Marque:', machine.vendor],
      ['Modèle:', machine.model],
      ['Version Windows:', machine.windowsVersion || 'N/A'],
      ['Processeur:', machine.cpu || 'N/A'],
      ['RAM:', machine.ram || 'N/A'],
      ['Disque:', machine.disk || 'N/A'],
      ['Date d\'Acquisition:', machine.acquisitionDate ? new Date(machine.acquisitionDate).toLocaleDateString('fr-FR') : 'N/A'],
      ['Garantie:', machine.warrantyDate ? new Date(machine.warrantyDate).toLocaleDateString('fr-FR') : 'N/A'],
    ]

    machineInfo.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold')
      doc.text(label, 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(value, 70, yPos)
      yPos += 6
    })

    // Section Signature
    yPos = pageHeight - 50
    doc.setLineWidth(0.5)
    doc.line(15, yPos, pageWidth - 15, yPos)
    
    yPos += 10
    doc.setFont('helvetica', 'bold')
    doc.text('SIGNATURES', 15, yPos)
    
    yPos += 15
    doc.setFont('helvetica', 'normal')
    doc.text('Livreur:', 20, yPos)
    doc.text('Réceptionnaire:', pageWidth / 2 + 10, yPos)
    
    yPos += 15
    doc.line(20, yPos, 90, yPos)
    doc.line(pageWidth / 2 + 10, yPos, pageWidth - 15, yPos)

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, pageWidth / 2, pageHeight - 10, { align: 'center' })

    // Sauvegarder le PDF
    const pdfDir = path.join(process.cwd(), 'public', 'delivery-notes')
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true })
    }

    const fileName = `BL-${machine.serialNumber}-${Date.now()}.pdf`
    const filePath = path.join(pdfDir, fileName)
    const pdfBuffer = doc.output('arraybuffer')
    fs.writeFileSync(filePath, Buffer.from(pdfBuffer))

    // Mettre à jour la machine avec l'utilisateur
    await prisma.machine.update({
      where: { id: machineId },
      data: {
        userId: userId,
        assetStatus: 'en_service',
      }
    })

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
