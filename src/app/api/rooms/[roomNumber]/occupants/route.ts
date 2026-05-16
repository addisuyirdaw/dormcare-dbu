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
  
  // Enforce DBU ID Format: 'DBU' + exactly 7 digits (e.g., DBU1500962)
  if (!/^DBU\d{7}$/.test(cleanStudentId)) {
    return NextResponse.json({ 
      error: 'Invalid Student ID format. It must start with "DBU" followed by exactly 7 numeric digits (e.g., DBU1500962).' 
    }, { status: 400 });
  }

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

  // 3. Automated Personal Asset Allocation
  // Check if student already has assets in this room (idempotency guard)
  const existingAssets = await prisma.inventoryItem.findMany({
    where: { custodianId: student.id, roomNumber: room.roomNumber }
  });

  let createdAssets: any[] = [];

  if (existingAssets.length === 0) {
    // ── DETERMINISTIC SLOT LETTER ──────────────────────────────────────────
    // Count distinct other students who already have assets in this room.
    // Their count = this student's 0-based slot index → A, B, C, D...
    const allRoomItems = await prisma.inventoryItem.findMany({
      where: { roomNumber: room.roomNumber },
      select: { custodianId: true },
    });
    const uniqueOtherCustodians = new Set(
      allRoomItems
        .map(i => i.custodianId)
        .filter(id => id !== null && id !== student.id)
    );
    const slotIndex = uniqueOtherCustodians.size; // 0=A, 1=B, 2=C ...
    const slotLetter = String.fromCharCode(65 + slotIndex); // 65='A'

    // ── TAG FORMAT ─────────────────────────────────────────────────────────
    // DBU-B{blockNumber}-R{roomNumberClean}-{type}-{slotLetter}
    // e.g. DBU-B16-R341-LCK-A  (for room "34-1")
    const blockRef = `B${room.dormBlock.number}`;
    const roomRef  = `R${room.roomNumber.replace(/[^a-zA-Z0-9]/g, '')}`;

    const itemsToCreate = [
      { type: 'LCK', name: `Metal Locker ${slotLetter}` },
      { type: 'BED', name: `Iron Bed Frame ${slotLetter}` },
      { type: 'CHI', name: `Study Chair ${slotLetter}` },
    ];

    const dataToInsert = itemsToCreate.map(item => ({
      assetTag:    `DBU-${blockRef}-${roomRef}-${item.type}-${slotLetter}`,
      itemName:    item.name,
      roomNumber:  room.roomNumber,
      custodianId: student.id,
      condition:   'GOOD',
    }));

    // Create assets one by one so we can catch per-item errors cleanly
    for (const item of dataToInsert) {
      try {
        const created = await prisma.inventoryItem.create({ data: item });
        createdAssets.push(created);
      } catch (err: any) {
        // P2002 = unique constraint (tag already exists) — safe to skip
        // Any other error is a real problem we should surface
        if (err.code !== 'P2002') {
          console.error('[ASSET_CREATE_ERROR]', err.message, item);
          // Don't block student registration over asset failure — log and continue
        }
      }
    }
  } else {
    // Student already has assets — return them
    createdAssets = existingAssets;
  }

  return NextResponse.json({ 
    success: true, 
    student,
    assetsGenerated: createdAssets.length,
    assets: createdAssets.map(a => ({ tag: a.assetTag, item: a.itemName }))
  });
}

