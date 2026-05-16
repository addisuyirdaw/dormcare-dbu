/** Client-safe university ID helpers (no database imports). */

/** Default password for pre-seeded student/staff accounts (sign-up uses a custom password). */
export const DEFAULT_PORTAL_PASSWORD = 'password123#';

export function normalizeStudentId(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

export function universityEmailFromIdentifier(identifier: string): string {
  const raw = identifier.trim().toLowerCase();
  if (raw.includes('@')) return raw;
  return `${raw.replace(/\s+/g, '')}@dbu.edu.et`;
}

export function inferRoleFromIdentifier(identifier: string): 'STUDENT' | 'STAFF' | 'ADMIN' | null {
  const lower = identifier.trim().toLowerCase();

  if (lower.includes('proctor') || lower.includes('admin')) {
    return 'ADMIN';
  }
  if (lower.includes('teregna') || lower.includes('staff')) {
    return 'STAFF';
  }
  if (lower.includes('dbu') || lower.startsWith('student')) {
    return 'STUDENT';
  }
  return null;
}

export function dashboardPathForRole(role: string): string {
  if (role === 'STAFF') return '/staff';
  if (role === 'ADMIN') return '/admin';
  return '/student';
}
