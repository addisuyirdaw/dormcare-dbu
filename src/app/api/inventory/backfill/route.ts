import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/inventory/backfill
// Generates missing personal asset tags for all students who have a room but no InventoryItems
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Find all students who have a room assigned but zero InventoryItems
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        roomId: { not: null },
      },
      include: {
        room: { include: { dormBlock: true } },
        assignedAssets: true,
      },
    });

    const results: any[] = [];

    for (const student of students) {
      if (!student.room) continue;

      // Skip if they already have assets
      if (student.assignedAssets.length > 0) {
        results.push({ student: student.studentId, status: 'SKIPPED - already has assets' });
        continue;
      }

      // Count other custodians already in this room to determine slot
      const roomItems = await prisma.inventoryItem.findMany({
        where: { roomNumber: student.room.roomNumber },
        select: { custodianId: true },
      });
      const uniqueOtherCustodians = new Set(
        roomItems.map(i => i.custodianId).filter(id => id !== null && id !== student.id)
      );
      const slotIndex = uniqueOtherCustodians.size;
      const slotLetter = String.fromCharCode(65 + slotIndex);

      const blockRef = `B${student.room.dormBlock.number}`;
      const roomRef  = `R${student.room.roomNumber.replace(/[^a-zA-Z0-9]/g, '')}`;

      const itemsToCreate = [
        { type: 'LCK', name: `Metal Locker ${slotLetter}` },
        { type: 'BED', name: `Iron Bed Frame ${slotLetter}` },
        { type: 'CHI', name: `Study Chair ${slotLetter}` },
      ];

      const created: string[] = [];
      for (const item of itemsToCreate) {
        try {
          await prisma.inventoryItem.create({
            data: {
              assetTag:    `DBU-${blockRef}-${roomRef}-${item.type}-${slotLetter}`,
              itemName:    item.name,
              roomNumber:  student.room.roomNumber,
              custodianId: student.id,
              condition:   'GOOD',
            }
          });
          created.push(item.name);
        } catch (err: any) {
          if (err.code !== 'P2002') {
            console.error(`[BACKFILL_ERROR] student=${student.studentId} item=${item.type}`, err.message);
          }
        }
      }

      results.push({
        student: student.studentId,
        name: student.name,
        room: student.room.roomNumber,
        slot: slotLetter,
        status: created.length > 0 ? `CREATED ${created.length} assets` : 'FAILED - check logs',
        tags: created,
      });
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (err: any) {
    console.error('[BACKFILL_FATAL]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
