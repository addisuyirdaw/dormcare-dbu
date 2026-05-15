import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rooms = await prisma.dormRoom.findMany({
    include: {
      dormBlock: { select: { number: true, name: true } },
      keyCustodian: { select: { id: true, name: true, studentId: true } },
      assets: true,
      occupants: { select: { id: true, name: true, studentId: true } }
    },
    orderBy: [
      { dormBlockId: 'asc' },
      { roomNumber: 'asc' }
    ]
  });

  return NextResponse.json(rooms);
}
