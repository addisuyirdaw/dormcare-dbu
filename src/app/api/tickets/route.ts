import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/tickets
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;

  let tickets;
  if (user.role === 'STUDENT') {
    tickets = await prisma.emergencyTicket.findMany({
      where: { studentId: user.id },
      include: { assignedStaff: { select: { name: true } }, dormBlock: { select: { name: true, number: true } } },
      orderBy: { createdAt: 'desc' },
    });
  } else if (user.role === 'STAFF') {
    tickets = await prisma.emergencyTicket.findMany({
      where: { assignedStaffId: user.id },
      include: { student: { select: { name: true, studentId: true } }, dormBlock: { select: { name: true, number: true } } },
      orderBy: { createdAt: 'desc' },
    });
  } else {
    tickets = await prisma.emergencyTicket.findMany({
      include: {
        student: { select: { name: true, studentId: true } },
        assignedStaff: { select: { name: true } },
        dormBlock: { select: { name: true, number: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  return NextResponse.json(tickets);
}

// POST /api/tickets
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const sessionUser = session.user as { id: string; role?: string };
    if (sessionUser.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { category, description } = body;
    if (!category || !['WATER', 'ELECTRICAL', 'STRUCTURAL'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const student = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: { room: true, dormBlock: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
    }

    const dormBlockId = student.dormBlockId ?? student.room?.dormBlockId ?? null;
    if (!dormBlockId) {
      return NextResponse.json(
        {
          error:
            'No dormitory block assigned to your account. Please contact the admin desk to complete room registration.',
        },
        { status: 400 },
      );
    }

    const activeShift = await prisma.shiftRegistry.findFirst({
      where: {
        isActive: true,
        staff: { managedBlocks: { some: { id: dormBlockId } } },
      },
      orderBy: { checkedInAt: 'desc' },
    });

    const ticket = await prisma.emergencyTicket.create({
      data: {
        studentId: student.id,
        dormBlockId,
        category,
        description: description?.trim() || null,
        assignedStaffId: activeShift?.staffId ?? null,
        status: 'OPEN',
      },
      include: {
        dormBlock: { select: { name: true, number: true } },
        assignedStaff: { select: { name: true } },
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error('[TICKETS_POST_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to submit emergency ticket. Please try again.' },
      { status: 500 },
    );
  }
}

// PATCH /api/tickets — update status
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { id, status } = body;
  if (!id || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const ticket = await prisma.emergencyTicket.update({
    where: { id },
    data: {
      status,
      resolvedAt: status === 'RESOLVED' ? new Date() : null,
    },
  });
  return NextResponse.json(ticket);
}
