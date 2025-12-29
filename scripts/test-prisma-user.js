const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main(){
  try {
    const users = await prisma.user.findMany({ take: 5 });
    console.log('OK: found', users.length, 'users');
    console.log(users.map(u=>({id:u.id,email:u.email,firstName:u.firstName,lastName:u.lastName})));
  } catch(e){
    console.error('ERROR', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
main();