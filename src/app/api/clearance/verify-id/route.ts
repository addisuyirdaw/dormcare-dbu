import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/clearance/verify-id?studentId=dbu1500962
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ valid: false, error: 'studentId query param is required.' }, { status: 400 });
    }

    // 1. Look up student
    const student = await prisma.user.findFirst({
      where: { studentId: studentId.trim(), role: 'STUDENT' },
      include: {
        dormBlock: { select: { name: true, number: true } },
        room: { select: { roomNumber: true } }
      }
    });

    if (!student) {
      return NextResponse.json({ valid: false, error: 'Student record not found.' }, { status: 404 });
    }

    // 2. Look up the latest APPROVED or RELEASED clearance request for this student
    const request = await prisma.gateClearanceRequest.findFirst({
      where: {
        studentId: student.id,
        status: { in: ['APPROVED', 'RELEASED'] },
      },
      include: {
        approvedBy: { select: { name: true } },
      },
      orderBy: { approvedAt: 'desc' }
    });

    if (!request) {
      return NextResponse.json({ valid: false, error: 'No approved clearance request found.' }, { status: 404 });
    }

    // 3. Confirm approval is on the current calendar date (today)
    const approvedDate = request.approvedAt ? new Date(request.approvedAt) : null;
    const now = new Date();
    const approvedToday = approvedDate &&
      approvedDate.getFullYear() === now.getFullYear() &&
      approvedDate.getMonth() === now.getMonth() &&
      approvedDate.getDate() === now.getDate();

    if (!approvedToday) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Approved clearance was not signed for today\'s date.', 
        approvedAt: request.approvedAt 
      }, { status: 400 });
    }

    // 4. Return ACCESS GRANTED payloads
    let items = null;
    try {
      items = request.personalItems ? JSON.parse(request.personalItems) : null;
    } catch {
      items = request.personalItems;
    }

    return NextResponse.json({
      valid: true,
      student: {
        name: student.name,
        studentId: student.studentId,
        dormBlock: student.dormBlock,
        room: student.room,
      },
      approvedBy: request.approvedBy,
      approvedAt: request.approvedAt,
      departureId: request.departureId,
      verificationToken: request.verificationToken,
      items,
    });

  } catch (error: any) {
    console.error('[VERIFY_ID_ERROR]', error);
    return NextResponse.json({ valid: false, error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
