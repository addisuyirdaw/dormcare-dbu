import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tag = searchParams.get('tag');

  if (!tag) {
    return NextResponse.json({ error: 'Asset tag is required' }, { status: 400 });
  }

  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { assetTag: tag },
      include: {
        custodian: {
          select: { name: true, studentId: true }
        }
      }
    });

    if (!item) {
      return NextResponse.json({ error: 'Asset not found in database.' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('[INVENTORY_LOOKUP_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
