import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Navbar from '@/components/Navbar';
import ShiftCommandCenterClient from './ShiftCommandCenterClient';

export const dynamic = 'force-dynamic';

export default async function AdminShiftsPage() {
  const session = await auth();
  if (!session) redirect('/login');
  
  const user = session.user as any;
  if (user.role !== 'ADMIN') redirect('/login');

  const [staffMembers, blocks, initialShifts] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'STAFF' },
      select: { id: true, name: true, phone: true }
    }),
    prisma.dormBlock.findMany({
      orderBy: { number: 'asc' },
      select: { id: true, name: true, number: true }
    }),
    prisma.shiftRegistry.findMany({
      include: {
        staff: { select: { id: true, name: true, phone: true } },
        blocks: { select: { id: true, number: true, name: true } },
        primaryBlock: { select: { id: true, name: true } }
      },
      orderBy: { startTime: 'desc' },
      take: 50
    })
  ]);

  return (
    <div className="page">
      <Navbar userName={user.name} role="ADMIN" />
      <ShiftCommandCenterClient 
        staffMembers={staffMembers}
        blocks={blocks}
        initialShifts={JSON.parse(JSON.stringify(initialShifts))}
      />
    </div>
  );
}
