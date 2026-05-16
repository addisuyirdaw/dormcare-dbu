import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
    if (!student) return NextResponse.json({ error: 'No student found' }, { status: 404 });
    
    const room = await prisma.dormRoom.findFirst();
    if (!room) return NextResponse.json({ error: 'No dorm room found' }, { status: 404 });

    const item = await prisma.inventoryItem.upsert({
      where: { assetTag: 'DBU-TEST-123' },
      update: { condition: 'GOOD' },
      create: {
        assetTag: 'DBU-TEST-123',
        itemName: 'Test Locker',
        condition: 'GOOD',
        roomNumber: room.roomNumber,
        custodianId: student.id,
      }
    });

    return NextResponse.json({ 
      message: '✅ Test Asset seeded successfully!',
      student: student.name,
      assetTag: item.assetTag 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
