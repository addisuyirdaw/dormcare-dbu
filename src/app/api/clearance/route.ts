import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET /api/clearance
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;

  let requests;
  if (user.role === 'STUDENT') {
    requests = await prisma.gateClearanceRequest.findMany({
      where: { studentId: user.id },
      include: { approvedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  } else if (user.role === 'STAFF') {
    // Staff sees pending requests from students in ALL their managed blocks
    const staff = await prisma.user.findUnique({
      where: { id: user.id },
      include: { managedBlocks: { select: { id: true } } }
    });
    const managedBlockIds = staff?.managedBlocks.map(b => b.id) || [];
    
    requests = await prisma.gateClearanceRequest.findMany({
      where: { 
        status: 'PENDING',
        student: { dormBlockId: { in: managedBlockIds } } 
      },
      include: { 
        student: { 
          select: { name: true, studentId: true, room: { select: { roomNumber: true } } } 
        } 
      },
      orderBy: { createdAt: 'desc' },
    });
  } else {
    requests = await prisma.gateClearanceRequest.findMany({
      include: { student: { select: { name: true, studentId: true } }, approvedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  return NextResponse.json(requests);
}

// POST /api/clearance — create new request (no items needed anymore)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Prevent multiple pending requests
  const existing = await prisma.gateClearanceRequest.findFirst({
    where: { studentId: user.id, status: 'PENDING' }
  });
  if (existing) {
    return NextResponse.json({ error: 'You already have a pending clearance request.' }, { status: 400 });
  }

  const request = await prisma.gateClearanceRequest.create({
    data: {
      studentId: user.id,
      status: 'PENDING',
    },
  });
  return NextResponse.json(request, { status: 201 });
}

// PATCH /api/clearance — approve or reject (based on room asset audit)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { id, action, rejectionReason, missingAssetsStr } = body;
  
  if (!id || !['APPROVED', 'REJECTED'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const tokenExpiresAt = new Date();
  tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24); // 24-hour token for final departure

  const updated = await prisma.gateClearanceRequest.update({
    where: { id },
    data: {
      status: action,
      approvedById: user.id,
      approvedAt: new Date(),
      verificationToken: action === 'APPROVED' ? uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase() : null,
      tokenExpiresAt: action === 'APPROVED' ? tokenExpiresAt : null,
      rejectionReason: action === 'REJECTED' ? rejectionReason : null,
      flaggedMissingAssets: action === 'REJECTED' ? missingAssetsStr : null,
    },
    include: { student: { select: { name: true, studentId: true } } },
  });
  return NextResponse.json(updated);
}
