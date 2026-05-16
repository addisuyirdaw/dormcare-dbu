import { hashSync } from 'bcryptjs';
import { prisma } from '@/lib/db';
import {
  inferRoleFromIdentifier,
  normalizeStudentId,
  universityEmailFromIdentifier,
} from '@/lib/university-id';

export {
  inferRoleFromIdentifier,
  normalizeStudentId,
  universityEmailFromIdentifier,
  dashboardPathForRole,
} from '@/lib/university-id';

const STUDENT_INCLUDE = {
  dormBlock: true,
  room: { include: { assets: true } },
  assignedAssets: true,
} as const;

/**
 * Resolve a registered university account (login).
 */
export async function resolveUniversityUser(identifier: string) {
  const raw = identifier.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const email = universityEmailFromIdentifier(raw);
  const studentIdNorm = normalizeStudentId(raw);

  const byAccount = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { studentId: studentIdNorm }],
    },
    include: STUDENT_INCLUDE,
  });
  if (byAccount) return byAccount;

  // Legacy demo aliases (pre-seeded accounts)
  const studentNum = lower.match(/^student(\d+)$/)?.[1];
  if (studentNum) {
    return prisma.user.findUnique({
      where: { email: `student${studentNum}@dbu.edu.et` },
      include: STUDENT_INCLUDE,
    });
  }

  const staffNum = lower.match(/^staff(\d+)$/)?.[1];
  if (staffNum) {
    return prisma.user.findUnique({
      where: { email: `staff${staffNum}@dbu.edu.et` },
      include: STUDENT_INCLUDE,
    });
  }

  if (lower === 'admin' || lower === 'proctor') {
    return prisma.user.findFirst({
      where: { role: 'ADMIN' },
      include: STUDENT_INCLUDE,
    });
  }

  return null;
}

export type RegisterResult =
  | { ok: true; role: string; email: string; name: string }
  | { ok: false; error: string };

/**
 * Register a new portal account; role is assigned from university ID keywords.
 */
export async function registerUniversityUser(
  identifier: string,
  password: string,
): Promise<RegisterResult> {
  const raw = identifier.trim();
  if (!raw || password.length < 6) {
    return { ok: false, error: 'University ID and password (min 6 characters) are required.' };
  }

  const role = inferRoleFromIdentifier(raw);
  if (!role) {
    return {
      ok: false,
      error: "ID must include 'dbu' (student), 'teregna'/'staff', or 'proctor'/'admin'.",
    };
  }

  const email = universityEmailFromIdentifier(raw);
  const studentIdNorm = role === 'STUDENT' ? normalizeStudentId(raw) : null;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        ...(studentIdNorm ? [{ studentId: studentIdNorm }] : []),
      ],
    },
  });
  if (existing) {
    return { ok: false, error: 'This university ID is already registered. Please sign in.' };
  }

  const hashedPassword = hashSync(password, 10);

  if (role === 'STUDENT') {
    const registryRoom = await prisma.dormRoom.findFirst({
      where: { occupants: { none: {} } },
      include: { dormBlock: true },
      orderBy: { roomNumber: 'asc' },
    });

    const fallbackRoom =
      registryRoom ??
      (await prisma.dormRoom.findFirst({
        include: { dormBlock: true },
        orderBy: { roomNumber: 'asc' },
      }));

    if (!fallbackRoom) {
      return { ok: false, error: 'No dormitory rooms available in the registry.' };
    }

    const displayName =
      raw.replace(/[@\s].*$/, '').replace(/^dbu/i, 'Student ').trim() || `Resident ${studentIdNorm}`;

    const user = await prisma.user.create({
      data: {
        name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        email,
        password: hashedPassword,
        role: 'STUDENT',
        studentId: studentIdNorm,
        dormBlockId: fallbackRoom.dormBlockId,
        roomId: fallbackRoom.id,
      },
    });

    return { ok: true, role: user.role, email: user.email, name: user.name };
  }

  if (role === 'STAFF') {
    const primaryBlock = await prisma.dormBlock.findFirst({ orderBy: { number: 'asc' } });
    if (!primaryBlock) {
      return { ok: false, error: 'Campus blocks not initialized.' };
    }

    const label = raw.replace(/[@\s].*$/, '');
    const user = await prisma.user.create({
      data: {
        name: label.charAt(0).toUpperCase() + label.slice(1),
        email,
        password: hashedPassword,
        role: 'STAFF',
        dormBlockId: primaryBlock.id,
        managedBlocks: { connect: [{ id: primaryBlock.id }] },
      },
    });

    return { ok: true, role: user.role, email: user.email, name: user.name };
  }

  const label = raw.replace(/[@\s].*$/, '');
  const user = await prisma.user.create({
    data: {
      name: label.charAt(0).toUpperCase() + label.slice(1) + ' (Proctor)',
      email,
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  return { ok: true, role: user.role, email: user.email, name: user.name };
}
