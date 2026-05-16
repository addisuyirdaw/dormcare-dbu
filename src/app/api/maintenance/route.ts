import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = ['DAMAGED', 'MISSING', 'WORN'] as const;
type Category = typeof VALID_CATEGORIES[number];

// ── GET /api/maintenance ──────────────────────────────────────────────────────
// Students see their own tickets; Staff/Admin see all PENDING tickets.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;

  if (user.role === 'STUDENT') {
    const tickets = await prisma.maintenanceTicket.findMany({
      where: { studentId: user.id },
      include: {
        asset: { select: { type: true, quantity: true, status: true, room: { select: { roomNumber: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(tickets);
  }

  // Staff / Admin — see all open tickets across campus
  const tickets = await prisma.maintenanceTicket.findMany({
    include: {
      student: { select: { name: true, studentId: true } },
      asset: {
        select: {
          type: true, quantity: true, status: true,
          room: { select: { roomNumber: true, dormBlock: { select: { number: true, name: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return NextResponse.json(tickets);
}

// ── POST /api/maintenance ─────────────────────────────────────────────────────
// Creates a MaintenanceTicket AND automatically marks the target asset DAMAGED/MISSING.
// Atomic: both operations succeed or neither does.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;

  // Both students and staff can report damage
  if (!['STUDENT', 'STAFF', 'ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { assetId, category, description } = body as {
    assetId?: string;
    category?: string;
    description?: string;
  };

  // ── Validation ───────────────────────────────────────────────────────────
  if (!assetId || typeof assetId !== 'string') {
    return NextResponse.json({ error: 'assetId is required.' }, { status: 400 });
  }
  if (!category || !VALID_CATEGORIES.includes(category as Category)) {
    return NextResponse.json(
      { error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` },
      { status: 400 }
    );
  }

  // Confirm the asset actually exists
  const asset = await prisma.roomAsset.findUnique({ where: { id: assetId } });
  if (!asset) {
    return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
  }

  // Determine which studentId to associate:
  // If a staff member is filing on behalf of a student, they pass studentId in body;
  // otherwise default to the logged-in user.
  const reportingStudentId: string = body.studentId && user.role !== 'STUDENT'
    ? body.studentId
    : user.id;

  // ── Atomic Upsert: ticket creation + asset status update ──────────────────
  const [ticket] = await prisma.$transaction([
    prisma.maintenanceTicket.create({
      data: {
        studentId: reportingStudentId,
        assetId,
        category,
        description: description?.trim() || null,
        status: 'PENDING',
      },
      include: {
        asset: { select: { type: true, room: { select: { roomNumber: true } } } },
        student: { select: { name: true, studentId: true } },
      },
    }),
    // Automatically flag the asset — mirrors the real world: damage is now on record
    prisma.roomAsset.update({
      where: { id: assetId },
      data: { status: category === 'MISSING' ? 'MISSING' : 'DAMAGED' },
    }),
  ]);

  return NextResponse.json(ticket, { status: 201 });
}

// ── PATCH /api/maintenance ────────────────────────────────────────────────────
// Staff/Admin resolve or escalate a ticket.
// On RESOLVED: restores the asset status back to GOOD.
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (!['STAFF', 'ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden — Staff or Admin only.' }, { status: 403 });
  }

  const body = await req.json();
  const { id, status } = body as { id?: string; status?: string };

  if (!id || !['IN_PROGRESS', 'RESOLVED'].includes(status ?? '')) {
    return NextResponse.json(
      { error: 'id and a valid status (IN_PROGRESS | RESOLVED) are required.' },
      { status: 400 }
    );
  }

  const ticket = await prisma.maintenanceTicket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });

  const ops: any[] = [
    prisma.maintenanceTicket.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === 'RESOLVED' ? new Date() : null,
      },
      include: {
        asset: { select: { type: true } },
        student: { select: { name: true } },
      },
    }),
  ];

  // When resolved, restore the physical asset to GOOD condition
  if (status === 'RESOLVED') {
    ops.push(
      prisma.roomAsset.update({
        where: { id: ticket.assetId },
        data: { status: 'GOOD' },
      })
    );
  }

  const [updated] = await prisma.$transaction(ops);
  return NextResponse.json(updated);
}
