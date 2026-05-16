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

// POST /api/clearance — create new request (with Monash Property Audit)
export async function POST(req: NextRequest) {
  try {
    const { studentId } = await req.json();

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required.' }, { status: 400 });
    }

    // 1. Relational Fetching: Student -> Room -> Assets
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        room: {
          include: { inventoryItems: true }
        }
      }
    });

    if (!student || !student.room) {
      return NextResponse.json({ error: 'Student or assigned room not found.' }, { status: 404 });
    }

    const roomNumber = student.room.roomNumber;
    const roomAssets = student.room.inventoryItems || [];

    // Prevent multiple pending requests (if they already have an approved or pending one)
    const existing = await prisma.gateClearanceRequest.findFirst({
      where: { studentId: studentId, status: { in: ['PENDING', 'APPROVED'] } }
    });
    if (existing && existing.status === 'PENDING') {
      return NextResponse.json({ error: 'You already have a pending clearance request.' }, { status: 400 });
    }

    // 2. BUSINESS LOGIC RULE 1 (Individual Liability)
    const liableAssets = roomAssets.filter(
      (asset) => asset.custodianId === studentId && (asset.condition === 'DAMAGED' || asset.condition === 'MISSING')
    );

    // 3. BUSINESS LOGIC RULE 2 (Joint Communal Liability)
    const communalIssues = await prisma.issueReport.findMany({
      where: {
        roomNumber: roomNumber,
        status: 'OPEN'
      }
    });

    // 4. INTERCEPT LOGIC: Halt if ANY property disputes are active
    if (liableAssets.length > 0 || communalIssues.length > 0) {
      
      const deniedRequest = await prisma.gateClearanceRequest.create({
        data: {
          studentId,
          status: 'DENIED_PROPERTY_DISPUTE',
          rejectionReason: 'Auto-blocked: Unresolved individual or communal property issues.',
        }
      });

      return NextResponse.json({
        status: 'DENIED_PROPERTY_DISPUTE',
        message: 'Gate clearance blocked due to unresolved property issues.',
        details: {
          personallyDamagedAssets: liableAssets.length,
          openCommunalFacilityIssues: communalIssues.length,
        },
        clearanceRecord: deniedRequest
      }, { status: 403 });
    }

    // 5. SUCCESS LOGIC: Clean state, generate secure DBU token
    const secureToken = `DBU-${crypto.randomUUID().split('-')[0].toUpperCase()}`;

    const approvedRequest = await prisma.gateClearanceRequest.create({
      data: {
        studentId,
        status: 'APPROVED',
        token: secureToken,
      }
    });

    return NextResponse.json({
      status: 'APPROVED',
      message: 'Gate clearance granted. No pending property issues found.',
      token: secureToken,
      clearanceRecord: approvedRequest
    }, { status: 200 });

  } catch (error) {
    console.error('[CLEARANCE_POST_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
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

  // ── Fetch the clearance request + student's room data ─────────────────────
  const clearanceRequest = await prisma.gateClearanceRequest.findUnique({
    where: { id },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          studentId: true,
          room: {
            select: {
              id: true,
              roomNumber: true,
              assets: { select: { id: true, type: true, quantity: true, status: true } },
            },
          },
        },
      },
    },
  });

  if (!clearanceRequest) {
    return NextResponse.json({ error: 'Clearance request not found.' }, { status: 404 });
  }

  // ── SECURITY GUARDRAIL: Property Dispute Check ────────────────────────────
  // Block approval if the student's room has ANY damaged/missing assets
  // OR any unresolved maintenance tickets linked to their assets.
  if (action === 'APPROVED') {
    const roomAssets = clearanceRequest.student.room?.assets ?? [];

    // 1. Check asset condition flags
    const flaggedAssets = roomAssets.filter(
      (a) => a.status === 'DAMAGED' || a.status === 'MISSING'
    );

    // 2. Check open maintenance tickets for those assets
    const assetIds = roomAssets.map((a) => a.id);
    const openTickets = assetIds.length > 0
      ? await prisma.maintenanceTicket.findMany({
          where: { assetId: { in: assetIds }, status: 'PENDING' },
          select: { id: true, category: true, description: true, asset: { select: { type: true } } },
        })
      : [];

    if (flaggedAssets.length > 0 || openTickets.length > 0) {
      // Auto-deny and stamp the record
      const disputeDetails = {
        flaggedAssets: flaggedAssets.map((a) => `${a.type} (${a.status})`),
        openTickets:   openTickets.map((t) => `${t.asset.type}: ${t.category}`),
      };

      await prisma.gateClearanceRequest.update({
        where: { id },
        data: {
          status:          'DENIED_PROPERTY_DISPUTE',
          approvedById:    user.id,
          approvedAt:      new Date(),
          rejectionReason: `Auto-blocked: ${JSON.stringify(disputeDetails)}`,
        },
      });

      return NextResponse.json(
        {
          status:  'DENIED_PROPERTY_DISPUTE',
          message: 'Clearance blocked: student has unresolved property issues.',
          details: disputeDetails,
        },
        { status: 409 }   // 409 Conflict — business rule violation
      );
    }
  }

  // ── All clear — proceed with normal approval / rejection ──────────────────
  const tokenExpiresAt = new Date();
  tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24);

  const updated = await prisma.gateClearanceRequest.update({
    where: { id },
    data: {
      status:              action,
      approvedById:        user.id,
      approvedAt:          new Date(),
      verificationToken:   action === 'APPROVED' ? uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase() : null,
      tokenExpiresAt:      action === 'APPROVED' ? tokenExpiresAt : null,
      rejectionReason:     action === 'REJECTED' ? rejectionReason : null,
      flaggedMissingAssets: action === 'REJECTED' ? missingAssetsStr : null,
    },
    include: { student: { select: { name: true, studentId: true } } },
  });
  return NextResponse.json(updated);
}

