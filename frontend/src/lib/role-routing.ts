import type { UserRole } from '../types';

type RoleProfile = {
  role_id?: number | string;
  role?: unknown;
  official_position?: unknown;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
};

const OFFICIAL_ALLOWED_TABS: Partial<Record<UserRole, readonly string[]>> = {
  'SK Kagawad': ['dashboard', 'programs', 'attendance', 'feedback', 'profile'],
  'SK Secretary': ['dashboard', 'documents', 'records', 'reports', 'profile'],
  'SK Treasurer': ['dashboard', 'budget', 'inventory', 'reports', 'profile'],
};

export function resolveUserRole(profile: unknown): UserRole | null {
  if (!profile || typeof profile !== 'object') return null;

  const user = profile as RoleProfile;
  const roleId = Number(user.role_id);
  if (roleId === 1) return 'Super Admin';
  if (roleId === 2) return 'Barangay Admin';
  if (roleId === 4) return 'Youth Constituent';
  if (roleId === 5) return 'Viewer';
  if (roleId !== 3) return null;

  const positionCandidates = [
    user.user_metadata?.official_role,
    user.app_metadata?.official_role,
    user.official_position,
    user.user_metadata?.official_position,
    user.user_metadata?.role,
    user.role,
  ];

  for (const candidate of positionCandidates) {
    if (typeof candidate !== 'string') continue;
    const position = candidate.trim().toLowerCase();
    if (position.includes('secretary')) return 'SK Secretary';
    if (position.includes('treasurer')) return 'SK Treasurer';
    if (position.includes('kagawad')) return 'SK Kagawad';
  }

  return null;
}

// Panel decision: always land on Dashboard after login or session restore.
// Role-specific tabs (Programs/Documents/Budget) remain accessible via the
// sidebar and are enforced by canAccessOfficialTab below.
export function getHomeTabForRole(_role: UserRole): string {
  return 'dashboard';
}

export function canAccessOfficialTab(role: UserRole, tab: string): boolean {
  const allowedTabs = OFFICIAL_ALLOWED_TABS[role];
  return !allowedTabs || allowedTabs.includes(tab);
}