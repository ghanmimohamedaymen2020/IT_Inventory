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

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { company: true } })
    if (!user) return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 14

    // Colors
    const blue = '#1E3A8A'
    const sectionBg = '#F8FAFC'
    const textColor = '#111827'
    const border = '#CBD5E1'
    const check = '#2563EB'

    // Load logo if available
    let logoData = null
    if (user.company?.logoPath) {
      const logoPath = path.join(process.cwd(), 'public', user.company.logoPath)
      if (fs.existsSync(logoPath)) {
        try {
          const buf = fs.readFileSync(logoPath)
          logoData = { base64: buf.toString('base64'), ext: path.extname(logoPath).replace('.', '') }
        } catch (e) {
          console.warn('Erreur lecture logo:', e)
        }
      }
    }

    // Header styled like return-notes: logo left, title/date right, colored separator
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, pageWidth, 60, 'F')
    if (logoData) {
      try {
        doc.addImage(`data:image/${logoData.ext};base64,${logoData.base64}`, logoData.ext.toUpperCase(), margin, 12, 55, 24)
      } catch (e) { console.warn('addImage failed', e) }
    }
    // Title right
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(26, 35, 126)
    doc.text('FICHE D’INTERVENTION', pageWidth - margin, 18, { align: 'right' })
    // (date shown in the UTILISATEUR box as start/end)
    // Blue separator line
    doc.setDrawColor(26, 35, 126)
    doc.setLineWidth(2)
    doc.line(margin, 40, pageWidth - margin, 40)

    // Two rounded info boxes (UTILISATEUR left, MATÉRIEL right)
    // start a bit higher to reduce empty space below
    let y = 42
    const infoColW = (pageWidth - 3 * margin) / 2

    // compute dynamic heights based on content (more compact)
    const boxPadding = 4
    const contentW = infoColW - boxPadding * 2
    const lineHeight = 6

    const nameLine = (user.name || `${user.firstName || ''}\u00A0${user.lastName || ''}`).trim()

    // helper to format date/time as `YYYY-MM-DD HH:mm` when possible
    const formatDateTime = (s: string) => {
      try {
        const d = new Date(s)
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear()
          const mm = String(d.getMonth() + 1).padStart(2, '0')
          const dd = String(d.getDate()).padStart(2, '0')
          const hh = String(d.getHours()).padStart(2, '0')
          const min = String(d.getMinutes()).padStart(2, '0')
          // use non-breaking space between date and time to avoid line break
          return `${yyyy}-${mm}-${dd}\u00A0${hh}:${min}`
        }
      } catch (e) {}
      return s
    }

    // build left content lines (no header label) — only include non-empty fields
    let leftLines: string[] = []
    // keep full name on a single line (use non-breaking space and do not split)
    if (nameLine) leftLines.push(nameLine)
    if (service || user.service) leftLines.push(`Service:\u00A0${service || user.service}`)
    if (user.email) leftLines.push(`Email:\u00A0${user.email}`)
    if (startVal) leftLines.push(`Début:\u00A0${formatDateTime(startVal)}`)
    if (endVal) leftLines.push(`Fin:\u00A0${formatDateTime(endVal)}`)
    leftLines = leftLines.map(s => (typeof s === 'string' ? s.trim() : s)).filter(Boolean)

    // build right content lines (no header label) — keep each field on a single line
    let rightLines: string[] = []
    if (machineInfo?.vendor) rightLines.push(`Marque:\u00A0${machineInfo.vendor}`)
    if (machineInfo?.model) rightLines.push(`Modèle:\u00A0${machineInfo.model}`)
    if (sn) rightLines.push(`S/N:\u00A0${sn}`)
    if (machineInfo?.inventoryCode) rightLines.push(`Code inventaire:\u00A0${machineInfo.inventoryCode}`)
    rightLines = rightLines.map(s => (typeof s === 'string' ? s.trim() : s)).filter(Boolean)

    // only one empty line at top of each box (no extra at bottom)
    const extraLines = 1 // only top
    const leftHeight = boxPadding * 2 + leftLines.length * lineHeight + extraLines * lineHeight
    const rightHeight = boxPadding * 2 + rightLines.length * lineHeight + extraLines * lineHeight
    const infoBoxH = Math.max(leftHeight, rightHeight, 32)

    // add one empty line above the boxes
    y += lineHeight

    // draw left box
    doc.setFillColor(248, 249, 250)
    doc.roundedRect(margin, y, infoColW, infoBoxH, 3, 3, 'F')
    // render left lines (compact) with one empty line at top
    let ly = y + boxPadding + lineHeight
    doc.setFont('helvetica', 'normal')
    for (let i = 0; i < leftLines.length; i++) {
      const txt = leftLines[i]
      doc.setFontSize(i === 0 ? 10 : 8)
      if (i === 0) doc.setTextColor(0, 0, 0)
      else doc.setTextColor(80, 80, 80)
      doc.text(txt, margin + 6, ly)
      ly += lineHeight
    }

    // draw right box
    doc.setFillColor(248, 249, 250)
    const rx = pageWidth / 2 + margin / 2
    doc.roundedRect(rx, y, infoColW, infoBoxH, 3, 3, 'F')
    // render right lines (compact) with one empty line at top
    let ry = y + boxPadding + lineHeight
    for (let i = 0; i < rightLines.length; i++) {
      const txt = rightLines[i]
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(i === 0 ? 10 : 8)
      doc.setTextColor(0, 0, 0)
      doc.text(txt, rx + 6, ry)
      ry += lineHeight
    }

    // advance Y past the info boxes (very small gap)
    y += infoBoxH + 2

    // add one empty line before the 'Travaux' header
    y += lineHeight

    // Travaux
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(17, 24, 39)
    doc.text('Travaux effectués :', margin, y)
    y += lineHeight
    doc.setFont('helvetica', 'normal')
    const noteLines = doc.splitTextToSize(notes || '', pageWidth - margin * 2)
    noteLines.forEach((ln) => { doc.text(`- ${ln}`, margin + 6, y); y += 6 })
    y += 6

    // Softwares table 2 columns
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 58, 138)
    doc.text('Liste des logiciels installés', margin, y)
    y += 8
    doc.setFont('helvetica', 'normal')
    const swCols = 2
    const swColW = (pageWidth - margin * 2) / swCols
    const swRows = []
    if (softwares && softwares.length > 0) {
      for (let i = 0; i < softwares.length; i += 2) swRows.push([softwares[i], softwares[i+1] || ''])
    } else swRows.push(['Aucun logiciel sélectionné',''])
    for (let i = 0; i < swRows.length; i++) {
      if (i % 2 === 0) { doc.setFillColor(248,250,252); doc.rect(margin, y - 2, swColW * 2, 8, 'F') }
      doc.setTextColor(37, 99, 235)
      doc.text('✔', margin + 2, y + 4)
      doc.setTextColor(17, 24, 39)
      doc.text(swRows[i][0] || '', margin + 10, y + 4)
      doc.setTextColor(37, 99, 235)
      doc.text('✔', margin + swColW + 2, y + 4)
      doc.setTextColor(17, 24, 39)
      doc.text(swRows[i][1] || '', margin + swColW + 10, y + 4)
      y += 10
    }
    y += 6

    // Signatures
    const sigY = pageHeight - 60
    doc.setDrawColor(...[203,213,225])
    doc.setLineWidth(0.5)
    doc.line(margin, sigY, margin + 150, sigY)
    doc.line(pageWidth/2 + 10, sigY, pageWidth - margin, sigY)
    doc.setFontSize(10)
    doc.text('Nom et signature de l’intervenant', margin, sigY + 6)
    doc.text('Nom et signature de l’utilisateur', pageWidth/2 + 10, sigY + 6)

    // Save
    const pdfDir = path.join(process.cwd(), 'public', 'interventions')
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true })
    const fileName = `fiche-intervention-${Date.now()}.pdf`
    const filePath = path.join(pdfDir, fileName)
    const pdfBuf = doc.output('arraybuffer')
    fs.writeFileSync(filePath, Buffer.from(pdfBuf))

    return NextResponse.json({ success: true, fileName, pdfUrl: `/interventions/${fileName}` })
  } catch (err) {
    console.error('Erreur génération fiche intervention:', err)
    return NextResponse.json({ error: 'Erreur interne lors de la génération du PDF' }, { status: 500 })
  }
}

