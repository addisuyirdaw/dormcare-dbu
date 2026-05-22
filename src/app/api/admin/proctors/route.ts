import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hashSync } from 'bcryptjs';

// GET /api/admin/proctors — list all proctors with their blocks & last shift
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const proctors = await prisma.user.findMany({
    where: { role: 'STAFF' },
    include: {
      managedBlocks: { select: { id: true, name: true, number: true } },
      shifts: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { isActive: true, checkedInAt: true, createdAt: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(proctors.map(p => ({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    managedBlocks: p.managedBlocks,
    lastShift: p.shifts[0] ?? null,
    isOnDuty: p.shifts[0]?.isActive ?? false,
  })));
}

// POST /api/admin/proctors — create a new proctor account
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { name, email, password, blockIds, phone } = body;

    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      return NextResponse.json({ error: 'Name, email, and password (min 6 chars) are required.' }, { status: 400 });
    }

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
    }

    // Validate blocks exist
    const blocks = blockIds?.length > 0
      ? await prisma.dormBlock.findMany({ where: { id: { in: blockIds } }, select: { id: true } })
      : [];

    // Default to first block if none selected
    const primaryBlock = blocks[0] ?? await prisma.dormBlock.findFirst({ orderBy: { number: 'asc' } });
    if (!primaryBlock) {
      return NextResponse.json({ error: 'No dormitory blocks available.' }, { status: 400 });
    }

    const proctor = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashSync(password, 10),
        role: 'STAFF',
        phone: phone?.trim() || null,
        dormBlockId: primaryBlock.id,
        managedBlocks: {
          connect: blocks.length > 0 ? blocks.map(b => ({ id: b.id })) : [{ id: primaryBlock.id }],
        },
      },
      include: {
        managedBlocks: { select: { id: true, name: true, number: true } },
      },
    });

    return NextResponse.json({
      id: proctor.id,
      name: proctor.name,
      email: proctor.email,
      managedBlocks: proctor.managedBlocks,
    }, { status: 201 });
  } catch (err: any) {
    console.error('[PROCTORS_POST_ERROR]', err);
    return NextResponse.json({ error: 'Failed to create proctor.', details: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/proctors?id= — remove a proctor
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Proctor ID required.' }, { status: 400 });

  const proctor = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!proctor || proctor.role !== 'STAFF') {
    return NextResponse.json({ error: 'Proctor not found.' }, { status: 404 });
  }

  // End any active shifts first
  await prisma.shiftRegistry.updateMany({ where: { staffId: id, isActive: true }, data: { isActive: false } });
  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
