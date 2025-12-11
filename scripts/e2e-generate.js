const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fetch = global.fetch || require('node-fetch');

async function main() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) return console.error('No user found in DB');

    const machine = await prisma.machine.findFirst();
    if (!machine) return console.error('No machine found in DB');

    const payload = {
      userId: user.id,
      equipments: [
        {
          type: machine.machineName ? 'Laptop' : 'PC',
          serialNumber: machine.serialNumber,
          serialNumberStatus: 'found',
        }
      ],
      notes: 'E2E test generate'
    };

    console.log('Using user:', user.email, 'and machine:', machine.serialNumber);

    const res = await fetch('https://localhost:3000/api/delivery-notes/generate-v3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Error in e2e script:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
