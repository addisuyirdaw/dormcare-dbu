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

  // Parse block and room numbers (e.g. "7-100" -> block 7, room 100)
  const [blockStr] = roomNumber.split('-');
  const blockNumber = parseInt(blockStr, 10);

  const body = await req.json();
  const { assets, custodianStudentId, custodianStudentName } = body; 

  if (!Array.isArray(assets)) {
    return NextResponse.json({ error: 'Invalid assets payload' }, { status: 400 });
  }

  // 1. UPSERT the DormBlock
  let block = await prisma.dormBlock.findFirst({
    where: { number: blockNumber },
  });

  if (!block) {
    block = await prisma.dormBlock.create({
      data: {
        number: blockNumber,
        name: `Block ${blockNumber}`,
        latitude: 0,
        longitude: 0,
        geofenceRadius: 100,
      },
    });
  }

  // 2. UPSERT the DormRoom
  let room = await prisma.dormRoom.findFirst({
    where: { roomNumber: { equals: roomNumber } },
  });

  if (!room) {
    room = await prisma.dormRoom.create({
      data: {
        roomNumber: roomNumber,
        dormBlockId: block.id,
      },
    });
  }

  // 3. Find or Create Custodian Student if provided
  let keyCustodianId = null;
  if (custodianStudentId && custodianStudentId.trim() !== '') {
    const cleanStudentId = custodianStudentId.trim().toUpperCase();

    // Enforce DBU ID Format: 'DBU' + exactly 7 digits (e.g., DBU1500962)
    if (!/^DBU\d{7}$/.test(cleanStudentId)) {
      return NextResponse.json({ 
        error: 'Invalid Student ID format. It must start with "DBU" followed by exactly 7 numeric digits (e.g., DBU1500962).' 
      }, { status: 400 });
    }

    const cleanStudentName = custodianStudentName ? custodianStudentName.trim() : `Student ${cleanStudentId}`;
    
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
          password: 'defaultpassword123',
          role: 'STUDENT',
          roomId: room.id,
          dormBlockId: block.id
        }
      });
    } else {
      // Auto-assign the existing student to this room
      if (student.roomId !== room.id) {
        student = await prisma.user.update({
          where: { id: student.id },
          data: { roomId: room.id, dormBlockId: block.id }
        });
      }
    }
    
    keyCustodianId = student.id;
  }

  // 4. TRANSACTION to replace assets and update custodian
  await prisma.$transaction([
    prisma.roomAsset.deleteMany({
      where: { roomId: room.id },
    }),
    prisma.roomAsset.createMany({
      data: assets.map((a: any) => ({
        roomId: room!.id,
        type: a.type.toUpperCase().trim(),
        quantity: parseInt(a.quantity, 10),
        status: 'GOOD',
      })),
    }),
    prisma.dormRoom.update({
      where: { id: room.id },
      data: { keyCustodianId: keyCustodianId },
    })
  ]);

  // Fetch updated room to return
  const updatedRoom = await prisma.dormRoom.findFirst({
    where: { id: room.id },
    include: {
      assets: true,
      keyCustodian: { select: { id: true, name: true, studentId: true, phone: true } },
      occupants: { select: { id: true, name: true, studentId: true } },
      dormBlock: { select: { name: true, number: true } }
    },
  });

  return NextResponse.json(updatedRoom);
}
