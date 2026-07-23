import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/clearance/verify/[token] — public route for gate security
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return NextResponse.json({ valid: false, error: 'No token provided' }, { status: 400 });

  // Accept both legacy verificationToken and new departureId exit codes
  const request = await prisma.gateClearanceRequest.findFirst({
    where: {
      OR: [
        { verificationToken: token },
        { departureId: token },
      ],
    },
    include: {
      student: { select: { name: true, studentId: true, dormBlock: { select: { name: true, number: true } } } },
      approvedBy: { select: { name: true } },
    },
  });

  if (!request) return NextResponse.json({ valid: false, error: 'Exit code not found. Please ensure the student has an approved clearance.' }, { status: 404 });
  if (request.status !== 'APPROVED' && request.status !== 'RELEASED') return NextResponse.json({ valid: false, error: 'Clearance not approved' }, { status: 400 });

  const now = new Date();
  if (request.tokenExpiresAt && request.tokenExpiresAt < now) {
    return NextResponse.json({ valid: false, error: 'Token expired', expiredAt: request.tokenExpiresAt });
  }

  let items = null;
  try {
    items = request.personalItems ? JSON.parse(request.personalItems) : null;
  } catch {
    items = request.personalItems;
  }

  return NextResponse.json({
    valid: true,
    id: request.id,
    status: request.status,
    student: request.student,
    approvedBy: request.approvedBy,
    approvedAt: request.approvedAt,
    tokenExpiresAt: request.tokenExpiresAt,
    departureId: request.departureId,
    verificationToken: request.verificationToken,
    clothesCount: request.clothesCount,
    trousersCount: request.trousersCount,
    sweatersCount: request.sweatersCount,
    otherAssets: request.otherAssets,
    items,
  });
}
