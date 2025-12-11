const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findFirst({ include: { company: true } });
    if (!user) return console.error('No user found in DB');

    const machine = await prisma.machine.findFirst();
    if (!machine) return console.error('No machine found in DB');

    // Build a simple PDF similar to the route but minimal for test
    const doc = new jsPDF();
    const fileName = `BL-test-${Date.now()}.pdf`;
    const publicDir = path.join(process.cwd(), 'public', 'delivery-notes');
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

    doc.setFontSize(18);
    doc.text('BON DE LIVRAISON (TEST)', 20, 20);
    doc.setFontSize(11);
    doc.text(`Utilisateur: ${user.firstName} ${user.lastName} <${user.email}>`, 20, 32);
    doc.text(`N° de série: ${machine.serialNumber}`, 20, 44);
    doc.text(`Type: ${machine.machineName || 'Machine'}`, 20, 50);

    const buffer = Buffer.from(doc.output('arraybuffer'));
    const filePath = path.join(publicDir, fileName);
    fs.writeFileSync(filePath, buffer);

    // Create delivery note DB record
    const deliveryNote = await prisma.deliveryNote.create({
      data: {
        noteNumber: `BL-TEST-${Date.now()}`,
        createdById: user.id,
        companyId: user.companyId,
        deliveryDate: new Date(),
        pdfPath: `/delivery-notes/${fileName}`,
        notes: 'E2E direct test',
        equipments: {
          create: [
            {
              type: machine.machineName ? 'Laptop' : 'PC',
              serialNumber: machine.serialNumber,
              brand: machine.vendor || '',
              model: machine.model || '',
              inventoryCode: machine.inventoryCode || '',
            }
          ]
        }
      }
    });

    console.log('E2E direct generate succeeded');
    console.log('PDF path:', `/delivery-notes/${fileName}`);
    console.log('deliveryNote id:', deliveryNote.id);
  } catch (err) {
    console.error('E2E direct error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
