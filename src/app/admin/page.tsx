import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Navbar from '@/components/Navbar';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect('/login');
  const user = session.user as any;
  if (user.role !== 'ADMIN') redirect('/login');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch all initial data server-side
  const [blocks, activeShifts, openTickets, todayAttendance, totalStudents, pendingClearances, recentLogs] = await Promise.all([
    prisma.dormBlock.findMany({
      include: {
        shifts: { where: { isActive: true }, include: { staff: { select: { name: true } } } },
        _count: { select: { users: { where: { role: 'STUDENT' } } } },
      },
      orderBy: { number: 'asc' },
    }),
    prisma.shiftRegistry.count({ where: { isActive: true } }),
    prisma.emergencyTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.attendanceLog.count({ where: { timestamp: { gte: today } } }),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.gateClearanceRequest.count({ where: { status: 'PENDING' } }),
    prisma.attendanceLog.findMany({
      include: {
        student: { select: { name: true, studentId: true } },
        dormBlock: { select: { name: true, number: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 15,
    })
  ]);

  const dashboardData = {
    blocks: blocks.map((b) => ({
      id: b.id,
      name: b.name,
      number: b.number,
      studentCount: b._count.users,
      activeStaff: b.shifts[0]?.staff?.name || null,
      isStaffed: b.shifts.length > 0,
    })),
    stats: { activeShifts, openTickets, todayAttendance, totalStudents, pendingClearances },
  };

  return (
    <div className="page">
      <Navbar userName={user?.name} role="ADMIN" />
      <AdminDashboardClient
        initialData={JSON.parse(JSON.stringify(dashboardData))}
        recentLogs={JSON.parse(JSON.stringify(recentLogs))}
      />
    </div>
  );
}
