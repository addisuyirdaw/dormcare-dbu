import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Navbar from '@/components/Navbar';
import StudentDashboardClient from './StudentDashboardClient';

export default async function StudentPage() {
  const session = await auth();
  if (!session) redirect('/login');
  const user = session.user as any;
  if (user.role !== 'STUDENT') redirect('/login');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { 
      dormBlock: true,
      room: { include: { assets: true } },
      keyCustodianFor: true // relation to see if they are the custodian
    },
  });

  const blockId = dbUser?.dormBlockId;

  const [tickets, clearances, activeShift] = await Promise.all([
    prisma.emergencyTicket.findMany({
      where: { studentId: user.id },
      include: { assignedStaff: { select: { name: true } }, dormBlock: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.gateClearanceRequest.findMany({
      where: { studentId: user.id },
      include: { approvedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    blockId
      ? prisma.shiftRegistry.findFirst({
          where: {
            isActive: true,
            staff: { managedBlocks: { some: { id: blockId } } },
          },
          include: { staff: { select: { name: true, phone: true } } },
          orderBy: { checkedInAt: 'desc' },
        })
      : null,
  ]);

  const isKeyCustodian = dbUser?.keyCustodianFor !== null;

  return (
    <div className="page relative">
      <Navbar userName={dbUser?.name} role="STUDENT" dormBlock={dbUser?.dormBlock?.name} />
      <StudentDashboardClient
        user={{ ...user, dormBlock: dbUser?.dormBlock, room: dbUser?.room, isKeyCustodian }}
        tickets={JSON.parse(JSON.stringify(tickets))}
        clearances={JSON.parse(JSON.stringify(clearances))}
        activeShift={JSON.parse(JSON.stringify(activeShift))}
      />
    </div>
  );
}
