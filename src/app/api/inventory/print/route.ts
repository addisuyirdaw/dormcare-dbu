import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const user = session.user as any;
  if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const rawStudentId = searchParams.get('studentId') || '';
  const rawRoomNumber = searchParams.get('roomNumber') || searchParams.get('room') || '';

  // ── SANITIZE ROOM NUMBER ──────────────────────────────────────────────────
  // Normalize spaces to dashes: "1 101" → "1-101"
  const roomNumber = rawRoomNumber.trim().replace(/\s+/g, '-') || undefined;

  // ── SANITIZE STUDENT ID ───────────────────────────────────────────────────
  // Strip slashes and spaces: "DBU/1000/15" → "DBU100015", "1500962" → "DBU1500962"
  let studentId: string | undefined;
  if (rawStudentId.trim()) {
    let cleaned = rawStudentId.trim().toUpperCase().replace(/[\/\s]/g, '');
    // If it's only digits (e.g. "1500962"), auto-prepend "DBU"
    if (/^\d+$/.test(cleaned)) cleaned = `DBU${cleaned}`;
    // If it starts with DBU but missing the prefix somehow, keep as-is
    studentId = cleaned;
  }

  try {
    // ── RESOLVE STUDENT → custodianId ────────────────────────────────────────
    // We can't LIKE-strip slashes in SQLite, so fetch all students and 
    // normalize in JS to find the right UUID, then filter by custodianId.
    let custodianId: string | undefined;
    if (studentId) {
      const allStudents = await prisma.user.findMany({
        where: { role: 'STUDENT' },
        select: { id: true, studentId: true }
      });
      // Normalize DB value: strip slashes/spaces/dashes and uppercase
      const normalize = (s: string) => s.replace(/[\/\s\-]/g, '').toUpperCase();
      const match = allStudents.find(s =>
        s.studentId && normalize(s.studentId).includes(normalize(studentId))
      );
      if (match) {
        custodianId = match.id;
      } else {
        // No student found — return empty immediately
        return NextResponse.json({ success: true, assets: [] });
      }
    }

    const assets = await prisma.inventoryItem.findMany({
      where: {
        ...(custodianId && { custodianId }),
        ...(roomNumber && { roomNumber: { contains: roomNumber } }),
      },
      include: {
        custodian: {
          select: { name: true, studentId: true }
        }
      },
      orderBy: [
        { roomNumber: 'asc' },
        { assetTag: 'asc' }
      ]
    });

    return NextResponse.json({ success: true, assets });
  } catch (error) {
    console.error('[INVENTORY_PRINT_FETCH_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
