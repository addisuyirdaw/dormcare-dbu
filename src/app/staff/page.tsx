import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Navbar from '@/components/Navbar';
import StaffDashboardClient from './StaffDashboardClient';

export default async function StaffPage() {
  const session = await auth();
  if (!session) redirect('/login');
  const user = session.user as any;
  if (user.role !== 'STAFF') redirect('/login');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { 
      dormBlock: true, // Primary Office
      managedBlocks: { select: { id: true, name: true, number: true } } // Multi-block Assignment
    },
  });

  const managedBlockIds = dbUser?.managedBlocks.map((b) => b.id) || [];

  const [activeShift, tickets, pendingClearances, resolvedToday] = await Promise.all([
    prisma.shiftRegistry.findFirst({
      where: { staffId: user.id, isActive: true },
      orderBy: { checkedInAt: 'desc' },
    }),
    prisma.emergencyTicket.findMany({
      where: { dormBlockId: { in: managedBlockIds } },
      include: { student: { select: { name: true, studentId: true, room: { select: { roomNumber: true } } } }, dormBlock: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.gateClearanceRequest.findMany({
      where: { student: { dormBlockId: { in: managedBlockIds } } },
      include: { student: { select: { name: true, studentId: true, room: { select: { roomNumber: true } } } }, approvedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.emergencyTicket.count({
      where: {
        assignedStaffId: user.id,
        status: 'RESOLVED',
        resolvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  return (
    <div className="page">
      <Navbar userName={dbUser?.name} role="STAFF" dormBlock={dbUser?.dormBlock?.name} onDuty={!!activeShift} />
      <StaffDashboardClient
        user={{ ...user, dormBlock: dbUser?.dormBlock, managedBlocks: dbUser?.managedBlocks }}
        activeShift={JSON.parse(JSON.stringify(activeShift))}
        tickets={JSON.parse(JSON.stringify(tickets))}
        pendingClearances={JSON.parse(JSON.stringify(pendingClearances))}
        resolvedToday={resolvedToday}
      />
    </div>
  );
}
