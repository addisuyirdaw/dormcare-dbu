const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
  if (!student) {
    console.log('No student found to attach the item to.');
    return;
  }
  const room = await prisma.dormRoom.findFirst();
  if(!room) {
    console.log('No room found.');
    return;
  }
  await prisma.inventoryItem.upsert({
    where: { assetTag: 'DBU-TEST-123' },
    update: {},
    create: {
      assetTag: 'DBU-TEST-123',
      itemName: 'Study Desk',
      condition: 'GOOD',
      roomNumber: room.roomNumber,
      custodianId: student.id
    }
  });
  console.log('✅ Test item DBU-TEST-123 created and assigned to ' + student.name);
}

main().finally(() => prisma.$disconnect());
