const fs = require('fs')
const path = require('path')
let jsPDFModule = require('jspdf')
const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default || jsPDFModule

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function generatePDF(filename, equipments, title) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  let yPos = margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(title, pageWidth - margin, margin + 8, { align: 'right' })

  yPos = 58

  // Header compute dynamic widths; DÉTAILS should take half the usable width
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const serialLeftHeader = margin + 45
  const usableWidth = pageWidth - 2 * margin
  const detailsWidthTarget = Math.floor(usableWidth / 2)
  const detailsLeftHeader = pageWidth - margin - detailsWidthTarget
  let maxSerialWidth = 0
  for (const eq of equipments) {
    const s = eq && eq.serialNumber ? String(eq.serialNumber) : ''
    const w = doc.getTextWidth(s)
    if (w > maxSerialWidth) maxSerialWidth = w
  }
  const maxSerialAvailable = Math.max(50, Math.floor(detailsLeftHeader - 10 - serialLeftHeader))
  const serialWidthHeader = Math.min(Math.max(Math.ceil(maxSerialWidth) + 6, 50), Math.max(50, Math.min(140, maxSerialAvailable)))
  const detailsWidthHeader = detailsWidthTarget

  // Draw header background
  doc.setFillColor(30, 144, 255)
  doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255,255,255)
  doc.text('#', margin + 3, yPos + 6.5)
  doc.text('TYPE', margin + 12, yPos + 6.5)
  doc.text('SN / Code inventaire', serialLeftHeader, yPos + 6.5)
  doc.text('DÉTAILS', detailsLeftHeader + detailsWidthHeader/2, yPos + 6.5, { align: 'center' })

  yPos += 10

  equipments.forEach((equipment, index) => {
    if (yPos > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage()
      yPos = margin + 10
    }

    const lineHeight = 18
    if (index % 2 === 0) {
      doc.setFillColor(250,250,250)
      doc.rect(margin, yPos, pageWidth - 2 * margin, lineHeight, 'F')
    }

    doc.setDrawColor(220,220,220)
    doc.line(margin, yPos + lineHeight, pageWidth - margin, yPos + lineHeight)

    yPos += 4

    // Num
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(0,0,0)
    doc.text(String(index+1), margin + 5, yPos)

    // Type
    doc.text(equipment.type || 'Machine', margin + 12, yPos)

    // Serial: SN on first line, inventory code on second (fitted to column)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const serialLeft = serialLeftHeader
    const serialWidth = serialWidthHeader
    const fitSingleLine = (text, maxW) => {
      if (!text) return ''
      if (doc.getTextWidth(text) <= maxW) return text
      let t = text
      while (t.length > 0 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1)
      return t.length > 0 ? t + '…' : '…'
    }
    const snText = equipment.serialNumber ? String(equipment.serialNumber) : ''
    const snLine = fitSingleLine(snText, serialWidth)
    const invText = equipment.inventoryCode ? `#${equipment.inventoryCode}` : ''
    doc.text(snLine, serialLeft, yPos)
    if (invText) doc.text(fitSingleLine(invText, serialWidth), serialLeft, yPos + 5)

    // Details: single-line "Marque Modèle — CPU | RAM | Disque" occupying half width, truncated if needed
    const detailsLeft = detailsLeftHeader
    const detailsWidth = detailsWidthHeader
    doc.setFontSize(9)
    const machine = equipment || {}
    const brandModel = [machine.brand, machine.model].filter(Boolean).join(' ')
    const procRam = [machine.cpu, machine.ram].filter(Boolean).join(' | ')
    const disk = machine.disk ? String(machine.disk) : ''
    const detailsSingle = [brandModel, procRam, disk].filter(Boolean).join(' — ')
    const detailsRendered = (function(text, maxW){
      if (!text) return ''
      if (doc.getTextWidth(text) <= maxW) return text
      let t = text
      while (t.length > 0 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1)
      return t.length > 0 ? t + '…' : '…'
    })(detailsSingle, detailsWidth - 6)
    if (detailsRendered) doc.text(detailsRendered, detailsLeft + 2, yPos)
    const linesForSN = invText ? 2 : 1
    const computedLineHeight = Math.max(12, 6 + linesForSN * 7)
    yPos += computedLineHeight - 3
  })

  const publicDir = path.join(process.cwd(), 'public', filename.startsWith('BL') ? 'delivery-notes' : 'return-notes')
  ensureDir(publicDir)
  const filePath = path.join(publicDir, filename)
  fs.writeFileSync(filePath, Buffer.from(doc.output('arraybuffer')))
  console.log('Written', filePath)
}

// Sample equipments
const sampleEquipments = [
  { type: 'Machine', serialNumber: 'SN-123456', brand: 'Dell', model: 'Latitude 7420', cpu: 'i7-1165G7', ram: '16GB', disk: '512GB SSD', inventoryCode: 'INV001' },
  { type: 'Machine', serialNumber: 'LONGSERIAL-2025-ABCDEFG-1234567890', brand: 'HP', model: 'EliteBook 850', cpu: 'i5-10310U', ram: '8GB', disk: '256GB SSD', inventoryCode: 'INV002' },
  { type: 'Écran', serialNumber: 'SCR-98765', brand: 'Samsung', model: 'S24F350', cpu: '', ram: '', disk: '', inventoryCode: 'INV003' },
  { type: 'Machine', serialNumber: '', brand: 'Lenovo', model: 'ThinkPad X1', cpu: 'i7', ram: '32GB', disk: '1TB SSD', inventoryCode: '' },
]

generatePDF('BL-sample.pdf', sampleEquipments, 'BON DE LIVRAISON - TEST')
generatePDF('BR-sample.pdf', sampleEquipments, 'BON DE RETOUR - TEST')
