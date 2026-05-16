import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;

  try {
    const items = await prisma.inventoryItem.findMany({
      where: { custodianId: user.id },
      orderBy: { assetTag: 'asc' },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[MY_ASSETS_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
