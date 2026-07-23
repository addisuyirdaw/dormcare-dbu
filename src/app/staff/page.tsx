import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Navbar from '@/components/Navbar';
import StaffDashboardClient from './StaffDashboardClient';
import { computeBlockHealthMetrics } from '@/lib/block-health';

export default async function StaffPage() {
  const session = await auth();
  if (!session) redirect('/login');
  const user = session.user as any;
  if (user.role !== 'STAFF') redirect('/login');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      dormBlock: true,
      managedBlocks: { select: { id: true, name: true, number: true } },
    },
  });

  const managedBlockIds = dbUser?.managedBlocks?.map(b => b.id) ?? [];
  // If proctor has no managed blocks explicitly assigned, give campus-wide visibility
  const hasBlockScope = managedBlockIds.length > 0;

  // Staff has EQUAL campus-wide power — fetch ALL blocks/tickets/clearances
  const [activeShift, myShifts, tickets, pendingClearances, resolvedToday, allBlocks] = await Promise.all([
    prisma.shiftRegistry.findFirst({
      where: { staffId: user.id, isActive: true },
      orderBy: { checkedInAt: 'desc' },
      include: { blocks: { select: { id: true, name: true, number: true } } },
    }),
    prisma.shiftRegistry.findMany({
      where: { staffId: user.id },
      include: { blocks: { select: { id: true, name: true, number: true } } },
      orderBy: { startTime: 'desc' },
      take: 10,
    }),
    // Tickets: globally across the entire campus
    prisma.emergencyTicket.findMany({
      where: {},
      include: {
        student: { select: { name: true, studentId: true, room: { select: { roomNumber: true } } } },
        dormBlock: { select: { name: true, number: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    // Clearances: globally across the entire campus without any block scoping
    prisma.gateClearanceRequest.findMany({
      where: {},
      include: {
        student: {
          select: {
            name: true,
            studentId: true,
            room: {
              select: {
                roomNumber: true,
                assets: { select: { id: true, type: true, quantity: true, status: true } },
              },
            },
          },
        },
        approvedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.emergencyTicket.count({
      where: {
        status: 'RESOLVED',
        resolvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    // ALL blocks with their shift/student data
    prisma.dormBlock.findMany({
      include: {
        shifts: { where: { isActive: true }, include: { staff: { select: { name: true } } } },
        _count: { select: { users: { where: { role: 'STUDENT' } } } },
      },
      orderBy: { number: 'asc' },
    }),
  ]);

  // Compute AI Block Health Metrics
  const blockHealthMetrics = await computeBlockHealthMetrics(allBlocks.map(b => b.id));

  const blocks = allBlocks.map((b) => ({
    id: b.id,
    name: b.name,
    number: b.number,
    studentCount: b._count.users,
    activeStaff: b.shifts[0]?.staff?.name || null,
    isStaffed: b.shifts.length > 0,
    health: blockHealthMetrics[b.id] || null,
  }));

  return (
    <div className="page">
      <Navbar userName={dbUser?.name} role="STAFF" dormBlock={dbUser?.dormBlock?.name} onDuty={!!activeShift} />
      <StaffDashboardClient
        user={{ ...user, dormBlock: dbUser?.dormBlock, managedBlocks: dbUser?.managedBlocks }}
        activeShift={JSON.parse(JSON.stringify(activeShift))}
        myShifts={JSON.parse(JSON.stringify(myShifts))}
        tickets={JSON.parse(JSON.stringify(tickets))}
        pendingClearances={JSON.parse(JSON.stringify(pendingClearances))}
        resolvedToday={resolvedToday}
        blocks={JSON.parse(JSON.stringify(blocks))}
      />
    </div>
  );
}
