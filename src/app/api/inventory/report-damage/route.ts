import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { assetTag, condition } = await req.json();

    if (!assetTag || !condition) {
      return NextResponse.json({ error: 'assetTag and condition are required.' }, { status: 400 });
    }

    // Find the item
    const item = await prisma.inventoryItem.findUnique({
      where: { assetTag }
    });

    if (!item) {
      return NextResponse.json({ error: 'Asset tag not found in database.' }, { status: 404 });
    }

    // 1. Update the inventory item condition
    const updatedItem = await prisma.inventoryItem.update({
      where: { assetTag },
      data: { condition }
    });

    // 2. Automated Trap: If assigned to a student, preemptively lock their profile
    if (updatedItem.custodianId) {
      await prisma.gateClearanceRequest.create({
        data: {
          studentId: updatedItem.custodianId,
          status: 'DENIED_PROPERTY_DISPUTE',
        }
      });
    }

    return NextResponse.json(
      { message: 'Asset updated successfully.', item: updatedItem },
      { status: 200 }
    );

  } catch (error) {
    console.error('[REPORT_DAMAGE_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
