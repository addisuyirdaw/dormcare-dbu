import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomNumber: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const user = session.user as any;
  if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { roomNumber } = await params;
  if (!roomNumber) return NextResponse.json({ error: 'Room number required' }, { status: 400 });

  const body = await req.json();
  const { studentId, studentName } = body;

  if (!studentId || studentId.trim() === '') {
    return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
  }

  const cleanStudentId = studentId.trim().toUpperCase();
  const cleanStudentName = studentName ? studentName.trim() : `Student ${cleanStudentId}`;

  // 1. Find the Room
  const room = await prisma.dormRoom.findFirst({
    where: { roomNumber: { equals: roomNumber } },
    include: { dormBlock: true }
  });

  if (!room) {
    return NextResponse.json({ error: 'Room not found. Please register the room baseline first.' }, { status: 404 });
  }

  // 2. Upsert the Student
  let student = await prisma.user.findFirst({
    where: { studentId: cleanStudentId }
  });

  if (!student) {
    // Dynamically register the new student
    student = await prisma.user.create({
      data: {
        studentId: cleanStudentId,
        name: cleanStudentName,
        email: `${cleanStudentId.replace(/\//g, '')}@dbu.edu.et`.toLowerCase(),
        password: 'defaultpassword123', // Basic default password
        role: 'STUDENT',
        roomId: room.id,
        dormBlockId: room.dormBlock.id
      }
    });
  } else {
    // Assign existing student to this room
    student = await prisma.user.update({
      where: { id: student.id },
      data: { 
        roomId: room.id,
        dormBlockId: room.dormBlock.id
      }
    });
  }

  return NextResponse.json({ success: true, student });
}
