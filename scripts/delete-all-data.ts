import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllData() {
  try {
    console.log('🗑️  Début de la suppression des données...\n');

    // Supprimer tous les équipements des bons de livraison
    console.log('📦 Suppression des équipements de bons de livraison...');
    const deliveryNoteEquipments = await prisma.deliveryNoteEquipment.deleteMany({});
    console.log(`   ✅ ${deliveryNoteEquipments.count} équipements supprimés\n`);

    // Supprimer tous les bons de livraison
    console.log('📋 Suppression des bons de livraison...');
    const deliveryNotes = await prisma.deliveryNote.deleteMany({});
    console.log(`   ✅ ${deliveryNotes.count} bons de livraison supprimés\n`);

    // Supprimer tous les écrans
    console.log('🖥️  Suppression des écrans...');
    const screens = await prisma.screen.deleteMany({});
    console.log(`   ✅ ${screens.count} écrans supprimés\n`);

    // Supprimer toutes les machines
    console.log('💻 Suppression des machines...');
    const machines = await prisma.machine.deleteMany({});
    console.log(`   ✅ ${machines.count} machines supprimées\n`);

    // Supprimer tous les utilisateurs
    console.log('👥 Suppression des utilisateurs...');
    const users = await prisma.user.deleteMany({});
    console.log(`   ✅ ${users.count} utilisateurs supprimés\n`);

    console.log('==================================================');
    console.log('✅ Toutes les données ont été supprimées avec succès!');
    console.log('==================================================');

  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllData()
  .catch((error) => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
