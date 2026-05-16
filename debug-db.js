const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  // Show all tags in DB that contain 'CHI' or 'BED' or 'LCK'
  const items = await p.inventoryItem.findMany({ orderBy: { assetTag: 'asc' } });
  console.log('ALL ASSET TAGS IN DB:');
  items.forEach(i => console.log(`  "${i.assetTag}" | room: ${i.roomNumber} | custodian: ${i.custodianId}`));
  console.log('\nTotal:', items.length);
}
main().catch(console.error).finally(() => p.$disconnect());
