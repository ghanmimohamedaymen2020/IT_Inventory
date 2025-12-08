import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCompany() {
  try {
    const companyId = 'cmiu7dpfp0000t0i4gkp8ihk7';
    
    console.log(`🔍 Recherche de la compagnie: ${companyId}\n`);
    
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });
    
    if (company) {
      console.log('✅ Compagnie trouvée:');
      console.log(JSON.stringify(company, null, 2));
    } else {
      console.log('❌ Compagnie introuvable');
      
      console.log('\n📋 Liste de toutes les compagnies:');
      const allCompanies = await prisma.company.findMany();
      console.log(JSON.stringify(allCompanies, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCompany();
