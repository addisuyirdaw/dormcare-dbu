import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/clearance/verify/[token] — public route for gate security
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return NextResponse.json({ valid: false, error: 'No token provided' }, { status: 400 });

  const request = await prisma.gateClearanceRequest.findUnique({
    where: { verificationToken: token },
    include: {
      student: { select: { name: true, studentId: true, dormBlock: { select: { name: true, number: true } } } },
      approvedBy: { select: { name: true } },
      items: true,
    },
  });

  if (!request) return NextResponse.json({ valid: false, error: 'Token not found' }, { status: 404 });
  if (request.status !== 'APPROVED') return NextResponse.json({ valid: false, error: 'Clearance not approved' }, { status: 400 });

  const now = new Date();
  if (request.tokenExpiresAt && request.tokenExpiresAt < now) {
    return NextResponse.json({ valid: false, error: 'Token expired', expiredAt: request.tokenExpiresAt });
  }

  return NextResponse.json({
    valid: true,
    student: request.student,
    approvedBy: request.approvedBy,
    approvedAt: request.approvedAt,
    tokenExpiresAt: request.tokenExpiresAt,
    items: request.items,
  });
}
