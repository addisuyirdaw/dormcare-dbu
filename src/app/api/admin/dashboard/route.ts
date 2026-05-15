import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/admin/dashboard — aggregated stats for admin
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as any;
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    blocks,
    activeShifts,
    openTickets,
    todayAttendance,
    totalStudents,
    pendingClearances,
  ] = await Promise.all([
    prisma.dormBlock.findMany({
      include: {
        managers: { select: { id: true, name: true, shifts: { where: { isActive: true } } } },
        _count: { select: { users: { where: { role: 'STUDENT' } } } },
      },
      orderBy: { number: 'asc' },
    }),
    prisma.shiftRegistry.count({ where: { isActive: true } }),
    prisma.emergencyTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.attendanceLog.count({ where: { timestamp: { gte: today } } }),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.gateClearanceRequest.count({ where: { status: 'PENDING' } }),
  ]);

  return NextResponse.json({
    blocks: blocks.map((b) => {
      // Find if any assigned manager has an active shift
      const activeManager = b.managers.find(m => m.shifts.length > 0);
      return {
        id: b.id,
        name: b.name,
        number: b.number,
        studentCount: b._count.users,
        activeStaff: activeManager ? activeManager.name : null,
        isStaffed: !!activeManager,
      };
    }),
    stats: { activeShifts, openTickets, todayAttendance, totalStudents, pendingClearances },
  });
}
