import { prisma } from '../lib/db';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

async function main() {
  const filePath = path.join(__dirname, '../usersupload.csv');
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let isFirst = true;
  for await (const line of rl) {
    if (isFirst) { isFirst = false; continue; }
    const cols = line.split(';').map(x => x.trim());
    if (cols.length < 8) continue;
    const [email, fullName, type, model, os, ram, cpu, serial] = cols;
    const [firstName, ...lastNameArr] = fullName.split(' ');
    const lastName = lastNameArr.join(' ');
    // Upsert user
    let user = await prisma.user.upsert({
      where: { email },
      update: { firstName, lastName },
      create: {
        email,
        firstName,
        lastName,
        role: 'viewer',
        companyId: (await prisma.company.findFirst())?.id || '',
      },
    });
    // Update machine assignment
    await prisma.machine.updateMany({
      where: { serialNumber: serial },
      data: { userId: user.id },
    });
    console.log(`Assigné: ${email} à SN: ${serial}`);
  }
  console.log('✅ Import terminé');
}

main().catch(console.error).finally(() => prisma.$disconnect());
