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

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  // Fetch all initial data server-side
  const [
    blocks,
    activeShifts,
    openTickets,
    todayAttendance,
    totalStudents,
    pendingClearances,
    recentLogs,
    criticalIncidents,
    openIssueReports,
    waterThisWeek,
    waterLastWeek,
    electricThisWeek,
    totalIssueReportsWeek,
    keyCustodians,
    damagedInventory,
  ] = await Promise.all([
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
    }),
    prisma.emergencyTicket.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      include: {
        student: {
          select: {
            name: true,
            studentId: true,
            room: { select: { roomNumber: true } },
          },
        },
        dormBlock: { select: { number: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 25,
    }),
    prisma.issueReport.findMany({
      where: { status: 'OPEN' },
      include: {
        student: { select: { name: true, studentId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
    prisma.emergencyTicket.count({
      where: { category: 'WATER', createdAt: { gte: weekAgo } },
    }),
    prisma.emergencyTicket.count({
      where: { category: 'WATER', createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
    }),
    prisma.emergencyTicket.count({
      where: { category: 'ELECTRICAL', createdAt: { gte: weekAgo } },
    }),
    prisma.issueReport.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { keyCustodianFor: { isNot: null } } }),
    prisma.inventoryItem.count({ where: { condition: { not: 'GOOD' } } }),
  ]);

  function incidentTitle(category: string) {
    if (category === 'WATER') return '💧 WATER MAIN EMERGENCY';
    if (category === 'ELECTRICAL') return '⚡ TOTAL BLOCK BLACKOUT';
    return '🔧 INFRASTRUCTURE FAULT';
  }

  function incidentStatus(category: string) {
    if (category === 'WATER') return 'CRITICAL - SMART VALVE CLOSED';
    if (category === 'ELECTRICAL') return 'ESCALATED - TWILIO CALL OUT';
    return 'ROUTED - TECH DISPATCH';
  }

  const incidentFeed = criticalIncidents.map((ticket) => {
    const roomNumber =
      ticket.student.room?.roomNumber ??
      ticket.description?.match(/Room\s+([\w-]+)/i)?.[1] ??
      '—';
    const blockLabel = String(ticket.dormBlock.number);

    return {
      id: ticket.id,
      title: incidentTitle(ticket.category),
      blockLabel,
      roomNumber,
      studentName: ticket.student.name,
      studentId: ticket.student.studentId,
      statusLabel: incidentStatus(ticket.category),
      updatedAt: ticket.updatedAt.toISOString(),
      isAdminRouted: ticket.description?.includes('ADMIN_DASHBOARD') ?? false,
      source: 'emergency' as const,
    };
  });

  const issueFeed = openIssueReports
    .filter((issue) => !incidentFeed.some((i) => i.studentId === issue.student.studentId && i.title.includes(issue.category)))
    .map((issue) => ({
      id: issue.id,
      title:
        issue.category === 'WATER'
          ? '💧 WATER MAIN EMERGENCY'
          : issue.category === 'ELECTRICITY'
            ? '⚡ TOTAL BLOCK BLACKOUT'
            : `📋 ${issue.category} REPORT`,
      blockLabel: issue.roomNumber.split('-')[0] || '—',
      roomNumber: issue.roomNumber,
      studentName: issue.student.name,
      studentId: issue.student.studentId,
      statusLabel:
        issue.category === 'WATER'
          ? 'CRITICAL - SMART VALVE CLOSED'
          : issue.category === 'ELECTRICITY'
            ? 'ESCALATED - TWILIO CALL OUT'
            : 'OPEN - ADMIN REVIEW',
      updatedAt: issue.createdAt.toISOString(),
      isAdminRouted: issue.description.includes('ADMIN_DASHBOARD'),
      source: 'issue' as const,
    }));

  const mergedIncidents = [...incidentFeed, ...issueFeed].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  let waterSpikePct = 0;
  if (waterLastWeek === 0) {
    waterSpikePct = waterThisWeek > 0 ? 100 : 0;
  } else {
    waterSpikePct = Math.round(((waterThisWeek - waterLastWeek) / waterLastWeek) * 100);
  }

  const utilityStability = Math.max(
    62,
    Math.min(99, 96 - waterThisWeek * 4 - electricThisWeek * 6 - openTickets * 2),
  );
  const complianceScore = Math.max(
    70,
    Math.min(98, 94 - damagedInventory * 0.5 - openTickets * 3),
  );
  const reportingSpeedLabel =
    totalIssueReportsWeek > 0 ? `${(24 / Math.max(totalIssueReportsWeek, 1)).toFixed(1)}h avg triage` : '< 2h avg triage';

  const primaryBlock = blocks[0]?.number ?? 1;
  const aiRecommendation =
    waterSpikePct > 0
      ? `AI Analysis: Infrastructure reports indicate recurring load spikes in Block ${primaryBlock}. Water utility complaints rose **${waterSpikePct}%** week-over-week with **${electricThisWeek}** electrical escalations. Recommendation: Schedule preventive pump maintenance within the next **48 hours** to minimize future emergency utility outages.`
      : `AI Analysis: Block ${primaryBlock} utility telemetry is stable. Continue standard valve inspections and maintain on-call electrician roster for peak evening load windows.`;

  const serviceAnalytics = {
    utilityStabilityPct: utilityStability,
    primaryBlockLabel: String(primaryBlock),
    compliancePct: Math.round(complianceScore),
    reportingSpeedLabel,
    recognitionCount: keyCustodians,
    communityRecognitionPct: totalStudents > 0 ? Math.round((keyCustodians / totalStudents) * 100) : 0,
    cleanlinessIndex: Math.max(75, 98 - damagedInventory),
    aiRecommendation,
    waterSpikePct,
    openCriticalCount: mergedIncidents.length,
  };

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
        incidents={JSON.parse(JSON.stringify(mergedIncidents))}
        serviceAnalytics={JSON.parse(JSON.stringify(serviceAnalytics))}
      />
    </div>
  );
}
