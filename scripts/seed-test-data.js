const path = require('path');

// Load .env if available
try {
  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
} catch (e) {
  // ignore
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

  // Ensure a dev company exists
  // The `Company.name` field is unique in the schema, so upsert must use it
  const company = await prisma.company.upsert({
    where: { name: 'Dev Company' },
    update: { code: 'DEV', logoPath: null },
    create: { name: 'Dev Company', code: 'DEV', logoPath: null }
  });

  const usersData = [
    { email: 'superadmin@example.com', firstName: 'Super', lastName: 'Admin', role: 'super_admin', companyId: company.id },
    { email: 'admin@example.com', firstName: 'Site', lastName: 'Admin', role: 'admin', companyId: company.id },
    { email: 'companyadmin@example.com', firstName: 'Company', lastName: 'Admin', role: 'company_admin', companyId: company.id },
    { email: 'user@example.com', firstName: 'Test', lastName: 'User', role: 'user', companyId: company.id }
  ];

  const createdUsers = [];
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { firstName: u.firstName, lastName: u.lastName, role: u.role, companyId: u.companyId },
      create: u
    });
    createdUsers.push(user);
  }

  const machinesData = [
    { inventoryCode: 'DEV-MCH-001', serialNumber: 'SN-DEV-001', machineName: 'Dev Machine 1', type: 'laptop', vendor: 'Acme', model: 'A1', acquisitionDate: new Date(), companyId: company.id, assetStatus: 'active' },
    { inventoryCode: 'DEV-MCH-002', serialNumber: 'SN-DEV-002', machineName: 'Dev Machine 2', type: 'desktop', vendor: 'Acme', model: 'D1', acquisitionDate: new Date(), companyId: company.id, assetStatus: 'active' },
    { inventoryCode: 'DEV-MCH-003', serialNumber: 'SN-DEV-003', machineName: 'Dev Machine 3', type: 'server', vendor: 'Acme', model: 'S1', acquisitionDate: new Date(), companyId: company.id, assetStatus: 'active' }
  ];

  const createdMachines = [];
  for (const m of machinesData) {
    const machine = await prisma.machine.upsert({
      where: { inventoryCode: m.inventoryCode },
      update: m,
      create: m
    });
    createdMachines.push(machine);
  }

  console.log('Company id:', company.id);
  console.log('Users added/updated:', createdUsers.map(u => ({ id: u.id, email: u.email, role: u.role })));
  console.log('Machines added/updated:', createdMachines.map(m => ({ id: m.id, inventoryCode: m.inventoryCode, serial: m.serialNumber })));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
