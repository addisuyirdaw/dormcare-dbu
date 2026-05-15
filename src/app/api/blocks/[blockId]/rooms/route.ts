import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ blockId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { blockId } = await params;
  if (!blockId) return NextResponse.json({ error: 'Block ID required' }, { status: 400 });

  const rooms = await prisma.dormRoom.findMany({
    where: { dormBlockId: blockId },
    orderBy: { roomNumber: 'asc' },
  });

  return NextResponse.json(rooms);
}
