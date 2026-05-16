import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const PROCTOR_DIRECTORY: Record<string, { supervisor: string; phone: string; tech: string }> = {
  "1": { supervisor: "Ato Tolosa", phone: "0911-11-22-33", tech: "Wondwossen" },
  "16": { supervisor: "Wzo. Chaltu", phone: "0914-44-55-66", tech: "Bekele" },
  "34": { supervisor: "Ato Bekele", phone: "0916-77-88-99", tech: "Kebede" },
};

const ADMIN_ROUTED_RESPONSE =
  "🚨 **[ADMIN ROUTED]**: This issue has been instantly flagged on the Central Admin Control Panel for Block technicians.";

type EmergencyCategory = "WATER" | "ELECTRICAL" | "STRUCTURAL";

function isInfrastructureFault(message: string): boolean {
  const lower = message.toLowerCase();
  const keywords = [
    "water",
    "electricity",
    "electric",
    "power cut",
    "power outage",
    "blackout",
    "flood",
    "burst",
    "plumbing",
    "fault",
    "broken",
  ];
  return keywords.some((k) => lower.includes(k));
}

function inferEmergencyCategory(message: string): EmergencyCategory {
  const lower = message.toLowerCase();
  if (/water|flood|burst|plumb|leak/.test(lower)) return "WATER";
  if (/electric|power cut|power outage|blackout|black out/.test(lower)) return "ELECTRICAL";
  return "STRUCTURAL";
}

function mapIssueReportCategory(category: EmergencyCategory): string {
  if (category === "WATER") return "WATER";
  if (category === "ELECTRICAL") return "ELECTRICITY";
  return "FACILITY";
}

function isAnalyticsRequest(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("analytics") ||
    lower.includes("system analysis") ||
    lower.includes("analyze") ||
    lower.includes("operational health") ||
    lower.includes("service health") ||
    lower.includes("system health") ||
    lower.includes("complaint history") ||
    lower.includes("dormcare ai") ||
    lower.includes("complaint")
  );
}

async function routeInfrastructureToAdmin(params: {
  studentId: string;
  dormBlockId: string;
  roomNumber: string;
  blockLabel: string;
  message: string;
  category: EmergencyCategory;
}) {
  const { studentId, dormBlockId, roomNumber, blockLabel, message, category } = params;
  const adminPayload = `[TARGET:ADMIN_DASHBOARD] Block ${blockLabel} · Room ${roomNumber} — ${message.trim()}`;

  const existing = await prisma.emergencyTicket.findFirst({
    where: {
      studentId,
      dormBlockId,
      category,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    await prisma.emergencyTicket.update({
      where: { id: existing.id },
      data: {
        description: adminPayload,
        updatedAt: new Date(),
      },
    });
  } else {
    await prisma.emergencyTicket.create({
      data: {
        studentId,
        dormBlockId,
        category,
        description: adminPayload,
        status: "OPEN",
      },
    });
  }

  await prisma.issueReport.create({
    data: {
      studentId,
      roomNumber,
      category: mapIssueReportCategory(category),
      description: adminPayload,
      status: "OPEN",
    },
  });
}

async function buildAnalyticsSummary(params: {
  studentName: string;
  blockLabel: string;
  blockDbId: string;
  studentDbId: string;
  assignedAssets: { condition: string }[];
  issueReports: { category: string; status: string; createdAt: Date }[];
  maintenanceTickets: { status: string; createdAt: Date }[];
  emergencyTickets: { category: string; status: string; createdAt: Date }[];
  clearanceRequests: { status: string }[];
  attendanceCount: number;
  isKeyCustodian: boolean;
}) {
  const {
    studentName,
    blockLabel,
    blockDbId,
    assignedAssets,
    issueReports,
    maintenanceTickets,
    emergencyTickets,
    clearanceRequests,
    attendanceCount,
    isKeyCustodian,
  } = params;

  const openMaintenance = maintenanceTickets.filter((t) => t.status === "PENDING" || t.status === "IN_PROGRESS").length;
  const openEmergency = emergencyTickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;
  const openIssues = issueReports.filter((t) => t.status === "OPEN").length;
  const damagedAssets = assignedAssets.filter((a) => a.condition !== "GOOD").length;
  const rejectedClearances = clearanceRequests.filter((c) => c.status === "REJECTED").length;

  let complianceScore = 100;
  complianceScore -= openEmergency * 15;
  complianceScore -= openMaintenance * 10;
  complianceScore -= openIssues * 8;
  complianceScore -= damagedAssets * 5;
  complianceScore -= rejectedClearances * 10;
  complianceScore = Math.max(0, Math.min(100, complianceScore));

  const recognitionStatus = isKeyCustodian
    ? "Key Custodian (Trusted)"
    : attendanceCount >= 15
      ? "High-Attendance Resident"
      : attendanceCount >= 5
        ? "Active Resident"
        : "Standard Resident";

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [waterThisWeek, waterLastWeek] = await Promise.all([
    prisma.emergencyTicket.count({
      where: {
        dormBlockId: blockDbId,
        category: "WATER",
        createdAt: { gte: weekAgo },
      },
    }),
    prisma.emergencyTicket.count({
      where: {
        dormBlockId: blockDbId,
        category: "WATER",
        createdAt: { gte: twoWeeksAgo, lt: weekAgo },
      },
    }),
  ]);

  let waterSpikePct = 0;
  if (waterLastWeek === 0) {
    waterSpikePct = waterThisWeek > 0 ? 100 : 0;
  } else {
    waterSpikePct = Math.round(((waterThisWeek - waterLastWeek) / waterLastWeek) * 100);
  }

  const blockHealth = Math.max(
    0,
    Math.min(100, Math.round(complianceScore * 0.6 + (100 - Math.min(openEmergency * 12, 60)) * 0.4)),
  );

  const maintenanceHint =
    waterSpikePct > 0
      ? `Water utility complaints have spiked by **${waterSpikePct}%** this week. Recommending preventive pump maintenance to improve service quality.`
      : "Utility complaint volume is stable week-over-week. Continue standard preventive inspections.";

  return (
    `📊 **[DORMCARE AI ANALYTICS]**: Operational health for Block ${blockLabel} is at **${blockHealth}%**.\n\n` +
    `**Resident profile — ${studentName}**\n` +
    `- Compliance rating: **${complianceScore}%**\n` +
    `- Recognition status: **${recognitionStatus}**\n` +
    `- Past faults on record: **${issueReports.length + maintenanceTickets.length + emergencyTickets.length}** total · **${openEmergency + openMaintenance + openIssues}** currently open\n\n` +
    `${maintenanceHint}`
  );
}

export async function POST(req: NextRequest) {
  try {
    const { studentId, message } = await req.json();

    if (!studentId) {
      return NextResponse.json({
        response: "🤖 Welcome to DormCare! Please provide your Student ID to verify your housing status.",
      });
    }

    const student = await prisma.user.findUnique({
      where: { studentId: studentId.trim().toUpperCase() },
      include: {
        room: {
          include: {
            occupants: true,
            dormBlock: true,
          },
        },
        assignedAssets: true,
        issueReports: { orderBy: { createdAt: "desc" }, take: 25 },
        maintenanceTickets: { orderBy: { createdAt: "desc" }, take: 25 },
        submittedTickets: { orderBy: { createdAt: "desc" }, take: 25 },
        clearanceRequests: { orderBy: { createdAt: "desc" }, take: 10 },
        keyCustodianFor: true,
        _count: { select: { attendanceLogs: true } },
      },
    });

    if (!student || !student.room) {
      return NextResponse.json({
        response: `❌ Access Denied. Student ID "${studentId}" is not currently registered to any dormitory in the system database. Please visit the admin desk.`,
      });
    }

    const roomNumber = student.room.roomNumber;
    const blockId = roomNumber.split("-")[0] || "1";
    const dormBlockId = student.room.dormBlockId;
    const assignedAssets = student.assignedAssets || [];
    const lowerMsg = (message ?? "").toLowerCase();
    const contacts = PROCTOR_DIRECTORY[blockId] || {
      supervisor: "Central Admin",
      phone: "0900-00-00-00",
      tech: "Duty Technician",
    };

    // Verification handshake (empty first message)
    if (!lowerMsg.trim()) {
      return NextResponse.json({
        response: `👋 Hello ${student.name}! Access Verified for Block ${blockId}, Room ${roomNumber}. I can pull your roommate rosters, check your gate clearance, log infrastructure faults to the Admin Control Panel, or run DormCare AI analytics. What can I do for you today?`,
      });
    }

    // ── AI analytics & complaint intelligence ──────────────────────────────
    if (isAnalyticsRequest(lowerMsg)) {
      const summary = await buildAnalyticsSummary({
        studentName: student.name,
        blockLabel: blockId,
        blockDbId: dormBlockId,
        studentDbId: student.id,
        assignedAssets,
        issueReports: student.issueReports,
        maintenanceTickets: student.maintenanceTickets,
        emergencyTickets: student.submittedTickets,
        clearanceRequests: student.clearanceRequests,
        attendanceCount: student._count.attendanceLogs,
        isKeyCustodian: !!student.keyCustodianFor,
      });

      return NextResponse.json({ response: summary });
    }

    // ── Infrastructure fault → Admin dashboard routing ─────────────────────
    if (isInfrastructureFault(lowerMsg)) {
      const category = inferEmergencyCategory(lowerMsg);

      await routeInfrastructureToAdmin({
        studentId: student.id,
        dormBlockId,
        roomNumber,
        blockLabel: blockId,
        message: message ?? lowerMsg,
        category,
      });

      return NextResponse.json({
        response: `${ADMIN_ROUTED_RESPONSE}\n\n**Incident logged:** ${category} · Block ${blockId} · Room ${roomNumber}\n**Routing target:** \`ADMIN_DASHBOARD\`\n**On-call technician:** ${contacts.tech} (${contacts.phone})`,
      });
    }

    // ── Standard conversational routing ───────────────────────────────────
    if (lowerMsg.includes("roommate") || lowerMsg.includes("አብረውኝ") || lowerMsg.includes("who lives")) {
      const roommatesList =
        student.room.occupants
          .filter((o) => o.studentId !== student.studentId)
          .map((o) => o.name)
          .join(", ") || "None (You are currently alone in this room)";

      return NextResponse.json({
        response: `🤖 Hi ${student.name}! You are in Room ${roomNumber}. Your current registered roommates are: **${roommatesList}**.`,
      });
    }

    if (lowerMsg.includes("locker") || lowerMsg.includes("ሳጥን") || (lowerMsg.includes("lock") && !lowerMsg.includes("block"))) {
      const lockerAsset = assignedAssets.find(
        (a) => a.itemName.toLowerCase().includes("locker") || a.assetTag.includes("LCK"),
      );

      if (lockerAsset) {
        await prisma.inventoryItem.update({
          where: { id: lockerAsset.id },
          data: { condition: "DAMAGED" },
        });

        return NextResponse.json({
          response: `የሰላም ${student.name}! I have processed your report regarding your **${lockerAsset.itemName} (Tag: ${lockerAsset.assetTag})**. Because a locker fault compromises security, it is triaged as an **EMERGENCY**.\n\n📞 **Block ${blockId} Dispatch:** Please contact your supervisor **${contacts.supervisor}** (${contacts.phone}) or technician **${contacts.tech}** directly if they do not arrive at Room ${roomNumber} shortly.`,
        });
      }
    }

    if (lowerMsg.includes("chair") || lowerMsg.includes("ወንበር")) {
      const chairAsset = assignedAssets.find(
        (a) => a.itemName.toLowerCase().includes("chair") || a.assetTag.includes("CHI"),
      );

      if (chairAsset) {
        await prisma.inventoryItem.update({
          where: { id: chairAsset.id },
          data: { condition: "DAMAGED" },
        });

        return NextResponse.json({
          response: `🤖 Request logged! Your **${chairAsset.itemName} (Tag: ${chairAsset.assetTag})** status is now set to Maintenance Pending. Routine repair assigned to **${contacts.tech}** for Block ${blockId}.`,
        });
      }
    }

    if (lowerMsg.includes("gate pass") || lowerMsg.includes("leave") || lowerMsg.includes("መውጫ")) {
      const damagedAssets = assignedAssets.filter((a) => a.condition !== "GOOD");
      if (damagedAssets.length > 0) {
        return NextResponse.json({
          response: `⚠️ **Gate Clearance PAUSED.** You currently have ${damagedAssets.length} asset(s) flagged for maintenance or replacement (${damagedAssets.map((a) => a.itemName).join(", ")}). Your gate pass cannot be approved until these tickets are resolved.`,
        });
      }

      return NextResponse.json({
        response: `✅ **Gate Clearance Active.** All of your assigned items are in good condition. You are cleared for checkout.`,
      });
    }

    if (lowerMsg.includes("view assets") || (lowerMsg.includes("assets") && !lowerMsg.includes("analytics"))) {
      if (assignedAssets.length === 0) {
        return NextResponse.json({
          response: `🤖 You currently have no physical assets registered under your custody in Room ${roomNumber}.`,
        });
      }

      const assetList = assignedAssets
        .map((a) => `- **${a.itemName}** (Tag: \`${a.assetTag}\`) - Condition: *${a.condition}*`)
        .join("\n");

      return NextResponse.json({
        response: `📋 **Your Registered Custody Assets:**\n\n${assetList}\n\nYou are financially responsible for these items. Ensure they remain in GOOD condition for gate clearance.`,
      });
    }

    if (lowerMsg.includes("report fault")) {
      return NextResponse.json({
        response: `🔧 **Maintenance Reporting Initiated:**\nPlease tell me exactly which item is damaged, or describe a **water / electrical** infrastructure issue to auto-route to the Admin Control Panel. For example: *"Water leak in hallway"* or *"Power cut in Block ${blockId}"*.`,
      });
    }

    return NextResponse.json({
      response: `👋 Hello ${student.name}! Access Verified for Block ${blockId}, Room ${roomNumber}. I can pull your roommate rosters, check your gate clearance, route infrastructure faults to Admin, or run **DormCare AI analytics**. What can I do for you today?`,
    });
  } catch (error: unknown) {
    console.error("AI Assistant Error:", error);
    return NextResponse.json(
      { response: "🤖 System error processing your operational request." },
      { status: 500 },
    );
  }
}
