import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { jsPDF } from 'jspdf'
import fs from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, service, date, dateStart, dateEnd, startDate, endDate, notes, sn, machineInfo, softwares } = body
    const startVal = dateStart || startDate || date || ''
    const endVal = dateEnd || endDate || ''

    if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      include: { company: true } 
    })
    if (!user) return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })

    // Create PDF with professional layout
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    const contentWidth = pageWidth - (margin * 2)
    
    // Design System
    const colors = {
      primary: '#1E3A8A',      // Navy blue
      secondary: '#3B82F6',    // Bright blue
      accent: '#10B981',       // Emerald green
      dark: '#111827',         // Gray-900
      medium: '#6B7280',       // Gray-500
      light: '#9CA3AF',        // Gray-400
      background: '#F8FAFC',   // Gray-50
      border: '#E5E7EB',       // Gray-200
      success: '##f0faff',      
      white: '#FFFFFF',
      clientBg: '#F0F9FF',     // Light blue for client section
      interventionBg: '#FEF7E6' // Light orange for intervention section
    }
    
    const fonts = {
      title: 'helvetica',
      body: 'helvetica',
      bold: 'helvetica'
    }

    // Helper function to draw section header
    const drawSectionHeader = (text: string, y: number) => {
      doc.setFillColor(colors.primary)
      doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F')
      doc.setTextColor(colors.white)
      doc.setFont(fonts.bold, 'bold')
      doc.setFontSize(10)
      doc.text(text, margin + 5, y + 5.5)
      return y + 10
    }

    // Load company logo
    let logoData = null
    if (user.company?.logoPath) {
      try {
        const logoPath = path.join(process.cwd(), 'public', user.company.logoPath)
        if (fs.existsSync(logoPath)) {
          const buf = fs.readFileSync(logoPath)
          logoData = { 
            base64: buf.toString('base64'), 
            ext: path.extname(logoPath).replace('.', '').toLowerCase() 
          }
        }
      } catch (e) {
        console.warn('Erreur lecture logo:', e)
      }
    }

    // HEADER SECTION
    doc.setFillColor(colors.white)
    doc.rect(0, 0, pageWidth, 50, 'F')
    
    // Company logo
    if (logoData) {
      try {
        doc.addImage(
          `data:image/${logoData.ext};base64,${logoData.base64}`,
          logoData.ext.toUpperCase(),
          margin,
          12,
          40,
          15
        )
      } catch (e) { 
        console.warn('Impossible de charger le logo:', e)
      }
    }
    
    // Document title
    doc.setFont(fonts.title, 'bold')
    doc.setFontSize(20)
    doc.setTextColor(colors.primary)
    const title = 'FICHE D\'INTERVENTION TECHNIQUE'
    const titleWidth = doc.getTextWidth(title)
    doc.text(title, pageWidth - margin - titleWidth +3  / 2, 22)
    
    // Document subtitle
    doc.setFont(fonts.body, 'normal')
    doc.setFontSize(10)
    doc.setTextColor(colors.medium)
    const subtitle = 'Document de suivi d\'intervention'
    const subtitleWidth = doc.getTextWidth(subtitle)
    doc.text(subtitle, pageWidth - margin - subtitleWidth +3  / 2, 30)
    
    // Header separator
    doc.setDrawColor(colors.border)
    doc.setLineWidth(0.5)
    doc.line(margin, 35, pageWidth - margin, 35)
    
    // Header reference info
    doc.setFontSize(8)
    doc.setTextColor(colors.light)
    const refNumber = `REF-${Date.now().toString().slice(-8)}`
    doc.text(`N° de référence: ${refNumber}`, margin, 42)
    
    const today = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    doc.text(`Émise le: ${today}`, pageWidth - margin, 42, { align: 'right' })
    
    // Start content
    let y = 55

    // CLIENT & INTERVENTION SECTION - TWO SEPARATE BOXES
    y = drawSectionHeader('INFORMATIONS', y)
    
    // Calculate dimensions for two separate boxes
    const boxWidth = (contentWidth - 10) / 2  // Minus 10 for gap between boxes
    let boxHeight = 35
    const gap = 10
    
    // LEFT BOX - INFORMATIONS CLIENT
    const clientBoxX = margin
    const clientBoxY = y
    
    // Draw client box with background (gris simple)
    doc.setFillColor(colors.background)
    doc.roundedRect(clientBoxX, clientBoxY, boxWidth, boxHeight, 3, 3, 'F')
    doc.setDrawColor(colors.border)
    doc.setLineWidth(0.8)
    doc.roundedRect(clientBoxX, clientBoxY, boxWidth, boxHeight, 3, 3, 'S')
    
    // Client box title
    doc.setFont(fonts.bold, 'bold')
    doc.setFontSize(10)
    doc.setTextColor(colors.primary)
    doc.text('INFORMATIONS CLIENT', clientBoxX + 10, clientBoxY + 8)
    
    // Client box separator line
    doc.setDrawColor(colors.secondary)
    doc.setLineWidth(0.3)
    doc.line(clientBoxX + 5, clientBoxY + 11, clientBoxX + boxWidth - 5, clientBoxY + 11)
    
    // Client information
    const clientData = [
      { label: 'Nom', value: `${user.firstName || ''} ${user.lastName || ''}`.trim() },
      { label: 'Société', value: user.company?.name || 'Non spécifié' },
      { label: 'Service', value: service || user.service || 'Non spécifié' },
      { label: 'Email', value: user.email || 'Non spécifié' },
      { label: 'Tél', value: user.phone || 'Non spécifié' }
    ]
    
    let clientContentY = clientBoxY + 18
    doc.setFont(fonts.body, 'normal')
    doc.setFontSize(8)
    
    clientData.forEach((item, index) => {
      if (item.value && item.value !== 'Non spécifié') {
        doc.setTextColor(colors.dark)
        doc.setFont(fonts.bold, 'bold')
        doc.text(`${item.label}:`, clientBoxX + 8, clientContentY)
        
        doc.setFont(fonts.body, 'normal')
        doc.setTextColor(colors.medium)
        
        // Truncate long values
        let displayValue = item.value
        if (item.label === 'Email' && item.value.length > 25) {
          displayValue = item.value.substring(0, 22) + '...'
        }
        
        doc.text(displayValue, clientBoxX + 22, clientContentY)
        clientContentY += 4.5
      }
    })
    
    // RIGHT BOX - INFORMATIONS INTERVENTION
    const interventionBoxX = margin + boxWidth + gap
    const interventionBoxY = y
    
    // Draw intervention box with background (gris simple)
    doc.setFillColor(colors.background)
    doc.roundedRect(interventionBoxX, interventionBoxY, boxWidth, boxHeight, 3, 3, 'F')
    doc.setDrawColor(colors.border)
    doc.setLineWidth(0.8)
    doc.roundedRect(interventionBoxX, interventionBoxY, boxWidth, boxHeight, 3, 3, 'S')
    
    // Intervention box title
    doc.setFont(fonts.bold, 'bold')
    doc.setFontSize(10)
    doc.setTextColor(colors.primary)
    doc.text('INFORMATIONS INTERVENTION', interventionBoxX + 10, interventionBoxY + 8)
    
    // Intervention box separator line
    doc.setDrawColor(colors.accent)
    doc.setLineWidth(0.3)
    doc.line(interventionBoxX + 5, interventionBoxY + 11, interventionBoxX + boxWidth - 5, interventionBoxY + 11)
    
    // Format date/time function
    const formatDateTime = (dateStr: string) => {
      if (!dateStr || dateStr.trim() === '') return 'Non spécifié'
      try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return 'Date invalide'
        
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      } catch {
        return 'Date invalide'
      }
    }
    
    // Calculate duration if both dates are present
    const calculateDuration = (start: string, end: string) => {
      if (!start || !end || start === 'Non spécifié' || end === 'Non spécifié') {
        return 'Non calculable'
      }
      try {
        const startDate = new Date(start)
        const endDate = new Date(end)
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return 'Non calculable'
        }
        
        const diffMs = Math.abs(endDate.getTime() - startDate.getTime())
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
        
        if (diffHours > 0) {
          return `${diffHours}h ${diffMinutes}min`
        } else {
          return `${diffMinutes}min`
        }
      } catch {
        return 'Non calculable'
      }
    }
    
    const duration = calculateDuration(startVal, endVal)
    
    // Intervention information
    const interventionData = [
      { 
        label: 'Début', 
        value: formatDateTime(startVal),
        color: colors.dark
      },
      { 
        label: 'Fin', 
        value: formatDateTime(endVal),
        color: colors.dark
      },
      { 
        label: 'Durée', 
        value: duration,
        color: colors.success
      },
      { 
        label: 'Statut', 
        value: endVal ? 'TERMINÉ' : 'EN COURS',
        color: endVal ? colors.success : colors.secondary
      }
    ]
    
    let interventionContentY = interventionBoxY + 18
    doc.setFont(fonts.body, 'normal')
    doc.setFontSize(8)
    
    interventionData.forEach((item) => {
      doc.setTextColor(colors.dark)
      doc.setFont(fonts.bold, 'bold')
      doc.text(`${item.label}:`, interventionBoxX + 8, interventionContentY)
      
      doc.setFont(fonts.body, 'normal')
      doc.setTextColor(item.color)
      
      // Make status text bold
      if (item.label === 'Statut') {
        doc.setFont(fonts.bold, 'bold')
      }
      
      doc.text(item.value, interventionBoxX + 22, interventionContentY)
      interventionContentY += 4.5
    })
    
    // Move Y below the boxes
    y += boxHeight + 10

    // EQUIPMENT INFO SECTION
    y = drawSectionHeader('INFORMATIONS ÉQUIPEMENT', y)
    
    // Equipment info in a styled box
    doc.setFillColor(colors.background)
    doc.roundedRect(margin, y, contentWidth, 25, 2, 2, 'F')
    doc.setDrawColor(colors.border)
    doc.roundedRect(margin, y, contentWidth, 25, 2, 2, 'S')
    
    const equipmentData = [
      { label: 'Marque', value: machineInfo?.vendor || 'Non spécifié' },
      { label: 'Modèle', value: machineInfo?.model || 'Non spécifié' },
      { label: 'S/N', value: sn || 'Non spécifié' },
      { label: 'Code inventaire', value: machineInfo?.inventoryCode || 'Non spécifié' },
      { label: 'Type', value: machineInfo?.type || 'Non spécifié' },
      { label: 'Système d\'exploitation', value: machineInfo?.os || 'Non spécifié' }
    ]
    
    let eqY = y + 7
    let eqX = margin + 10
    
    equipmentData.forEach((item, index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      const xPos = eqX + (column * (contentWidth / 2))
      const yPos = eqY + (row * 6)
      
      doc.setFont(fonts.bold, 'bold')
      doc.setFontSize(8)
      doc.setTextColor(colors.dark)
      doc.text(`${item.label}:`, xPos, yPos)
      
      doc.setFont(fonts.body, 'normal')
      doc.setTextColor(colors.medium)
      doc.text(item.value, xPos + 25, yPos)
    })
    
    y += 30

    // WORK PERFORMED SECTION
    y = drawSectionHeader('TRAVAUX EFFECTUÉS', y)

    // Gestion dynamique de la hauteur et pagination
    const notesFontSize = 9;
    const notesLineHeight = 5;
    const notesBoxPadY = 8;
    const notesBoxPadX = 10;
    const notesBoxMinHeight = 25;
    const notesBoxMaxHeight = pageHeight - y - 60; // Laisse de la place pour la suite/signatures

    let noteLines: string[] = [];
    if (notes && notes.trim() !== '') {
      doc.setFont(fonts.body, 'normal');
      doc.setFontSize(notesFontSize);
      doc.setTextColor(colors.dark);
      noteLines = doc.splitTextToSize(notes, contentWidth - 2 * notesBoxPadX);
    }

    let totalNoteHeight = (noteLines.length || 1) * notesLineHeight + 2 * notesBoxPadY;
    if (totalNoteHeight < notesBoxMinHeight) totalNoteHeight = notesBoxMinHeight;
    boxHeight = Math.min(totalNoteHeight, notesBoxMaxHeight);

    // Si le texte dépasse la page, on pagine
    let remainingLines = noteLines.slice();
    let firstBox = true;
    while (remainingLines.length > 0 || firstBox) {
      firstBox = false;
      let linesThisPage = [];
      if (remainingLines.length > 0) {
        // Combien de lignes rentrent dans la boîte ?
        let maxLines = Math.floor((notesBoxMaxHeight - 2 * notesBoxPadY) / notesLineHeight);
        linesThisPage = remainingLines.slice(0, maxLines);
        remainingLines = remainingLines.slice(maxLines);
        boxHeight = Math.max(notesBoxMinHeight, linesThisPage.length * notesLineHeight + 2 * notesBoxPadY);
      } else {
        // Pas de notes, juste la boîte vide
        linesThisPage = [];
        boxHeight = notesBoxMinHeight;
      }

      // Dessiner la boîte
      doc.setFillColor(colors.background);
      doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'F');
      doc.setDrawColor(colors.border);
      doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'S');

      if (linesThisPage.length > 0) {
        doc.setFont(fonts.body, 'normal');
        doc.setFontSize(notesFontSize);
        doc.setTextColor(colors.dark);
        let noteY = y + notesBoxPadY;
        linesThisPage.forEach((line: string, index: number) => {
          if (index === 0) {
            doc.text('• ' + line, margin + notesBoxPadX, noteY);
          } else {
            doc.text('  ' + line, margin + notesBoxPadX, noteY);
          }
          noteY += notesLineHeight;
        });
      } else {
        doc.setFont(fonts.body, 'italic');
        doc.setFontSize(notesFontSize);
        doc.setTextColor(colors.medium);
        doc.text('Aucune description de travaux fournie', margin + notesBoxPadX, y + notesBoxPadY);
      }

      y += boxHeight + 5;
      // Si encore du texte, nouvelle page
      if (remainingLines.length > 0) {
        doc.addPage();
        y = margin;
      }
    }

    // SOFTWARE INSTALLED SECTION
    y = drawSectionHeader('LOGICIELS INSTALLÉS', y)
    
    if (softwares && softwares.length > 0 && softwares.some((s: string) => s.trim() !== '')) {
      // Gestion dynamique et pagination pour la liste des logiciels
      const rowHeight = 8;
      const headerHeight = rowHeight + 2;
      const bottomMargin = 40;
      const filteredSoftwares = softwares.filter((s: string) => s && s.trim() !== '');
      // Split into columns for better display
      const softwareRows: [string, string][] = [];
      for (let i = 0; i < filteredSoftwares.length; i += 2) {
        softwareRows.push([
          filteredSoftwares[i] || '',
          filteredSoftwares[i + 1] || ''
        ]);
      }

      let currentRow = 0;
      let page = 1;
      let maxRowsPerPage = Math.floor((pageHeight - y - bottomMargin - headerHeight) / rowHeight);
      const drawHeader = (yPos: number) => {
        doc.setFillColor(colors.primary);
        doc.roundedRect(margin, yPos, contentWidth, rowHeight, 2, 2, 'F');
        doc.setTextColor(colors.white);
        doc.setFont(fonts.bold, 'bold');
        doc.setFontSize(8);
        doc.text('LOGICIEL', margin + 15, yPos + 5);
        doc.text('LOGICIEL', margin + contentWidth / 2 + 15, yPos + 5);
      };

      let yPos = y;
      drawHeader(yPos);
      yPos += headerHeight;

      doc.setFont(fonts.body, 'normal');
      doc.setFontSize(8);

      for (let i = 0; i < softwareRows.length; i++) {
        // Saut de page si besoin
        if (currentRow > 0 && currentRow % maxRowsPerPage === 0) {
          doc.addPage();
          yPos = margin;
          drawHeader(yPos);
          yPos += headerHeight;
          currentRow = 0;
          // recalculer maxRowsPerPage pour nouvelle page
          maxRowsPerPage = Math.floor((pageHeight - margin - bottomMargin - headerHeight) / rowHeight);
        }

        const row = softwareRows[i];
        // Alternate row background
        if (currentRow % 2 === 0) {
          doc.setFillColor(colors.background);
          doc.rect(margin, yPos - 2, contentWidth, rowHeight, 'F');
        }
        // Checkmark and software name for first column
        if (row[0] && row[0].trim() !== '') {
          doc.setTextColor(colors.success);
          doc.setFontSize(10);
          doc.text('✓', margin + 5, yPos + 5);
          doc.setTextColor(colors.dark);
          doc.setFontSize(8);
          doc.text(row[0].trim(), margin + 15, yPos + 5);
        }
        // Checkmark and software name for second column
        if (row[1] && row[1].trim() !== '') {
          doc.setTextColor(colors.success);
          doc.setFontSize(10);
          doc.text('✓', margin + contentWidth / 2 + 5, yPos + 5);
          doc.setTextColor(colors.dark);
          doc.setFontSize(8);
          doc.text(row[1].trim(), margin + contentWidth / 2 + 15, yPos + 5);
        }
        yPos += rowHeight;
        currentRow++;
      }
      // Add summary at the bottom (on last page only)
      doc.setFontSize(7);
      doc.setTextColor(colors.medium);
      doc.text(
        `Total: ${filteredSoftwares.length} logiciel(s) installé(s)`,
        pageWidth - margin,
        yPos + 5,
        { align: 'right' }
      );
      y = yPos + 10;
    } else {
      doc.setFont(fonts.body, 'italic');
      doc.setFontSize(9);
      doc.setTextColor(colors.medium);
      doc.text('Aucun logiciel installé lors de cette intervention', margin + 10, y + 5);
      y += 15;
    }

    // SIGNATURES SECTION
    y = pageHeight - 50
    
    doc.setDrawColor(colors.border)
    doc.setLineWidth(0.5)
    doc.line(margin, y, margin + 80, y)
    doc.line(pageWidth - margin - 80, y, pageWidth - margin, y)
    
    doc.setFontSize(8)
    doc.setTextColor(colors.medium)
    doc.text('Signature de l\'intervenant', margin + 40, y + 5, { align: 'center' })
    doc.text('Signature du client', pageWidth - margin - 40, y + 5, { align: 'center' })
    
    // Add date lines for signatures
    doc.setFontSize(7)
    doc.setTextColor(colors.light)
    doc.text('Date: ____/____/________', margin + 40, y + 12, { align: 'center' })
    doc.text('Date: ____/____/________', pageWidth - margin - 40, y + 12, { align: 'center' })
    
    // Footer
    doc.setFontSize(7)
    doc.setTextColor(colors.light)
    doc.text(
      'Document généré automatiquement - Pour toute question, contactez le support technique',
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )

    // Save PDF
    const pdfDir = path.join(process.cwd(), 'public', 'interventions')
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true })
    }
    
    const fileName = `fiche-intervention-${Date.now()}.pdf`
    const filePath = path.join(pdfDir, fileName)
    const pdfBuffer = doc.output('arraybuffer')
    
    fs.writeFileSync(filePath, Buffer.from(pdfBuffer))

    return NextResponse.json({ 
      success: true, 
      fileName, 
      pdfUrl: `/interventions/${fileName}`,
      reference: refNumber
    })
    
  } catch (err) {
    console.error('Erreur génération fiche intervention:', err)
    return NextResponse.json({ 
      error: 'Erreur interne lors de la génération du PDF',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}