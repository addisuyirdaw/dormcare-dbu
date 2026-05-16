import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DBU Campus rough GPS coordinates (Debre Birhan University)
const DBU_LAT = 9.6759;
const DBU_LON = 39.5338;

async function main() {
  console.log('🌍 Seeding test GPS check-ins for map verification...');

  // Find the first staff member
  const staffUsers = await prisma.user.findMany({
    where: { role: 'STAFF' },
    include: { dormBlock: true, managedBlocks: true },
    take: 3,
  });

  if (staffUsers.length === 0) {
    console.log('❌ No staff users found. Run the main seed first.');
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < staffUsers.length; i++) {
    const staff = staffUsers[i];
    if (!staff.dormBlock) {
      console.log(`⚠ Staff ${staff.name} has no primary block, skipping.`);
      continue;
    }

    // Deactivate any existing active shifts
    await prisma.shiftRegistry.updateMany({
      where: { staffId: staff.id, isActive: true },
      data: { isActive: false },
    });

    // Create test check-in locations:
    // Staff 0: On campus (PRESENT) - within 50m of DBU center
    // Staff 1: Near campus but slightly outside (OUT_OF_BOUNDS) - ~200m away
    // Staff 2: Far away (OUT_OF_BOUNDS) - ~2km away
    let lat = DBU_LAT;
    let lon = DBU_LON;
    let dist = 0;
    let status = 'PRESENT';

    if (i === 1) {
      lat = DBU_LAT + 0.002; // ~220m north
      lon = DBU_LON + 0.001;
      dist = 250;
      status = 'OUT_OF_BOUNDS';
    } else if (i === 2) {
      lat = DBU_LAT + 0.018; // ~2km north
      lon = DBU_LON - 0.005;
      dist = 2100;
      status = 'OUT_OF_BOUNDS';
    } else {
      // Within campus: add a tiny offset to look realistic
      lat = DBU_LAT + 0.0002;
      lon = DBU_LON + 0.0001;
      dist = 25;
      status = 'PRESENT';
    }

    // Find or create a scheduled shift for today
    let shift = await prisma.shiftRegistry.findFirst({
      where: {
        staffId: staff.id,
        status: 'SCHEDULED',
        startTime: { gte: today }
      },
    });

    if (shift) {
      shift = await prisma.shiftRegistry.update({
        where: { id: shift.id },
        data: {
          isActive: true,
          checkedInAt: new Date(),
          geofenceVerified: status === 'PRESENT',
          latitude: lat,
          longitude: lon,
          distanceDelta: dist,
          status,
        }
      });
    } else {
      shift = await prisma.shiftRegistry.create({
        data: {
          staffId: staff.id,
          primaryBlockId: staff.dormBlock.id,
          shiftName: 'Test Shift (GPS Demo)',
          isActive: true,
          checkedInAt: new Date(),
          geofenceVerified: status === 'PRESENT',
          latitude: lat,
          longitude: lon,
          distanceDelta: dist,
          status,
          startTime: new Date(),
          endTime: new Date(Date.now() + 8 * 60 * 60 * 1000),
        },
      });
    }

    console.log(`✅ ${staff.name}: ${status} — lat:${lat.toFixed(4)}, lon:${lon.toFixed(4)}, Δ${dist}m`);
  }

  console.log('\n🗺️ Done! Open /admin/shifts to see the live campus map.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
