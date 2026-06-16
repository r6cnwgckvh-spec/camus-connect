const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing all data...');
  await prisma.globalMessage.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.report.deleteMany();
  await prisma.blockedUser.deleteMany();
  await prisma.review.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.savedSearch.deleteMany();
  await prisma.collegeSubmission.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.user.deleteMany();
  const count = await prisma.user.count();
  console.log('Done. Users remaining:', count);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
