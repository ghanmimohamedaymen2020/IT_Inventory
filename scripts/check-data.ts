import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    const machineCount = await prisma.machine.count();
    const userCount = await prisma.user.count();
    const screenCount = await prisma.screen.count();
    const deliveryNoteCount = await prisma.deliveryNote.count();
    const equipmentCount = await prisma.deliveryNoteEquipment.count();
    
    console.log('📊 État actuel de la base de données:\n');
    console.log(`💻 Machines: ${machineCount}`);
    console.log(`👥 Utilisateurs: ${userCount}`);
    console.log(`🖥️  Écrans: ${screenCount}`);
    console.log(`📋 Bons de livraison: ${deliveryNoteCount}`);
    console.log(`📦 Équipements: ${equipmentCount}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
