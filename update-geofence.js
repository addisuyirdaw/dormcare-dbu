const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.dormBlock.updateMany({ data: { geofenceRadius: 50000000 } });
  console.log('Updated all geofence radii to 50,000 km for testing.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
