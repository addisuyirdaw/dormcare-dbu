/**
 * One-time migration: normalize all student IDs to DBU + 7 digits format
 * Run: node migrate-student-ids.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalizeId(raw) {
  if (!raw) return null;

  // Strip everything except digits
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 0) {
    // No digits at all (e.g. "CBDNC") — cannot normalize
    return null;
  }

  // Pad or trim to exactly 7 digits
  const sevenDigits = digits.padStart(7, '0').slice(-7);
  return `DBU${sevenDigits}`;
}

async function main() {
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true, studentId: true, name: true, email: true }
  });

  console.log(`Found ${students.length} students to process.\n`);

  for (const student of students) {
    const original = student.studentId;
    const normalized = normalizeId(original);

    if (!normalized) {
      console.log(`⚠️  SKIPPED "${original}" (${student.name}) — could not extract digits`);
      continue;
    }

    if (original === normalized) {
      console.log(`✅  OK       "${original}" (${student.name}) — already correct`);
      continue;
    }

    // Check if normalized ID already taken by another student
    const conflict = await prisma.user.findFirst({
      where: { studentId: normalized, id: { not: student.id } }
    });

    if (conflict) {
      console.log(`⚠️  CONFLICT "${original}" → "${normalized}" already used by ${conflict.name} — SKIPPED`);
      continue;
    }

    try {
      await prisma.user.update({
        where: { id: student.id },
        data: { studentId: normalized }
      });
      console.log(`🔄  UPDATED  "${original}" → "${normalized}" (${student.name})`);
    } catch (err) {
      console.log(`❌  ERROR    "${original}" → "${normalized}": ${err.message}`);
    }
  }

  console.log('\n✅ Migration complete! All student IDs are now in DBU + 7 digit format.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
