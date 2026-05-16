const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.shiftRegistry.updateMany({
    where: { status: 'OUT_OF_BOUNDS' },
    data: { status: 'PRESENT', geofenceVerified: true }
  });
  console.log('Fixed current active shifts to be in bounds.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
