import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/shifts/checkin — geofenced shift start with mandatory selfie
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'STAFF') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { latitude, longitude, selfieImage } = body as {
    latitude?: number;
    longitude?: number;
    selfieImage?: string;
  };

  // ── ANTI-FRAUD VALIDATION: all three fields are mandatory ─────────────────
  const missing: string[] = [];
  if (latitude  == null || isNaN(latitude))  missing.push('latitude');
  if (longitude == null || isNaN(longitude)) missing.push('longitude');
  if (!selfieImage || selfieImage.trim() === '') missing.push('selfieImage');

  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Anti-fraud check failed. Missing required fields: ${missing.join(', ')}.`,
        hint:  'All check-ins must include GPS coordinates AND a selfie image (base64 or URL).',
      },
      { status: 400 }
    );
  }

  // Validate selfie is either a base64 data URI or an HTTPS URL (basic format guard)
  const isBase64 = (selfieImage as string).startsWith('data:image/');
  const isHttps  = (selfieImage as string).startsWith('https://');
  if (!isBase64 && !isHttps) {
    return NextResponse.json(
      {
        error: 'selfieImage must be a valid base64 image data URI (data:image/...) or an HTTPS URL.',
      },
      { status: 400 }
    );
  }

  // ── Fetch staff's primary block for geofence calculation ──────────────────
  const staffUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { dormBlock: true, managedBlocks: true },
  });

  if (!staffUser?.dormBlock) {
    return NextResponse.json(
      { error: 'No primary office block assigned. Contact your administrator.' },
      { status: 400 }
    );
  }

  const primaryBlock = staffUser.dormBlock;

  // ── Haversine distance (metres) ───────────────────────────────────────────
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6_371_000; // Earth radius in metres
  const dLat = toRad(primaryBlock.latitude - latitude!);
  const dLon = toRad(primaryBlock.longitude - longitude!);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latitude!)) * Math.cos(toRad(primaryBlock.latitude)) *
    Math.sin(dLon / 2) ** 2;
  const distance    = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const withinFence = distance <= 50; // 50-metre hard boundary
  const newStatus   = withinFence ? 'PRESENT' : 'OUT_OF_BOUNDS';

  // Stamp the exact server-side time for the selfie — client clock cannot be trusted
  const selfieTimestamp = new Date();

  // ── Deactivate any previous active shift ──────────────────────────────────
  await prisma.shiftRegistry.updateMany({
    where: { staffId: user.id, isActive: true },
    data:  { isActive: false },
  });

  // ── Find today's scheduled shift or create an unscheduled fallback ─────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let shift = await prisma.shiftRegistry.findFirst({
    where: { staffId: user.id, status: 'SCHEDULED', startTime: { gte: today } },
    orderBy: { startTime: 'asc' },
  });

  const checkinPayload = {
    isActive:         true,
    checkedInAt:      new Date(),
    geofenceVerified: withinFence,
    latitude:         latitude!,
    longitude:        longitude!,
    distanceDelta:    distance,
    status:           newStatus,
    selfieImage:      selfieImage as string,  // store full base64 or URL
    selfieTimestamp,                          // immutable server-side stamp
  };

  if (shift) {
    shift = await prisma.shiftRegistry.update({
      where: { id: shift.id },
      data:  checkinPayload,
    });
  } else {
    shift = await prisma.shiftRegistry.create({
      data: {
        staffId:        user.id,
        primaryBlockId: primaryBlock.id,
        shiftName:      'Unscheduled Check-in',
        ...checkinPayload,
      },
    });
  }

  return NextResponse.json({
    shift: {
      ...shift,
      // Never echo base64 back to client — confirm receipt only
      selfieImage:     shift.selfieImage ? '[STORED]' : null,
      selfieTimestamp: shift.selfieTimestamp,
    },
    distance:           Math.round(distance),
    withinFence,
    block: {
      name:          primaryBlock.name,
      number:        primaryBlock.number,
      geofenceRadius: 50,
    },
    managedBlocksCount: staffUser.managedBlocks.length,
  });
}
