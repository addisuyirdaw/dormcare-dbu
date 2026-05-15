import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/shifts/active?blockId=xxx — who is on duty for a block
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const blockId = searchParams.get('blockId');

  if (blockId) {
    const shift = await prisma.shiftRegistry.findFirst({
      where: { dormBlockId: blockId, isActive: true },
      include: { staff: { select: { name: true, phone: true } } },
      orderBy: { checkedInAt: 'desc' },
    });
    return NextResponse.json(shift);
  }

  // Return all active shifts (admin view)
  const shifts = await prisma.shiftRegistry.findMany({
    where: { isActive: true },
    include: {
      staff: { select: { name: true } },
      dormBlock: { select: { name: true, number: true } },
    },
  });
  return NextResponse.json(shifts);
}

// DELETE /api/shifts/active — end current shift
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'STAFF') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.shiftRegistry.updateMany({
    where: { staffId: user.id, isActive: true },
    data: { isActive: false, endTime: new Date() },
  });
  return NextResponse.json({ success: true });
}
