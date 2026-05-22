import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const staffUser = session.user as any;
    if (staffUser.role !== 'STAFF' && staffUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params; // Dynamic clearance request ID OR student university ID

    // 1. Look up student by studentId or request by clearance ID
    let student = await prisma.user.findFirst({
      where: { studentId: id, role: 'STUDENT' },
    });

    let request = await prisma.gateClearanceRequest.findFirst({
      where: {
        OR: [
          { id: id },
          { student: { studentId: id } }
        ],
        status: { in: ['PENDING', 'PENDING_STAFF_SIGNATURE'] }
      },
      include: { student: true }
    });

    if (!student && request) {
      student = request.student;
    }

    if (!student) {
      return NextResponse.json({ error: `Student with identifier '${id}' not found or is not active.` }, { status: 404 });
    }

    // 2. If there is no existing pending request, create one on the fly to approve it
    if (!request) {
      request = await prisma.gateClearanceRequest.create({
        data: {
          studentId: student.id,
          status: 'PENDING_STAFF_SIGNATURE',
          personalItems: JSON.stringify({ trousers: 0, jackets: 0, electronics: 0 }),
          assignedStaffId: staffUser.id,
        },
        include: { student: true }
      });
    }

    // 3. Generate exit token
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24);
    const verificationToken = uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();

    const approvedRequest = await prisma.gateClearanceRequest.update({
      where: { id: request.id },
      data: {
        status: 'APPROVED',
        approvedById: staffUser.id,
        approvedAt: new Date(),
        verificationToken,
        tokenExpiresAt,
      },
      include: { student: { select: { name: true, studentId: true } } }
    });

    return NextResponse.json({
      success: true,
      message: 'Manually approved via staff override.',
      clearance: approvedRequest
    });

  } catch (error: any) {
    console.error('[OVERRIDE_APPROVE_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
