import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/shifts/checkin — geofenced shift start
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'STAFF') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { latitude, longitude } = body;

  // Get the staff's PRIMARY assigned block (their central office)
  const staffUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { dormBlock: true, managedBlocks: true },
  });
  
  if (!staffUser?.dormBlock) {
    return NextResponse.json({ error: 'No primary office block assigned.' }, { status: 400 });
  }

  const primaryBlock = staffUser.dormBlock;

  // Haversine distance check against the PRIMARY block
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(primaryBlock.latitude - latitude);
  const dLon = toRad(primaryBlock.longitude - longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latitude)) * Math.cos(toRad(primaryBlock.latitude)) * Math.sin(dLon / 2) ** 2;
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const withinFence = distance <= 50; // User explicitly requested 50 meters threshold
  const newStatus = withinFence ? 'PRESENT' : 'OUT_OF_BOUNDS';

  // Deactivate any existing active shift for this staff
  await prisma.shiftRegistry.updateMany({
    where: { staffId: user.id, isActive: true },
    data: { isActive: false },
  });

  // Find if there is a SCHEDULED shift for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let shift = await prisma.shiftRegistry.findFirst({
    where: {
      staffId: user.id,
      status: 'SCHEDULED',
      startTime: { gte: today }
    },
    orderBy: { startTime: 'asc' }
  });

  if (shift) {
    shift = await prisma.shiftRegistry.update({
      where: { id: shift.id },
      data: {
        isActive: true,
        checkedInAt: new Date(),
        geofenceVerified: withinFence,
        latitude,
        longitude,
        distanceDelta: distance,
        status: newStatus
      }
    });
  } else {
    // Unscheduled check-in fallback
    shift = await prisma.shiftRegistry.create({
      data: {
        staffId: user.id,
        primaryBlockId: primaryBlock.id,
        shiftName: 'Unscheduled Check-in',
        isActive: true,
        checkedInAt: new Date(),
        geofenceVerified: withinFence,
        latitude,
        longitude,
        distanceDelta: distance,
        status: newStatus
      },
    });
  }

  return NextResponse.json({
    shift,
    distance: Math.round(distance),
    withinFence,
    block: { name: primaryBlock.name, number: primaryBlock.number, geofenceRadius: 50 },
    managedBlocksCount: staffUser.managedBlocks.length,
  });
}
