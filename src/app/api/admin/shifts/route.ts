import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const user = session.user as any;
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { staffId, shiftName, startTime, endTime, blockIds } = body;

  if (!staffId || !startTime || !endTime || !blockIds || blockIds.length === 0) {
    return NextResponse.json({ error: 'Missing required fields or blocks' }, { status: 400 });
  }

  // We need to set a primaryBlockId for compatibility. We'll just use the first block in the array.
  const primaryBlockId = blockIds[0];

  try {
    const shift = await prisma.shiftRegistry.create({
      data: {
        staffId,
        primaryBlockId,
        shiftName,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: 'SCHEDULED',
        isActive: false,
        blocks: {
          connect: blockIds.map((id: string) => ({ id }))
        }
      },
      include: {
        staff: true,
        blocks: true
      }
    });

    return NextResponse.json({ success: true, shift });
  } catch (error: any) {
    console.error('Error creating shift:', error);
    return NextResponse.json({ error: error.message || 'Failed to schedule shift' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const user = session.user as any;
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const shifts = await prisma.shiftRegistry.findMany({
      include: {
        staff: { select: { id: true, name: true, phone: true } },
        blocks: { select: { id: true, number: true, name: true } },
        primaryBlock: { select: { id: true, name: true } }
      },
      orderBy: { startTime: 'desc' },
      take: 50
    });

    return NextResponse.json(shifts);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
  }
}
