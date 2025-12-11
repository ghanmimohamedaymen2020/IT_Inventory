const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { SignJWT } = require('jose');

async function makeDevSession(payload, secret = 'secret') {
  const alg = 'HS256'
  const key = new TextEncoder().encode(secret)
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(key)
  return jwt
}

async function main() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) return console.error('No user found in DB');

    const machine = await prisma.machine.findFirst();
    if (!machine) return console.error('No machine found in DB');

    const devPayload = {
      id: user.id,
      role: 'super_admin',
      companyId: user.companyId || null,
      email: user.email,
    }

    const token = await makeDevSession(devPayload, process.env.NEXTAUTH_SECRET || 'secret')
    // Verify token locally
    try {
      const { jwtVerify } = require('jose')
      const key = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'secret')
      const verified = await jwtVerify(token, key)
      console.log('Dev-session token verified locally. Payload:', verified.payload)
    } catch (err) {
      console.warn('Local verification failed for dev-session token:', err)
    }

    const payload = {
      userId: user.id,
      equipments: [
        {
          type: machine.machineName ? 'Laptop' : 'PC',
          serialNumber: machine.serialNumber,
          serialNumberStatus: 'found',
        }
      ],
      notes: 'E2E test generate with cookie'
    };

    console.log('Using user:', user.email, 'and machine:', machine.serialNumber);

    const cookieValue = encodeURIComponent(token)
    const res = await fetch('https://localhost:3000/api/delivery-notes/generate-v3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `dev-session=${cookieValue}`
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text()
    let parsed = null
    try { parsed = JSON.parse(text) } catch (e) { parsed = text }
    console.log('Status:', res.status);
    console.log('Response:', parsed);
  } catch (err) {
    console.error('Error in e2e script:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
