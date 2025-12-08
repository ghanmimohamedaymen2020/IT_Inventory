import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBLNumbers() {
  try {
    console.log('📋 Vérification des numéros de bons de livraison:\n');
    
    const deliveryNotes = await prisma.deliveryNote.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        noteNumber: true,
        createdAt: true,
      }
    });
    
    if (deliveryNotes.length === 0) {
      console.log('❌ Aucun bon de livraison trouvé\n');
    } else {
      console.log(`✅ ${deliveryNotes.length} bon(s) de livraison trouvé(s):\n`);
      deliveryNotes.forEach((note, index) => {
        console.log(`${index + 1}. ${note.noteNumber} - ${new Date(note.createdAt).toLocaleString('fr-FR')}`);
      });
    }
    
    console.log('\n📊 Séquences actuelles:');
    const sequences = await prisma.deliveryNoteSequence.findMany({
      orderBy: { year: 'desc' }
    });
    
    if (sequences.length === 0) {
      console.log('❌ Aucune séquence trouvée');
    } else {
      sequences.forEach(seq => {
        console.log(`   ${seq.year}: Dernier numéro = ${seq.lastNumber}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBLNumbers();
