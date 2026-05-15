import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/rooms/[roomNumber] — Key Custodian & Asset Lookup
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomNumber: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Await the params object
  const { roomNumber } = await params;

  if (!roomNumber) {
    return NextResponse.json({ error: 'Room number required' }, { status: 400 });
  }

  const room = await prisma.dormRoom.findFirst({
    where: { roomNumber: { equals: roomNumber } }, // case-sensitive exact match usually fine for e.g. "1-101"
    include: {
      dormBlock: { select: { name: true, number: true } },
      keyCustodian: { select: { name: true, studentId: true, phone: true } },
      occupants: { select: { name: true, studentId: true } },
      assets: true,
    },
  });

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  return NextResponse.json(room);
}
