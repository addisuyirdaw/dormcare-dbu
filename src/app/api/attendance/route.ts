import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/attendance — log a scan
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { studentIdentifier, method } = body;
  // studentIdentifier can be a studentId string like "DBU/1000/15" or a user ID
  let student = await prisma.user.findUnique({ where: { studentId: studentIdentifier } });
  if (!student) student = await prisma.user.findUnique({ where: { id: studentIdentifier } });
  if (!student || student.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  // Check if already checked in today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const existing = await prisma.attendanceLog.findFirst({
    where: { studentId: student.id, timestamp: { gte: today } },
  });
  if (existing) {
    return NextResponse.json({
      alreadyCheckedIn: true,
      student: { name: student.name, studentId: student.studentId },
      timestamp: existing.timestamp,
    });
  }

  const staffUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { dormBlockId: true },
  });

  const log = await prisma.attendanceLog.create({
    data: {
      studentId: student.id,
      dormBlockId: staffUser?.dormBlockId || student.dormBlockId || '',
      scannedById: user.id,
      method: method || 'QR_SCAN',
    },
  });

  return NextResponse.json({
    success: true,
    log,
    student: { name: student.name, studentId: student.studentId },
  }, { status: 201 });
}

// GET /api/attendance — fetch logs
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const blockId = searchParams.get('blockId');
  const date = searchParams.get('date');

  const where: any = {};
  if (blockId) where.dormBlockId = blockId;
  if (date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setDate(end.getDate() + 1);
    where.timestamp = { gte: d, lt: end };
  }
  if (user.role === 'STAFF') where.dormBlockId = user.dormBlockId;

  const logs = await prisma.attendanceLog.findMany({
    where,
    include: {
      student: { select: { name: true, studentId: true } },
      dormBlock: { select: { name: true, number: true } },
      scanner: { select: { name: true } },
    },
    orderBy: { timestamp: 'desc' },
    take: 200,
  });
  return NextResponse.json(logs);
}
