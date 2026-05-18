/**
 * AI Block Health & Satisfaction Engine
 * ──────────────────────────────────────
 * Computes a per-block "satisfaction score" from real data signals:
 *  - Emergency ticket volume & resolution speed
 *  - Maintenance backlog
 *  - Clearance rejection rate (proxy for student-staff friction)
 *  - Attendance compliance (proxy for positive engagement)
 *  - Issue report recency (negative signal)
 *
 * Score   ≥ 75 → GOOD      (green)
 * Score 50–74 → MEDIUM     (amber)
 * Score   < 50 → CRITICAL  (red)
 */

import { prisma } from '@/lib/db';

export type BlockTier = 'CRITICAL' | 'MEDIUM' | 'GOOD';

export type BlockHealthMetric = {
  blockId: string;
  score: number;        // 0-100
  tier: BlockTier;
  openEmergencies: number;
  openMaintenance: number;
  rejectedClearances: number;
  attendanceRate: number;  // 0-100
  weeklyIssues: number;
  aiVerdict: string;       // human-readable AI sentence
  controlSuggestion: string; // action staff/admin should take
};

export async function computeBlockHealthMetrics(
  blockIds: string[],
): Promise<Record<string, BlockHealthMetric>> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results: Record<string, BlockHealthMetric> = {};

  await Promise.all(
    blockIds.map(async (blockId) => {
      const [
        openEmergencies,
        resolvedEmergencies,
        openMaintenance,
        rejectedClearances,
        approvedClearances,
        weeklyIssues,
        todayAttendance,
        totalStudents,
      ] = await Promise.all([
        prisma.emergencyTicket.count({
          where: { dormBlockId: blockId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        }),
        prisma.emergencyTicket.count({
          where: { dormBlockId: blockId, status: 'RESOLVED', updatedAt: { gte: weekAgo } },
        }),
        prisma.maintenanceTicket.count({
          where: {
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            student: { dormBlockId: blockId },
          },
        }),
        prisma.gateClearanceRequest.count({
          where: { status: 'REJECTED', student: { dormBlockId: blockId } },
        }),
        prisma.gateClearanceRequest.count({
          where: { status: 'APPROVED', student: { dormBlockId: blockId } },
        }),
        prisma.issueReport.count({
          where: { createdAt: { gte: weekAgo }, student: { dormBlockId: blockId } },
        }),
        prisma.attendanceLog.count({
          where: { dormBlockId: blockId, timestamp: { gte: today } },
        }),
        prisma.user.count({ where: { dormBlockId: blockId, role: 'STUDENT' } }),
      ]);

      // ── Score Computation ─────────────────────────────────────────────────
      let score = 100;

      // Negative signals
      score -= openEmergencies * 12;       // each open emergency: -12
      score -= openMaintenance * 6;        // each maintenance backlog: -6
      score -= weeklyIssues * 4;           // each issue this week: -4
      score -= rejectedClearances * 3;     // each rejection (friction): -3

      // Positive signals
      const resolutionBonus = Math.min(resolvedEmergencies * 4, 15); // max +15
      const approvalBonus = Math.min(approvedClearances * 1.5, 10);  // max +10
      score += resolutionBonus + approvalBonus;

      // Attendance factor (0-100%)
      const attendanceRate = totalStudents > 0
        ? Math.round((todayAttendance / totalStudents) * 100)
        : 50; // neutral if no students yet

      // Attendance below 60% penalises, above 80% rewards
      if (attendanceRate < 60) score -= (60 - attendanceRate) * 0.3;
      if (attendanceRate >= 80) score += (attendanceRate - 80) * 0.2;

      score = Math.max(0, Math.min(100, Math.round(score)));

      // ── Tier ─────────────────────────────────────────────────────────────
      const tier: BlockTier = score >= 75 ? 'GOOD' : score >= 50 ? 'MEDIUM' : 'CRITICAL';

      // ── AI Verdict ────────────────────────────────────────────────────────
      let aiVerdict = '';
      let controlSuggestion = '';

      if (tier === 'CRITICAL') {
        aiVerdict = `🔴 This block is under high stress with ${openEmergencies} open emergencies and ${openMaintenance} maintenance backlogs. Student satisfaction is estimated LOW.`;
        controlSuggestion = 'Immediate Action: Dispatch on-call staff, resolve open tickets, and conduct a proctor walkthrough today.';
      } else if (tier === 'MEDIUM') {
        aiVerdict = `🟡 Moderate friction detected. ${weeklyIssues} issue reports this week with ${rejectedClearances} clearance rejections suggest room-level disputes.`;
        controlSuggestion = 'Schedule a block inspection, clear maintenance backlog, and verify key custodian accountability.';
      } else {
        aiVerdict = `🟢 Block is operating well. Attendance compliance is ${attendanceRate}% with ${resolvedEmergencies} emergencies resolved this week.`;
        controlSuggestion = 'Maintain current staffing levels. Continue standard preventive inspections.';
      }

      results[blockId] = {
        blockId,
        score,
        tier,
        openEmergencies,
        openMaintenance,
        rejectedClearances,
        attendanceRate,
        weeklyIssues,
        aiVerdict,
        controlSuggestion,
      };
    }),
  );

  return results;
}
